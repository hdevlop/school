import { z } from 'zod';

const optionalId = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().min(1, 'ID cannot be empty').nullish().optional(),
);
const academicYearField = z
  .string()
  .min(9, 'Academic year is required')
  .regex(/^\d{4}-\d{4}$/, 'Academic year must be in YYYY-YYYY format');

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
