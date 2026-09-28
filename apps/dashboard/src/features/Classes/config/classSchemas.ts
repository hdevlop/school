import { z } from 'zod';

const optionalId = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().min(1, 'ID cannot be empty').nullish().optional(),
);
/**
 * What the class form accepts. `level` is a free string rather than an enum:
 * the levels a school runs are its own, and the API stores whatever it is told.
 * There is no year field: a new class takes the year being viewed, which the
 * request carries, and keeps it.
 */
export const classSchema = z.object({
  id: optionalId,
  name: z.string().min(1, 'Class name is required').max(50, 'Class name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  level: z.string().min(1, 'Class level is required'),
});

export type ClassFormValues = z.input<typeof classSchema>;
