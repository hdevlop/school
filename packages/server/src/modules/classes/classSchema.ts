import { pgTable, text } from 'drizzle-orm/pg-core';

import { createRef, idField, timestamps } from '@server/database/shared';
import { cycleRef } from '../cycles/cycleSchema';

export const classes = pgTable('classes', {
  id: idField(),
  name: text('name').notNull().unique(),
  description: text('description'),
  academicYear: text('academic_year').notNull(),
  level: text('level'),
  cycleId: cycleRef('set null'),
  ...timestamps,
});

export const classRef = createRef('class_id', () => classes.id, 'restrict');
