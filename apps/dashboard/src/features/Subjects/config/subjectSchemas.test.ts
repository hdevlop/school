import { describe, expect, it } from 'bun:test';

import { subjectSchema } from './subjectSchemas';

const valid = { code: 'MTH', name: 'Mathematics' };

describe('subjectSchema', () => {
  it('coerces the grade level the input submits as text', () => {
    expect(subjectSchema.parse({ ...valid, gradeLevel: '5' }).gradeLevel).toBe(5);
  });

  it('keeps the grade level inside the twelve years the school runs', () => {
    expect(subjectSchema.safeParse({ ...valid, gradeLevel: 0 }).success).toBe(false);
    expect(subjectSchema.safeParse({ ...valid, gradeLevel: 13 }).success).toBe(false);
  });

  it('leaves the grade level out when the subject spans every year', () => {
    expect(subjectSchema.parse(valid).gradeLevel).toBeUndefined();
  });
});
