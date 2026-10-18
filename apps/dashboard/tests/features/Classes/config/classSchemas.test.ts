import { describe, expect, it } from 'bun:test';
import { schoolI18n } from '@sms/contracts/locales';

import { createClassSchema } from '@/features/Classes/config/classSchemas';

// The English catalog, so a message a test reads proves its key exists.
const english = (key: string, params?: Record<string, unknown>) => schoolI18n.translate('en', key as never, params as never);
const classSchema = createClassSchema(english);

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

  it('keeps a selected cycle and explicitly clears an unassigned cycle', () => {
    expect(classSchema.parse({ ...valid, cycleId: 'cycle-primary' }).cycleId).toBe('cycle-primary');
    expect(classSchema.parse({ ...valid, cycleId: '__none__' }).cycleId).toBeNull();
    expect(classSchema.parse({ ...valid, cycleId: null }).cycleId).toBeNull();
    expect(classSchema.parse(valid).cycleId).toBeUndefined();
  });
});
