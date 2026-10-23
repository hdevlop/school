import { describe, expect, it } from 'bun:test';
import { schoolI18n } from '@sms/contracts/locales';
import { EXAM_STATUS_VALUES, EXAM_TYPE_VALUES } from '@sms/contracts';

import { createExamSchema } from '@/features/Exams/config/examSchemas';

// The English catalog, so a message a test reads proves its key exists.
const english = (key: string, params?: Record<string, unknown>) => schoolI18n.translate('en', key as never, params as never);
const examSchema = createExamSchema(english);

const valid = {
  sectionIds: ['sec1'],
  subjectId: 'sub1',
  teacherId: 'tch1',
  title: 'End of term',
  date: '2026-06-01',
  duration: 120,
  totalMarks: 100,
  passingMarks: 50,
};

describe('examSchema', () => {
  it('asks for the missing subject and teacher rather than internal IDs', () => {
    for (const missing of ['', undefined, null, '   ']) {
      const result = examSchema.safeParse({ ...valid, subjectId: missing, teacherId: missing });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toContainEqual(expect.objectContaining({
          path: ['subjectId'], message: 'Select a subject',
        }));
        expect(result.error.issues).toContainEqual(expect.objectContaining({
          path: ['teacherId'], message: 'A teacher is required',
        }));
      }
    }
  });

  it('defaults a new exam to a scheduled midterm', () => {
    const parsed = examSchema.parse(valid);

    expect(parsed.type).toBe('midterm');
    expect(parsed.status).toBe('scheduled');
  });

  it('accepts every type and status the API accepts', () => {
    for (const type of EXAM_TYPE_VALUES) {
      expect(examSchema.safeParse({ ...valid, type }).success).toBe(true);
    }
    for (const status of EXAM_STATUS_VALUES) {
      expect(examSchema.safeParse({ ...valid, status }).success).toBe(true);
    }
  });

  it('refuses an assessment type, which is a different family', () => {
    expect(examSchema.safeParse({ ...valid, type: 'quiz' }).success).toBe(false);
  });

  it('pads a single-digit hour and drops a cleared time', () => {
    const parsed = examSchema.parse({ ...valid, startTime: '9:05', endTime: '' });

    expect(parsed.startTime).toBe('09:05');
    expect(parsed.endTime).toBeUndefined();
  });

  it('holds an exam to at least half an hour', () => {
    expect(examSchema.safeParse({ ...valid, duration: 29 }).success).toBe(false);
    expect(examSchema.safeParse({ ...valid, duration: 30 }).success).toBe(true);
  });

  it('requires at least one section', () => {
    expect(examSchema.safeParse({ ...valid, sectionIds: [] }).success).toBe(false);
  });
});
