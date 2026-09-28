import { boolean, index, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

import { idField, timestamps, userRef } from '../../database/shared';
import { classRef } from '../classes/classSchema';
import { sectionRef } from '../sections/sectionSchema';
import { academicYears } from '../academicYears/AcademicYearSchema';

export const announcements = pgTable('announcements', {
  id: idField(),
  authorId: userRef('set null'),
  classId: classRef('set null'),
  sectionId: sectionRef('set null'),
  academicYearId: text('academic_year_id').references(() => academicYears.id, { onDelete: 'restrict' }),
  classIds: jsonb('class_ids').$type<string[]>(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  targetAudience: text('target_audience').notNull(),
  isPublished: boolean('is_published').default(false),
  publishDate: timestamp('publish_date', { mode: 'string' }),
  expiryDate: timestamp('expiry_date', { mode: 'string' }),
  ...timestamps,
}, (table) => [index('announcements_academic_year_idx').on(table.academicYearId)]);
