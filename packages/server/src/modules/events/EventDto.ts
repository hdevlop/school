import { z } from 'zod';
import { dateField, num, optionalDateField, optionalId, timeField } from '@server/shared/fields';
import {
  attendanceStatusEnum,
  eventStatusEnum,
  eventTypeEnum,
  eventVisibilityEnum,
  participantTypeEnum,
} from '@server/shared/enums';

const eventSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200, 'Title too long'),
  description: z.string().max(5000, 'Description too long').optional().nullable(),
  type: eventTypeEnum,
  startDate: dateField,
  endDate: dateField,
  startTime: timeField,
  endTime: timeField,
  location: z.string().max(200, 'Location too long').optional().nullable(),
  venue: z.string().max(200, 'Venue too long').optional().nullable(),
  organizerId: optionalId,
  classId: optionalId.nullable(),
  sectionId: optionalId.nullable(),
  classIds: z.array(z.string().min(1)).optional().nullable(),
  visibility: eventVisibilityEnum.default('public'),
  status: eventStatusEnum.default('scheduled'),
  capacity: num().int().positive('Capacity must be positive').optional().nullable(),
  registrationRequired: z.boolean().default(false),
  registrationDeadline: optionalDateField.nullable(),
  attachments: z.array(z.string()).optional().nullable(),
  notes: z.string().max(2000, 'Notes too long').optional().nullable(),
});

const eventParticipantSchema = z.object({
  eventId: optionalId,
  participantId: optionalId,
  participantType: participantTypeEnum,
  attendanceStatus: attendanceStatusEnum.optional().nullable(),
  notes: z.string().max(500, 'Notes too long').optional().nullable(),
});

export const createEventDto = eventSchema;
export const updateEventDto = createEventDto.partial();
export const createEventParticipantDto = eventParticipantSchema.extend({
  eventId: z.string().min(1),
  participantId: z.string().min(1),
});
export const updateEventParticipantDto = createEventParticipantDto.partial();

export const eventIdParam = z.object({ id: z.string().min(1) });
export const eventParticipantIdParam = z.object({ id: z.string().min(1) });
export const eventStatusParam = z.object({ status: eventStatusEnum });
export const eventTypeParam = z.object({ type: eventTypeEnum });
export const eventOrganizerIdParam = z.object({ organizerId: z.string().min(1) });
export const eventClassIdParam = z.object({ classId: z.string().min(1) });
export const eventSectionIdParam = z.object({ sectionId: z.string().min(1) });
export const eventVisibilityParam = z.object({ visibility: eventVisibilityEnum });
export const eventParticipantLookupParam = z.object({ participantId: z.string().min(1) });
export const eventParticipantsByTypeParam = z.object({
  id: z.string().min(1),
  type: participantTypeEnum,
});
export const dateRangeDto = z.object({ startDate: z.string().min(1), endDate: z.string().min(1) });
export const postponeEventDto = z.object({ newStartDate: z.string().min(1), newEndDate: z.string().min(1) });
export const markAttendanceDto = z.object({ status: z.string().min(1) });

export type CreateEventDto = z.input<typeof createEventDto>;
export type UpdateEventDto = z.input<typeof updateEventDto>;
export type CreateEventParticipantDto = z.input<typeof createEventParticipantDto>;
export type UpdateEventParticipantDto = z.input<typeof updateEventParticipantDto>;
export type DateRangeDto = z.infer<typeof dateRangeDto>;
export type PostponeEventDto = z.infer<typeof postponeEventDto>;
export type MarkAttendanceDto = z.infer<typeof markAttendanceDto>;
