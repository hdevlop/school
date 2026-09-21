import { describe, expect, it } from 'bun:test';
import { EMPLOYMENT_TYPE_VALUES, TEACHER_STATUS_VALUES } from '@sms/contracts';

import {
  assignmentsSchema,
  teacherFullSchema,
  teacherPersonalSchema,
  teacherProfessionalSchema,
} from './teacherSchemas';

const personal = {
  name: 'Youssef Idrissi',
  cin: 'AB123456',
  email: 'youssef@example.com',
  phone: '212600000000',
  emergencyPhone: '212611111111',
};

const professional = { hireDate: '2021-09-01' };

const assignments = {
  assignments: [{ classId: 'cls1', sectionIds: ['sec1'], subjectIds: ['sub1'] }],
};

describe('teacherPersonalSchema', () => {
  it('defaults a new teacher to active', () => {
    expect(teacherPersonalSchema.parse(personal).status).toBe('active');
  });

  it('accepts every status the API accepts', () => {
    for (const status of TEACHER_STATUS_VALUES) {
      expect(teacherPersonalSchema.safeParse({ ...personal, status }).success).toBe(true);
    }
  });

  it('requires an emergency phone even though the contact name is optional', () => {
    expect(teacherPersonalSchema.safeParse({ ...personal, emergencyContact: undefined }).success).toBe(true);
    expect(teacherPersonalSchema.safeParse({ ...personal, emergencyPhone: undefined }).success).toBe(false);
  });
});

describe('teacherProfessionalSchema', () => {
  it('needs only a hire date', () => {
    expect(teacherProfessionalSchema.safeParse(professional).success).toBe(true);
  });

  it('accepts every employment type the API accepts', () => {
    for (const employmentType of EMPLOYMENT_TYPE_VALUES) {
      expect(teacherProfessionalSchema.safeParse({ ...professional, employmentType }).success).toBe(true);
    }
  });

  it('coerces the numbers the inputs submit as text', () => {
    const parsed = teacherProfessionalSchema.parse({
      ...professional,
      yearsOfExperience: '7',
      salary: '9000',
      workloadHours: '18',
      bankAccount: 1234567890,
    });

    expect(parsed.yearsOfExperience).toBe(7);
    expect(parsed.salary).toBe(9000);
    expect(parsed.workloadHours).toBe(18);
    expect(parsed.bankAccount).toBe('1234567890');
  });

  it('caps a teaching load at sixty hours', () => {
    expect(teacherProfessionalSchema.safeParse({ ...professional, workloadHours: 61 }).success).toBe(false);
  });
});

describe('assignmentsSchema', () => {
  it('needs at least one class, section and subject per assignment', () => {
    expect(assignmentsSchema.safeParse(assignments).success).toBe(true);
    expect(assignmentsSchema.safeParse({ assignments: [] }).success).toBe(false);
    expect(
      assignmentsSchema.safeParse({ assignments: [{ classId: 'cls1', sectionIds: [], subjectIds: ['sub1'] }] })
        .success,
    ).toBe(false);
  });
});

describe('teacherFullSchema', () => {
  it('is the three steps together, and rejects a submit missing any of them', () => {
    expect(teacherFullSchema.safeParse({ ...personal, ...professional, ...assignments }).success).toBe(true);
    expect(teacherFullSchema.safeParse({ ...personal, ...assignments }).success).toBe(false);
    expect(teacherFullSchema.safeParse({ ...personal, ...professional }).success).toBe(false);
  });

  it('carries every field of every step, so a step cannot validate what the whole does not', () => {
    const shape = Object.keys(teacherFullSchema.shape);

    for (const key of [
      ...Object.keys(teacherPersonalSchema.shape),
      ...Object.keys(teacherProfessionalSchema.shape),
      ...Object.keys(assignmentsSchema.shape),
    ]) {
      expect(shape, `${key} is validated by a step but absent from the full schema`).toContain(key);
    }
  });
});
