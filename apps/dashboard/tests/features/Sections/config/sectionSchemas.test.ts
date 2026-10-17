import { describe, expect, it } from 'bun:test';
import { schoolI18n } from '@sms/contracts/locales';
import { SECTION_STATUS_VALUES } from '@sms/contracts';

import { createSectionSchema } from '@/features/Sections/config/sectionSchemas';

// The English catalog, so a message a test reads proves its key exists.
const english = (key: string, params?: Record<string, unknown>) => schoolI18n.translate('en', key as never, params as never);
const sectionSchema = createSectionSchema(english);

const valid = { classId: 'cls1', name: 'A' };

describe('sectionSchema', () => {
  it('defaults a new section to thirty seats and active', () => {
    const parsed = sectionSchema.parse(valid);

    expect(parsed.maxStudents).toBe(30);
    expect(parsed.status).toBe('active');
  });

  it('coerces the seat count and room number the inputs submit as text', () => {
    const parsed = sectionSchema.parse({ ...valid, maxStudents: '24', roomNumber: '107' });

    expect(parsed.maxStudents).toBe(24);
    expect(parsed.roomNumber).toBe(107);
  });

  it('accepts every status the API accepts and nothing else', () => {
    for (const status of SECTION_STATUS_VALUES) {
      expect(sectionSchema.safeParse({ ...valid, status }).success).toBe(true);
    }
    expect(sectionSchema.safeParse({ ...valid, status: 'retired' }).success).toBe(false);
  });

  it('keeps a section between one and a hundred students', () => {
    expect(sectionSchema.safeParse({ ...valid, maxStudents: 0 }).success).toBe(false);
    expect(sectionSchema.safeParse({ ...valid, maxStudents: 101 }).success).toBe(false);
  });
});
