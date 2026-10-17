import { describe, expect, it } from 'bun:test';
import { schoolI18n } from '@sms/contracts/locales';

import { createGradeSchema } from '@/features/Grades/config/gradeSchemas';

// The English catalog, so a message a test reads proves its key exists.
const english = (key: string, params?: Record<string, unknown>) => schoolI18n.translate('en', key as never, params as never);
const gradeSchema = createGradeSchema(english);

const base = {
  teacherId: 'tch1',
  subjectId: 'sub1',
  sectionId: 'sec1',
  studentId: 'st1',
  marksObtained: 17,
};

describe('gradeSchema', () => {
  it('accepts a grade against an assessment', () => {
    expect(gradeSchema.safeParse({ ...base, assessmentId: 'a1' }).success).toBe(true);
  });

  it('accepts a grade against an exam', () => {
    expect(gradeSchema.safeParse({ ...base, examId: 'e1' }).success).toBe(true);
  });

  it('refuses a grade that belongs to both', () => {
    const result = gradeSchema.safeParse({ ...base, assessmentId: 'a1', examId: 'e1' });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Select either an assessment or an exam');
    expect(result.error?.issues[0]?.path).toEqual(['assessmentId']);
  });

  it('refuses a grade that belongs to neither', () => {
    expect(gradeSchema.safeParse(base).success).toBe(false);
  });

  it('defaults to graded and coerces the mark', () => {
    const parsed = gradeSchema.parse({ ...base, assessmentId: 'a1', marksObtained: '17.5' });

    expect(parsed.status).toBe('graded');
    expect(parsed.marksObtained).toBe(17.5);
  });
});
