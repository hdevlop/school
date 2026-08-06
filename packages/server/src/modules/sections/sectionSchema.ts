import { integer, pgEnum, pgTable, text } from 'drizzle-orm/pg-core';

import { createRef, idField, timestamps } from '@server/database/shared';
import { getEnumValues } from '@server/shared/enums';
import { classRef } from '../classes/classSchema';

export const sectionStatusEnum = pgEnum('sectionStatus', getEnumValues('sectionStatus'));

export const sections = pgTable('sections', {
  id: idField(),
  classId: classRef(),
  name: text('name').notNull(),
  maxStudents: integer('max_students').default(30),
  roomNumber: text('room_number'),
  status: sectionStatusEnum('status').default('active'),
  ...timestamps,
});

export const sectionRef = createRef('section_id', () => sections.id);
