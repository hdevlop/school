import { boolean, date, integer, jsonb, pgEnum, pgTable, text, time, timestamp } from 'drizzle-orm/pg-core';

import { attendanceStatusEnum, createRef, idField, timestamps, userRef } from '@server/database/shared';
import { getEnumValues } from '@server/shared/enums';
import { classRef } from '../classes/classSchema';
import { sectionRef } from '../sections/sectionSchema';

export const eventTypeEnum = pgEnum('eventType', getEnumValues('eventType'));
export const eventStatusEnum = pgEnum('eventStatus', getEnumValues('eventStatus'));
export const eventVisibilityEnum = pgEnum('eventVisibility', getEnumValues('eventVisibility'));
export const participantTypeEnum = pgEnum('participantType', getEnumValues('participantType'));

export const events = pgTable('events', {
  id: idField(),
  organizerId: userRef('set null'),
  classId: classRef('set null'),
  sectionId: sectionRef('set null'),
  classIds: jsonb('class_ids').$type<string[]>(),
  title: text('title').notNull(),
  description: text('description'),
  type: eventTypeEnum('type').notNull(),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  startTime: time('start_time'),
  endTime: time('end_time'),
  location: text('location'),
  venue: text('venue'),
  visibility: eventVisibilityEnum('visibility').default('public'),
  status: eventStatusEnum('status').default('scheduled'),
  capacity: integer('capacity'),
  registrationRequired: boolean('registration_required').default(false),
  registrationDeadline: date('registration_deadline'),
  attachments: jsonb('attachments'),
  notes: text('notes'),
  ...timestamps,
});

export const eventRef = createRef('event_id', () => events.id);

export const eventParticipants = pgTable('event_participants', {
  id: idField(),
  eventId: eventRef(),
  participantId: text('participant_id').notNull(),
  participantType: text('participant_type').notNull(),
  registrationDate: timestamp('registration_date', { mode: 'string' }).defaultNow(),
  attendanceStatus: attendanceStatusEnum('attendance_status'),
  notes: text('notes'),
  ...timestamps,
});
