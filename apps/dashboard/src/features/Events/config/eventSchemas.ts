import { z } from 'zod';
import { EVENT_STATUS_VALUES, EVENT_TYPE_VALUES, EVENT_VISIBILITY_VALUES } from '@sms/contracts';

import {
  dateField,
  num,
  optionalDateField,
  optionalId,
  timeField,
} from '@/shared/forms/fieldPrimitives';

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
  capacity: num().int().positive('Capacity must be positive').optional().nullable(),
  registrationRequired: z.boolean().default(false),
  registrationDeadline: optionalDateField.nullable(),
  attachments: z.any().optional().nullable(),
  notes: z.string().max(2000, 'Notes too long').optional().nullable(),
});

export type EventFormValues = z.input<typeof eventSchema>;
