import { date, index, integer, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

import { createRef, idField, timestamps } from '../../database/shared';
import { usersTable as users } from '../../auth';
import { getEnumValues } from '../../shared/enums';
import { academicYears } from '../academicYears/AcademicYearSchema';
import { assessments } from '../assessments/assessmentSchema';
import { studentRef } from '../students/studentSchema';
import { teacherAssignmentRef } from '../teachers/teacherSchema';

export const homeworkAttachmentKindEnum = pgEnum('homeworkAttachmentKind', getEnumValues('homeworkAttachmentKind'));

/**
 * What a teacher gives a class to do at home. Not an assessment: it has no
 * marks, and two dates (given on, due on). `assessmentId` links the
 * assessment that later grades it, when there is one.
 */
export const homework = pgTable('homework', {
  id: idField(),
  teacherAssignmentId: teacherAssignmentRef('restrict'),
  academicYearId: text('academic_year_id').references(() => academicYears.id, { onDelete: 'restrict' }),
  // null = every section of the assignment's class, as for assessments.
  sectionIds: jsonb('section_ids').$type<string[]>(),
  // Given on. Named `date` so the dated-source ownership rules apply unchanged.
  date: date('date').notNull(),
  dueOn: date('due_on'),
  title: text('title').notNull(),
  content: text('content'),
  assessmentId: text('assessment_id').references(() => assessments.id, { onDelete: 'set null' }),
  // The part of the subject it is for (Français: Graphisme, Dictée…), by name:
  // the class's Massar parts that year, or without Massar the subject's own
  // sub-subjects (see homeworkParts). A name, so a Massar re-import or a
  // renamed sub-subject leaves what was posted as it was.
  subSubject: text('sub_subject'),
  ...timestamps,
}, (table) => [index('homework_year_date_idx').on(table.academicYearId, table.date)]);

export const homeworkRef = createRef('homework_id', () => homework.id);

/**
 * One stored file of a homework. `fileHash` is the SHA-256 of the stored
 * bytes and names the file in storage, so identical files are stored once.
 * Retention removes the file and sets `purgedAt`; the row stays.
 */
export const homeworkAttachments = pgTable('homework_attachments', {
  id: idField(),
  homeworkId: homeworkRef(),
  fileHash: text('file_hash').notNull(),
  kind: homeworkAttachmentKindEnum('kind').notNull(),
  mimeType: text('mime_type').notNull(),
  size: integer('size').notNull(),
  width: integer('width'),
  height: integer('height'),
  position: integer('position').notNull().default(0),
  purgedAt: timestamp('purged_at', { mode: 'string' }),
  ...timestamps,
}, (table) => [
  index('homework_attachments_hash_idx').on(table.fileHash),
  index('homework_attachments_homework_idx').on(table.homeworkId),
]);

/** A parent marked the homework seen for one of their children. */
export const homeworkAcknowledgments = pgTable('homework_acknowledgments', {
  id: idField(),
  homeworkId: homeworkRef(),
  studentId: studentRef(),
  parentUserId: text('parent_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  seenAt: timestamp('seen_at', { mode: 'string' }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('homework_acknowledgments_unique').on(table.homeworkId, table.studentId, table.parentUserId),
]);
