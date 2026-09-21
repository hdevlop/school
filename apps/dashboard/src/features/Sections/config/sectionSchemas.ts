import { z } from 'zod';
import { SECTION_STATUS_VALUES } from '@sms/contracts';

import { num, optionalId, requiredId } from '@/shared/forms/fieldPrimitives';

/**
 * What the section form accepts.
 *
 * `roomNumber` is a number here although the column is text — the form has
 * always coerced it, and changing that would change what the API receives.
 */
export const sectionSchema = z.object({
  id: optionalId,
  classId: requiredId,
  name: z.string().min(1, 'Section name is required').max(10, 'Section name too long'),
  maxStudents: num().int().min(1, 'Max students must be at least 1').max(100, 'Max students cannot exceed 100').default(30),
  roomNumber: num().max(10000, 'Room number too long').optional(),
  status: z.enum(SECTION_STATUS_VALUES).default('active'),
});

export type SectionFormValues = z.input<typeof sectionSchema>;
