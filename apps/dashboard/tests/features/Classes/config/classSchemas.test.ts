import { describe, expect, it } from 'bun:test';

import { classSchema } from '@/features/Classes/config/classSchemas';

const valid = { name: '6A', level: 'primary' };

describe('classSchema', () => {
  it('accepts a class without a year, which the viewed year supplies', () => {
    expect(classSchema.safeParse(valid).success).toBe(true);
  });

  it('never submits a year of its own', () => {
    const parsed = classSchema.parse({ ...valid, academicYear: '2020-2021' });
    expect(parsed).not.toHaveProperty('academicYear');
  });

  it('needs a level, because the year rollover groups classes by it', () => {
    expect(classSchema.safeParse({ ...valid, level: '' }).success).toBe(false);
  });
});
