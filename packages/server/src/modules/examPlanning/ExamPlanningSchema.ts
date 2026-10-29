import { boolean, jsonb, pgTable, text, uniqueIndex } from 'drizzle-orm/pg-core';
import type { ExamPlanningEntry } from '@sms/contracts';
import { idField, timestamps } from '../../database/shared';
import { classes } from '../classes/classSchema';
import { academicYears } from '../academicYears/AcademicYearSchema';

export const examPlanning = pgTable('exam_planning', {
  id: idField(),
  academicYearId: text('academic_year_id').notNull().references(() => academicYears.id, { onDelete: 'restrict' }),
  classId: text('class_id').notNull().references(() => classes.id, { onDelete: 'cascade' }),
  visible: boolean('visible').notNull().default(true),
  months: jsonb('months').$type<Record<string, ExamPlanningEntry[]>>().notNull().default({}),
  ...timestamps,
}, table => [uniqueIndex('exam_planning_year_class_unique').on(table.academicYearId, table.classId)]);
