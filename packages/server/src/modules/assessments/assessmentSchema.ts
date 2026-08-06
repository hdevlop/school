import { date, integer, jsonb, pgEnum, pgTable, text } from 'drizzle-orm/pg-core';

import { createRef, idField, numericField, timestamps } from '@server/database/shared';
import { getEnumValues } from '@server/shared/enums';
import { teacherAssignmentRef } from '../teachers/teacherSchema';

export const assessmentTypeEnum = pgEnum('assessmentType', getEnumValues('assessmentType'));
export const assessmentStatusEnum = pgEnum('assessmentStatus', getEnumValues('assessmentStatus'));
export const submissionTypeEnum = pgEnum('submissionType', getEnumValues('submissionType'));

export const assessments = pgTable('assessments', {
  id: idField(),
  teacherAssignmentId: teacherAssignmentRef(),
  title: text('title').notNull(),
  description: text('description'),
  type: assessmentTypeEnum('type').notNull().default('quiz'),
  date: date('date').notNull(),
  duration: integer('duration'),
  totalMarks: numericField('total_marks').notNull(),
  passingMarks: numericField('passing_marks').notNull(),
  instructions: text('instructions'),
  status: assessmentStatusEnum('status').notNull().default('scheduled'),
  sectionIds: jsonb('section_ids').$type<string[]>(),
  ...timestamps,
});

export const assessmentRef = createRef('assessment_id', () => assessments.id);
