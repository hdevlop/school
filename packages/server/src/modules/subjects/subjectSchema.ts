import { pgTable, text, uniqueIndex } from 'drizzle-orm/pg-core';
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
