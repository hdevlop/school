import { z } from 'zod';
import {
  DISCIPLINE_ACTION_VALUES,
  DISCIPLINE_CATEGORY_VALUES,
  DISCIPLINE_SEVERITY_VALUES,
} from '@sms/contracts';

const optionalId = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().min(1, 'ID cannot be empty').nullish().optional(),
);
const requiredId = z.preprocess(
  (value) => value ?? '',
  z.string().min(1, 'ID is required'),
);

/**
 * Recording an incident.
 *
 * The date and time are validated with their own patterns rather than the
 * broader date inputs: an incident is logged from a date and a time input that
 * both emit one fixed format, and a half-remembered date is worse here than a
 * rejected one.
 */
export const disciplineSchema = z.object({
  id: optionalId,
  studentId: requiredId,
  incidentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Incident date is required'),
  incidentTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Incident time is required'),
  category: z.enum(DISCIPLINE_CATEGORY_VALUES),
  severity: z.enum(DISCIPLINE_SEVERITY_VALUES).default('medium'),
  location: z.string().max(150, 'Location is too long').optional().nullable(),
  description: z.string().trim().min(1, 'Description is required').max(2000, 'Description is too long'),
});

/**
 * Closing an incident. A resolution note is mandatory — this is the record a
 * parent may later be shown, so "resolved" on its own is not an account.
 */
export const resolveDisciplineSchema = z.object({
  actionType: z.enum(DISCIPLINE_ACTION_VALUES),
  actionNote: z.string().max(1000, 'Action note is too long').optional().nullable(),
  resolutionNote: z.string().trim().min(1, 'Resolution note is required').max(2000, 'Resolution note is too long'),
});

export type DisciplineFormValues = z.input<typeof disciplineSchema>;
export type ResolveDisciplineFormValues = z.input<typeof resolveDisciplineSchema>;
