import { describe, expect, it } from 'bun:test';
import { ASSESSMENT_STATUS_VALUES, ASSESSMENT_TYPE_VALUES } from '@sms/contracts';

import { assessmentSchema } from './assessmentSchemas';

/**
 * What the assessment form will and will not submit.
 *
 * The numeric fields are the reason this file exists: every `FormInput`
 * submits text, so `'60'` has to survive validation and arrive at the API as
 * `60`. A schema change that quietly breaks that coercion would not fail a
 * type check — it would fail in production as a rejected request.
 */

const validInput = {
  classId: 'cls1',
  sectionId: 'sec1',
  sectionIds: ['sec1'],
  subjectId: 'sub1',
  teacherId: 'tch1',
  title: 'Chapter 3 quiz',
  date: '2026-04-12',
  duration: 60,
  totalMarks: 100,
  passingMarks: 50,
};

describe('assessmentSchema', () => {
  it('accepts every assessment type the API accepts', () => {
    for (const type of ASSESSMENT_TYPE_VALUES) {
      expect(assessmentSchema.safeParse({ ...validInput, type }).success).toBe(true);
    }
  });

  it('accepts every assessment status the API accepts', () => {
    for (const status of ASSESSMENT_STATUS_VALUES) {
      expect(assessmentSchema.safeParse({ ...validInput, status }).success).toBe(true);
    }
  });

  it('refuses a type the API would reject', () => {
    expect(assessmentSchema.safeParse({ ...validInput, type: 'midterm' }).success).toBe(false);
  });

  it('defaults an unset type, status and marks', () => {
    const parsed = assessmentSchema.parse(validInput);

    expect(parsed.type).toBe('quiz');
    expect(parsed.status).toBe('scheduled');
    // `duration` has no default; the other two do, and the form relies on them
    // when a section is created from a shortcut rather than the full dialog.
    expect(assessmentSchema.parse({ ...validInput, totalMarks: undefined }).totalMarks).toBe(20);
    expect(assessmentSchema.parse({ ...validInput, passingMarks: undefined }).passingMarks).toBe(10);
  });

  it('turns the numbers the form submits as text into numbers', () => {
    const parsed = assessmentSchema.parse({
      ...validInput,
      duration: '90',
      totalMarks: '40',
      passingMarks: '20',
    });

    expect(parsed.duration).toBe(90);
    expect(parsed.totalMarks).toBe(40);
    expect(parsed.passingMarks).toBe(20);
  });

  it('requires at least one section', () => {
    const result = assessmentSchema.safeParse({ ...validInput, sectionIds: [] });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Select at least one section');
  });

  it('holds duration inside a single school day', () => {
    expect(assessmentSchema.safeParse({ ...validInput, duration: 0 }).success).toBe(false);
    expect(assessmentSchema.safeParse({ ...validInput, duration: 481 }).success).toBe(false);
    expect(assessmentSchema.safeParse({ ...validInput, duration: 480 }).success).toBe(true);
  });

  it('treats a blank optional id as absent rather than invalid', () => {
    const parsed = assessmentSchema.parse({ ...validInput, sectionId: '', assessmentId: '' });

    expect(parsed.sectionId).toBeUndefined();
    expect(parsed.assessmentId).toBeUndefined();
  });
});
