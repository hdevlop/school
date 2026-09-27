import { date, index, integer, jsonb, pgEnum, pgTable, text } from 'drizzle-orm/pg-core';

import { createRef, idField, numericField, timestamps } from '../../database/shared';
import { getEnumValues } from '../../shared/enums';
import { teacherAssignmentRef } from '../teachers/teacherSchema';
import { academicYears } from '../academicYears/AcademicYearSchema';

export const assessmentTypeEnum = pgEnum('assessmentType', getEnumValues('assessmentType'));
export const assessmentStatusEnum = pgEnum('assessmentStatus', getEnumValues('assessmentStatus'));
export const submissionTypeEnum = pgEnum('submissionType', getEnumValues('submissionType'));

export const assessments = pgTable('assessments', {
  id: idField(),
  teacherAssignmentId: teacherAssignmentRef('restrict'),
  academicYearId: text('academic_year_id').references(() => academicYears.id, { onDelete: 'restrict' }),
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
}, (table) => [index('assessments_year_date_idx').on(table.academicYearId, table.date)]);

export const assessmentRef = createRef('assessment_id', () => assessments.id);
