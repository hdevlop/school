import { z } from 'zod';

import { academicYearField, optionalId } from '@/shared/forms/fieldPrimitives';

/**
 * What the class form accepts. `level` is a free string rather than an enum:
 * the levels a school runs are its own, and the API stores whatever it is told.
 */
export const classSchema = z.object({
  id: optionalId,
  name: z.string().min(1, 'Class name is required').max(50, 'Class name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  academicYear: academicYearField,
  level: z.string().min(1, 'Class level is required'),
});

export type ClassFormValues = z.input<typeof classSchema>;
