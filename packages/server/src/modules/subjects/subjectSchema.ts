import { index, integer, pgTable, text, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

import { createRef, idField, timestamps } from '../../database/shared';

export const subjects = pgTable('subjects', {
  id: idField(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  /** The subject's name in Arabic ("التربية الإسلامية"): Planning and Massar find the subject by it too. */
  nameAr: text('name_ar'),
  description: text('description'),
  ...timestamps,
}, table => [uniqueIndex('subjects_code_normalized_unique').on(sql`upper(btrim(${table.code}))`)]);

export const subjectRef = createRef('subject_id', () => subjects.id);

/**
 * What a subject is taught as (Français: Grammaire, Dictée…; العربية: الإملاء…).
 * `level` null is the school's list; a level (a class name, CE2 or 3APG, kept
 * from year to year) listed in subjectLevelLists has its own list instead.
 * Planning picks one, and its exam is of the parent subject. A name names one
 * subject: it may repeat across levels, always under the same subject
 * (SubjectValidator.ensureNamesFree).
 */
export const subSubjects = pgTable('sub_subjects', {
  id: idField(),
  subjectId: text('subject_id').notNull().references(() => subjects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  level: text('level'),
  position: integer('position').notNull().default(0),
  ...timestamps,
}, table => [
  uniqueIndex('sub_subjects_level_name_unique').on(sql`lower(btrim(coalesce(${table.level}, '')))`, sql`lower(btrim(${table.name}))`),
  index('sub_subjects_subject_idx').on(table.subjectId),
]);

/** A level that has its own sub-subject list for a subject, even an empty one. */
export const subjectLevelLists = pgTable('subject_level_lists', {
  id: idField(),
  subjectId: text('subject_id').notNull().references(() => subjects.id, { onDelete: 'cascade' }),
  level: text('level').notNull(),
  ...timestamps,
}, table => [
  uniqueIndex('subject_level_lists_subject_level_unique').on(table.subjectId, sql`lower(btrim(${table.level}))`),
]);
