import { pgTable, text } from 'drizzle-orm/pg-core';

import { createRef, idField, timestamps } from '@server/database/shared';

export const subjects = pgTable('subjects', {
  id: idField(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  ...timestamps,
});

export const subjectRef = createRef('subject_id', () => subjects.id);
