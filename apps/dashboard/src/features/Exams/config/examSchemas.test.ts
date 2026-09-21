import { describe, expect, it } from 'bun:test';
import { EXAM_STATUS_VALUES, EXAM_TYPE_VALUES } from '@sms/contracts';

import { examSchema } from './examSchemas';

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
