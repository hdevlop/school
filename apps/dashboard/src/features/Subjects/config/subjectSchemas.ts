import { z } from 'zod';

const optionalId = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().min(1, 'ID cannot be empty').nullish().optional(),
);
const numberField = (schema: z.ZodNumber): any =>
  z.preprocess((value) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed === '' ? value : Number(trimmed);
  }, schema);

/**
 * What the subject form accepts. The server's `SubjectDto` validates the same
 * payload again; this only spares the user a round trip.
 */
export const subjectSchema = z.object({
  id: optionalId,
  code: z.string().min(2, 'Subject code must be at least 2 characters').max(10, 'Subject code too long'),
  name: z.string().min(2, 'Subject name must be at least 2 characters').max(100, 'Subject name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  gradeLevel: numberField(z.number({ error: 'Must be a valid number' }).int('Must be an integer').min(1, 'Must be at least 1').max(12, 'Cannot exceed 12')).optional(),
});

export type SubjectFormValues = z.input<typeof subjectSchema>;
