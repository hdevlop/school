import { z } from 'zod';
import { EVENT_STATUS_VALUES, EVENT_TYPE_VALUES, EVENT_VISIBILITY_VALUES } from '@sms/contracts';

const optionalId = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().min(1, 'ID cannot be empty').nullish().optional(),
);
const dateField = z.string().regex(
  /^(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}|\d{2}-\d{2}-\d{2}|\d{2}-\d{2}-\d{4})$/,
  'Date must be in YYYY-MM-DD, MM/DD/YYYY, DD/MM/YYYY, DD-MM-YY, or DD-MM-YYYY format',
);
const optionalDateField = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
  .nullable()
  .optional();
const timePattern = /^([01]?[0-9]|2[0-3]):([0-5][0-9])(?::[0-5][0-9])?$/;
const timeField = z
  .union([
    z.literal('').transform(() => undefined),
    z.string().regex(timePattern, 'Time must be in HH:MM format').transform((value) => {
      const match = value.trim().match(timePattern);
      return match ? `${match[1].padStart(2, '0')}:${match[2]}` : value;
    }),
  ])
  .optional()
  .nullable();
const numberField = (schema: z.ZodNumber): any =>
  z.preprocess((value) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed === '' ? value : Number(trimmed);
  }, schema);

/**
 * What the event form accepts.
 *
 * `classIds` is the real field; `classId` and `sectionId` are nullable
 * leftovers the API still reads for single-class events, so both are kept
 * rather than tidied away — the calendar and the event list both send them.
 */
export const eventSchema = z.object({
  id: optionalId,
  title: z.string().min(3, 'Title must be at least 3 characters').max(200, 'Title too long'),
  description: z.string().max(5000, 'Description too long').optional().nullable(),
  type: z.enum(EVENT_TYPE_VALUES),
  startDate: dateField,
  endDate: dateField,
  startTime: timeField,
  endTime: timeField,
  location: z.string().max(200, 'Location too long').optional().nullable(),
  venue: z.string().max(200, 'Venue too long').optional().nullable(),
  organizerId: optionalId,
  classId: optionalId.nullable(),
  classIds: z.array(z.string().min(1)).min(1, 'Select at least one class'),
  sectionId: optionalId.nullable(),
  visibility: z.enum(EVENT_VISIBILITY_VALUES).default('public'),
  status: z.enum(EVENT_STATUS_VALUES).default('scheduled'),
  capacity: numberField(z.number({ error: 'Must be a valid number' }).int('Must be an integer').positive('Capacity must be positive')).optional().nullable(),
  registrationRequired: z.boolean().default(false),
  registrationDeadline: optionalDateField.nullable(),
  attachments: z.any().optional().nullable(),
  notes: z.string().max(2000, 'Notes too long').optional().nullable(),
});

export type EventFormValues = z.input<typeof eventSchema>;
