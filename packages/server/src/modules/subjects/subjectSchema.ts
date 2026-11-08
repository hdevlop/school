import { index, integer, pgTable, text, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

import { createRef, idField, timestamps } from '../../database/shared';

export const subjects = pgTable('subjects', {
  id: idField(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  ...timestamps,
}, table => [uniqueIndex('subjects_code_normalized_unique').on(sql`upper(btrim(${table.code}))`)]);

export const subjectRef = createRef('subject_id', () => subjects.id);

/**
 * What a subject is taught as (Français: Grammaire, Dictée…; العربية: الإملاء…),
 * the same list for every class. Planning picks one, and its exam is of the
 * parent subject. A name exists once in the school, so it names one subject.
 */
export const subSubjects = pgTable('sub_subjects', {
  id: idField(),
  subjectId: text('subject_id').notNull().references(() => subjects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  position: integer('position').notNull().default(0),
  ...timestamps,
}, table => [
  uniqueIndex('sub_subjects_name_unique').on(sql`lower(btrim(${table.name}))`),
  index('sub_subjects_subject_idx').on(table.subjectId),
]);
