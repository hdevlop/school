import { pgTable, text, unique } from 'drizzle-orm/pg-core';

import { createRef, idField, timestamps } from '../../database/shared';
import { cycleRef } from '../cycles/cycleSchema';

export const classes = pgTable('classes', {
  id: idField(),
  name: text('name').notNull(),
  description: text('description'),
  academicYear: text('academic_year').notNull(),
  level: text('level'),
  cycleId: cycleRef('set null'),
  ...timestamps,
}, (table) => [
  unique('classes_name_academic_year_unique').on(table.name, table.academicYear),
]);

export const classRef = createRef('class_id', () => classes.id, 'restrict');
