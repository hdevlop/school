import { describe, expect, it } from 'bun:test';

import { classSchema } from './classSchemas';

const valid = { name: '6A', academicYear: '2025-2026', level: 'primary' };

describe('classSchema', () => {
  it('accepts a class for a full academic year', () => {
    expect(classSchema.safeParse(valid).success).toBe(true);
  });

  it('refuses an academic year that is not YYYY-YYYY', () => {
    for (const academicYear of ['2025', '2025/2026', '25-26']) {
      expect(classSchema.safeParse({ ...valid, academicYear }).success).toBe(false);
    }
  });

  it('needs a level, because the year rollover groups classes by it', () => {
    expect(classSchema.safeParse({ ...valid, level: '' }).success).toBe(false);
  });
});
