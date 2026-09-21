import { z } from 'zod';

import { dateField, optionalId, requiredId } from '@/shared/forms/fieldPrimitives';

/**
 * Who an announcement is for.
 *
 * Frontend-only: this is not a database enum and the API does not persist the
 * word `class` — picking it is what makes `classIds` meaningful, and the
 * server reads the audience from which ids arrive. It stays here rather than
 * in `@sms/contracts`, which only holds values that actually travel.
 */
export const ANNOUNCEMENT_AUDIENCE_VALUES = [
  'all',
  'students',
  'teachers',
  'parents',
  'class',
] as const;

export type AnnouncementAudience = (typeof ANNOUNCEMENT_AUDIENCE_VALUES)[number];

export const announcementSchema = z.object({
  id: optionalId,
  title: z.string().min(3, 'Title must be at least 3 characters').max(200, 'Title too long'),
  content: z.string().min(10, 'Content must be at least 10 characters').max(5000, 'Content too long'),
  authorId: optionalId,
  targetAudience: z.enum(ANNOUNCEMENT_AUDIENCE_VALUES),
  classId: optionalId,
  classIds: z.array(requiredId).min(1, 'Select at least one class').optional(),
  publishDate: dateField.optional(),
  expiryDate: dateField.optional(),
});

export type AnnouncementFormValues = z.input<typeof announcementSchema>;
