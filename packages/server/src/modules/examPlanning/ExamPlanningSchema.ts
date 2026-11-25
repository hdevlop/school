import { boolean, date, index, integer, jsonb, pgTable, text, uniqueIndex } from 'drizzle-orm/pg-core';
import type { ExamPlanningEntry } from '@sms/contracts';
import { usersTable as users } from '../../auth';
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

/**
 * A Contrôle of the year (see `ExamControl` in @sms/contracts): its days, its
 * classes and the Massar Contrôle it feeds, or none for an internal one. The
 * semester is stored with it, read from its first day.
 */
export const examControls = pgTable('exam_controls', {
  id: idField(),
  academicYearId: text('academic_year_id').notNull().references(() => academicYears.id, { onDelete: 'restrict' }),
  term: integer('term').notNull(),
  dateFrom: date('date_from', { mode: 'string' }).notNull(),
  dateTo: date('date_to', { mode: 'string' }).notNull(),
  classIds: jsonb('class_ids').$type<string[]>().notNull().default([]),
  /** The subjects it tests; empty: every subject. */
  subjectIds: jsonb('subject_ids').$type<string[]>().notNull().default([]),
  createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
  ...timestamps,
}, table => [index('exam_controls_year_idx').on(table.academicYearId)]);
