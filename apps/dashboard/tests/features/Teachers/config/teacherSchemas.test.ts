import { describe, expect, it } from 'bun:test';
import { EMPLOYMENT_TYPE_VALUES, TEACHER_STATUS_VALUES } from '@sms/contracts';

import {
  assignmentsSchema,
  teacherAssignmentsStepSchema,
  teacherFullSchema,
  teacherPersonalSchema,
  teacherProfessionalSchema,
} from '@/features/Teachers/config/teacherSchemas';

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

  // The API makes both optional and the form marks neither as required. The
  // inputs start as '', which used to fail the name and phone rules.
  it('reads a blank emergency contact and phone as not given', () => {
    const parsed = teacherPersonalSchema.parse({ ...personal, emergencyContact: '', emergencyPhone: '' });

    expect(parsed.emergencyContact).toBeUndefined();
    expect(parsed.emergencyPhone).toBeUndefined();
    expect(teacherPersonalSchema.safeParse({ ...personal, emergencyPhone: undefined }).success).toBe(true);
  });

  it('still checks an emergency contact and phone that are filled in', () => {
    expect(teacherPersonalSchema.safeParse({ ...personal, emergencyContact: 'A' }).success).toBe(false);
    expect(teacherPersonalSchema.safeParse({ ...personal, emergencyPhone: 'abc' }).success).toBe(false);
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

  it('reads a blank salary as not given', () => {
    const parsed = teacherProfessionalSchema.parse({ ...professional, salary: '' });

    expect(parsed.salary).toBeUndefined();
  });

  it('caps a teaching load at sixty hours', () => {
    expect(teacherProfessionalSchema.safeParse({ ...professional, workloadHours: 61 }).success).toBe(false);
  });
});

describe('assignmentsSchema', () => {
  it('needs at least one class, section and subject per assignment', () => {
    expect(assignmentsSchema.safeParse(assignments).success).toBe(true);
    expect(
      assignmentsSchema.safeParse({ assignments: [{ classId: 'cls1', sectionIds: [], subjectIds: ['sub1'] }] })
        .success,
    ).toBe(false);
  });

  it('needs one line in the bulk dialog, and says so about assignments', () => {
    const result = assignmentsSchema.safeParse({ assignments: [] });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('At least one assignment is required');
  });
});

describe('teacherAssignmentsStepSchema', () => {
  // Removing the last assignment is how an edit clears the year's assignments,
  // which the API asks for before it deletes a teacher.
  it('lets a teacher have no assignments', () => {
    expect(teacherAssignmentsStepSchema.safeParse({ assignments: [] }).success).toBe(true);
  });
});

describe('teacherFullSchema', () => {
  it('is the three steps together, and rejects a submit missing a required step', () => {
    expect(teacherFullSchema.safeParse({ ...personal, ...professional, ...assignments }).success).toBe(true);
    expect(teacherFullSchema.safeParse({ ...personal, ...professional, assignments: [] }).success).toBe(true);
    expect(teacherFullSchema.safeParse({ ...personal, ...assignments }).success).toBe(false);
  });

  it('carries every field of every step, so a step cannot validate what the whole does not', () => {
    const shape = Object.keys(teacherFullSchema.shape);

    for (const key of [
      ...Object.keys(teacherPersonalSchema.shape),
      ...Object.keys(teacherProfessionalSchema.shape),
      ...Object.keys(teacherAssignmentsStepSchema.shape),
    ]) {
      expect(shape, `${key} is validated by a step but absent from the full schema`).toContain(key);
    }
  });
});
