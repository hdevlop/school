import { describe, expect, it } from 'bun:test';
import { schoolI18n } from '@sms/contracts/locales';

import { createAnnouncementSchema } from '@/features/Announcements/config/announcementSchemas';

// The English catalog, so a message a test reads proves its key exists.
const english = (key: string, params?: Record<string, unknown>) => schoolI18n.translate('en', key as never, params as never);
const announcementSchema = createAnnouncementSchema(english);

/**
 * A new announcement form starts with `classIds: []`, and only the class
 * audience renders the class picker. When any audience required a class, the
 * form failed on that hidden field and Create did nothing, without a message.
 */

const fresh = {
  title: 'Réunion parents',
  content: 'La réunion aura lieu vendredi à 17h.',
  classId: '',
  classIds: [],
  publishDate: undefined,
  expiryDate: undefined,
};

describe('announcement schema', () => {
  it.each(['all', 'students', 'teachers', 'parents'] as const)('accepts a fresh %s announcement with no class', (targetAudience) => {
    expect(announcementSchema.safeParse({ ...fresh, targetAudience }).success).toBe(true);
  });

  it('requires a class only for the class audience, on the class field', () => {
    const result = announcementSchema.safeParse({ ...fresh, targetAudience: 'class' });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.path.join('.'))).toEqual(['classIds']);
  });

  it('accepts the class audience once a class is picked', () => {
    expect(announcementSchema.safeParse({ ...fresh, targetAudience: 'class', classIds: ['cls1'] }).success).toBe(true);
  });
});
