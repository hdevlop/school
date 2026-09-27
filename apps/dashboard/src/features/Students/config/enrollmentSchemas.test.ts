import { describe, expect, it } from 'bun:test';
import { STUDENT_YEAR_ENROLLMENT_END_STATUS_VALUES } from '@sms/contracts';
import { ar, en, es, fr } from '@sms/contracts/locales';
import { buildEndEnrollmentSchema, buildEnrollSchema, buildTransferSchema } from './enrollmentSchemas';
import { buildEnrollmentEndStatusOptions, ENROLLMENT_END_STATUS_TRANSLATION_PREFIX } from './enrollmentOptions';

const year = { reportingStartsOn: '2025-09-01', reportingEndsOn: '2026-08-31' };

describe('enrol form', () => {
  const schema = buildEnrollSchema(year);

  it('accepts a class, a section, and a real day of the year, bounds included', () => {
    for (const enrolledOn of ['2025-09-01', '2026-02-10', '2026-08-31']) {
      expect(schema.safeParse({ classId: 'c1', sectionId: 's1', enrolledOn }).success).toBe(true);
    }
  });

  it('refuses a day outside the year, an impossible day, or a missing placement', () => {
    expect(schema.safeParse({ classId: 'c1', sectionId: 's1', enrolledOn: '2025-08-31' }).success).toBe(false);
    expect(schema.safeParse({ classId: 'c1', sectionId: 's1', enrolledOn: '2026-09-01' }).success).toBe(false);
    expect(schema.safeParse({ classId: 'c1', sectionId: 's1', enrolledOn: '2026-02-30' }).success).toBe(false);
    expect(schema.safeParse({ classId: '', sectionId: 's1', enrolledOn: '2026-02-10' }).success).toBe(false);
    expect(schema.safeParse({ classId: 'c1', sectionId: '', enrolledOn: '2026-02-10' }).success).toBe(false);
  });
});

describe('transfer form', () => {
  const schema = buildTransferSchema(year, '2025-09-01');
  const move = { classId: 'c2', sectionId: 's2', reason: 'Section change' };

  it('starts after the current placement and inside the year', () => {
    expect(schema.safeParse({ ...move, validFrom: '2025-09-02' }).success).toBe(true);
    expect(schema.safeParse({ ...move, validFrom: '2026-08-31' }).success).toBe(true);
    expect(schema.safeParse({ ...move, validFrom: '2025-09-01' }).success).toBe(false);
    expect(schema.safeParse({ ...move, validFrom: '2026-09-01' }).success).toBe(false);
  });

  it('needs a reason', () => {
    expect(schema.safeParse({ ...move, validFrom: '2026-01-05', reason: '   ' }).success).toBe(false);
  });
});

describe('end enrollment form', () => {
  const schema = buildEndEnrollmentSchema('2025-09-01');

  it('ends after the current placement with a status the command accepts', () => {
    for (const status of STUDENT_YEAR_ENROLLMENT_END_STATUS_VALUES) {
      expect(schema.safeParse({ leftOn: '2026-03-01', status }).success).toBe(true);
    }
    expect(schema.safeParse({ leftOn: '2025-09-01', status: 'withdrawn' }).success).toBe(false);
    expect(schema.safeParse({ leftOn: '2026-03-01', status: 'active' }).success).toBe(false);
  });

  it('labels every end status in all four languages', () => {
    const options = buildEnrollmentEndStatusOptions((key) => key);
    expect(options.map((option) => option.value)).toEqual([...STUDENT_YEAR_ENROLLMENT_END_STATUS_VALUES]);
    for (const catalog of [en, fr, ar, es]) {
      const labels = (catalog as any).students.enrollment.endStatus;
      for (const value of STUDENT_YEAR_ENROLLMENT_END_STATUS_VALUES) {
        expect(typeof labels[value], `${ENROLLMENT_END_STATUS_TRANSLATION_PREFIX}.${value}`).toBe('string');
      }
    }
  });
});
