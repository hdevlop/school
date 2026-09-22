import { z } from 'zod';
import { SECTION_STATUS_VALUES } from '@sms/contracts';

const optionalId = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().min(1, 'ID cannot be empty').nullish().optional(),
);
const requiredId = z.preprocess(
  (value) => value ?? '',
  z.string().min(1, 'ID is required'),
);
const numberField = (schema: z.ZodNumber): any =>
  z.preprocess((value) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed === '' ? value : Number(trimmed);
  }, schema);

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
  maxStudents: numberField(z.number({ error: 'Must be a valid number' }).int('Must be an integer').min(1, 'Max students must be at least 1').max(100, 'Max students cannot exceed 100')).default(30),
  roomNumber: numberField(z.number({ error: 'Must be a valid number' }).max(10000, 'Room number too long')).optional(),
  status: z.enum(SECTION_STATUS_VALUES).default('active'),
});

export type SectionFormValues = z.input<typeof sectionSchema>;
