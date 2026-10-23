import { describe, expect, it } from 'bun:test';

import { createParentSchemas } from '@/features/Parents/config/parentSchemas';

import { createFullStudentSchemas } from '@/features/Students/config/fullStudentSchemas';
import { createStudentSchemas } from '@/features/Students/config/studentSchemas';

const echo = (key: string) => key;
const parentsSchema = createParentSchemas(echo).parents;
const studentSchema = createStudentSchemas(echo).student;
const {
  fees: feesSchema,
  fullStudent: fullStudentSchema,
  studentWithoutFees: studentWithoutFeesSchema,
  studentWithTransport: studentWithTransportSchema,
} = createFullStudentSchemas(echo);

const somewhere = { address: '12 Rue des Écoles', latitude: 33.57, longitude: -7.59 };

const student = {
  classId: 'cls1',
  sectionId: 'sec1',
  studentCode: 'STU-001',
  name: 'Sara Bennani',
  email: 'sara@example.com',
  addressLocation: somewhere,
  enrollmentDate: '2025-09-01',
  gender: 'F',
};

const parent = {
  name: 'Fatima Alaoui',
  phone: '212600000000',
  cin: 'AB123456',
  relationshipType: 'mother',
};

const fee = { feeTypeId: 'ft1', schedule: 'monthly' };

it('SEC-001 allows enrollment without financial access to submit zero fees', () => {
  expect(studentWithoutFeesSchema.safeParse({ ...student, parents: [parent], fees: [] }).success).toBe(true);
  expect(studentWithoutFeesSchema.safeParse({ ...student, parents: [parent], fees: [fee] }).success).toBe(false);
});

const enrolment = { ...student, parents: [parent], fees: [fee] };

describe('fullStudentSchema composition', () => {
  it('carries every field of the student, parent and fee schemas it composes', () => {
    const shape = Object.keys(fullStudentSchema.shape);

    for (const key of [
      ...Object.keys(studentSchema.shape),
      ...Object.keys(parentsSchema.shape),
      ...Object.keys(feesSchema.shape),
    ]) {
      expect(shape, `${key} is missing from the composed enrolment schema`).toContain(key);
    }
  });

  it('accepts a complete enrolment as one nested payload', () => {
    const parsed = fullStudentSchema.parse(enrolment);

    expect(parsed.parents).toHaveLength(1);
    expect(parsed.fees).toHaveLength(1);
    expect(parsed.name).toBe('Sara Bennani');
  });

  it('rejects the enrolment when a nested guardian is invalid', () => {
    const result = fullStudentSchema.safeParse({
      ...enrolment,
      parents: [{ ...parent, cin: 'AB' }],
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['parents', 0, 'cin']);
  });

  it('rejects the enrolment when a nested fee is invalid', () => {
    const result = fullStudentSchema.safeParse({
      ...enrolment,
      fees: [{ feeTypeId: '', schedule: 'monthly' }],
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['fees', 0, 'feeTypeId']);
  });

  it('allows enrollment before fee types or guardians have been set up', () => {
    expect(fullStudentSchema.safeParse({ ...enrolment, fees: [] }).success).toBe(true);
    expect(feesSchema.safeParse({ fees: [] }).success).toBe(true);
    expect(fullStudentSchema.safeParse({ ...enrolment, parents: [] }).success).toBe(true);
  });

  it('defaults transport off and leaves the assignment absent', () => {
    const parsed = fullStudentSchema.parse(enrolment);

    expect(parsed.transportEnabled).toBe(false);
    expect(parsed.transportAssignment).toBeUndefined();
  });

  // The wizard starts the assignment blank and validates it with transport
  // off; a blank date there used to block the submit with no visible error.
  it('accepts the blank assignment the wizard starts with', () => {
    const blank = { address: '', latitude: null, longitude: null };
    const result = fullStudentSchema.safeParse({
      ...enrolment,
      transportEnabled: false,
      transportAssignment: {
        vehicleId: '', assignmentDate: '', pickup: blank, pickupPlaceId: null,
        dropoff: blank, dropoffPlaceId: null, notes: '',
      },
    });

    expect(result.error?.issues).toBeUndefined();
    expect(result.data?.transportAssignment?.assignmentDate).toBeNull();
  });

  it('accepts an enrolment that books a bus seat', () => {
    const parsed = fullStudentSchema.parse({
      ...enrolment,
      transportEnabled: true,
      transportAssignment: { vehicleId: 'v1', pickup: somewhere, dropoff: somewhere },
    });

    expect(parsed.transportAssignment?.vehicleId).toBe('v1');
    expect(parsed.transportAssignment?.pickup.address).toBe(somewhere.address);
  });
});

describe('studentWithTransportSchema', () => {
  it('is the student step plus the toggle that decides the fourth step', () => {
    const parsed = studentWithTransportSchema.parse(student);

    expect(parsed.transportEnabled).toBe(false);
    expect(Object.keys(studentWithTransportSchema.shape)).toContain('transportEnabled');
  });

  it('does not ask the first step for guardians or fees', () => {
    const shape = Object.keys(studentWithTransportSchema.shape);

    expect(shape).not.toContain('parents');
    expect(shape).not.toContain('fees');
  });
});
