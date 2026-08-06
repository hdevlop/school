import { date, integer, jsonb, pgEnum, pgTable, text, time } from 'drizzle-orm/pg-core';

import { createRef, idField, numericField, timestamps } from '@server/database/shared';
import { getEnumValues } from '@server/shared/enums';
import { teacherAssignmentRef } from '../teachers/teacherSchema';

export const examTypeEnum = pgEnum('examType', getEnumValues('examType'));
export const examStatusEnum = pgEnum('examStatus', getEnumValues('examStatus'));
export const examSecurityEnum = pgEnum('examSecurity', getEnumValues('examSecurity'));

export const exams = pgTable('exams', {
  id: idField(),
  teacherAssignmentId: teacherAssignmentRef(),
  title: text('title').notNull(),
  description: text('description'),
  type: examTypeEnum('type').notNull().default('midterm'),
  date: date('date').notNull(),
  startTime: time('start_time'),
  endTime: time('end_time'),
  duration: integer('duration').notNull(),
  totalMarks: numericField('total_marks').notNull(),
  passingMarks: numericField('passing_marks').notNull(),
  roomNumber: text('room_number'),
  instructions: text('instructions'),
  status: examStatusEnum('status').notNull().default('scheduled'),
  sectionIds: jsonb('section_ids').$type<string[]>(),
  ...timestamps,
});

export const examRef = createRef('exam_id', () => exams.id);
