import { z } from 'zod';

import { num, optionalId } from '@/shared/forms/fieldPrimitives';

/**
 * What the subject form accepts. The server's `SubjectDto` validates the same
 * payload again; this only spares the user a round trip.
 */
export const subjectSchema = z.object({
  id: optionalId,
  code: z.string().min(2, 'Subject code must be at least 2 characters').max(10, 'Subject code too long'),
  name: z.string().min(2, 'Subject name must be at least 2 characters').max(100, 'Subject name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  gradeLevel: num().int().min(1).max(12).optional(),
});

export type SubjectFormValues = z.input<typeof subjectSchema>;
