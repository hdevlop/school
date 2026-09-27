import { date, index, integer, jsonb, pgEnum, pgTable, text, time } from 'drizzle-orm/pg-core';

import { createRef, idField, numericField, timestamps } from '../../database/shared';
import { getEnumValues } from '../../shared/enums';
import { teacherAssignmentRef } from '../teachers/teacherSchema';
import { academicYears } from '../academicYears/AcademicYearSchema';

export const examTypeEnum = pgEnum('examType', getEnumValues('examType'));
export const examStatusEnum = pgEnum('examStatus', getEnumValues('examStatus'));
export const examSecurityEnum = pgEnum('examSecurity', getEnumValues('examSecurity'));

export const exams = pgTable('exams', {
  id: idField(),
  teacherAssignmentId: teacherAssignmentRef('restrict'),
  academicYearId: text('academic_year_id').references(() => academicYears.id, { onDelete: 'restrict' }),
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
}, (table) => [index('exams_year_date_idx').on(table.academicYearId, table.date)]);

export const examRef = createRef('exam_id', () => exams.id);
