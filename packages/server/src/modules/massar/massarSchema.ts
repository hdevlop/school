import { sql } from 'drizzle-orm';
import { boolean, check, date, index, integer, jsonb, numeric, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { MASSAR_REMARK_MAX_LENGTH } from '@sms/contracts';
import type { MassarComponent, MassarPlan, MassarRoundStatus, MassarSheetKind, MassarSheetStatus, MassarAbsence, MassarStatementSettings, MassarStudent } from '@sms/contracts';
import { actionByRef, idField, timestamps } from '../../database/shared';
import { academicYears } from '../academicYears/AcademicYearSchema';
import { classes } from '../classes/classSchema';
import { sections } from '../sections/sectionSchema';
import { subjects } from '../subjects/subjectSchema';
import { students } from '../students/studentSchema';
import { teacherAssignments } from '../teachers/teacherSchema';

const yearRef = () => text('academic_year_id').notNull().references(() => academicYears.id, { onDelete: 'restrict' });
export const massarYears = pgTable('massar_years', {
  id: idField(12), academicYearId: yearRef(), massarYearId: integer('massar_year_id').notNull(),
  schoolCode: text('school_code').notNull(), academy: text('academy').notNull(), direction: text('direction').notNull(), schoolName: text('school_name').notNull(),
  templateFileId: text('template_file_id').notNull(), importedAt: timestamp('imported_at', { mode: 'string' }).defaultNow().notNull(), importedBy: actionByRef('imported_by'),
  // The school's Contrôles of the year; see MassarPlan.
  plan: jsonb('plan').$type<MassarPlan>().notNull().default({ primary: 2, college: 3, dates: [] }),
  // How each student's statement prints; see MassarStatementSettings.
  statement: jsonb('statement').$type<MassarStatementSettings>().notNull().default({ order: [], coefficients: {}, subjectAverage: false, subjectRank: false, generalAverage: false, rank: false, remarks: false, coefficientColumn: false }),
}, table => [uniqueIndex('massar_year_unique').on(table.academicYearId)]);
export const massarLevels = pgTable('massar_levels', {
  id: idField(12), academicYearId: yearRef(), code: text('code').notNull(), label: text('label').notNull(),
  levelCode: text('level_code').notNull(), levelCodeNumeric: boolean('level_code_numeric').notNull().default(false),
  maxMark: integer('max_mark').notNull(), kind: text('kind').$type<MassarSheetKind>().notNull(),
}, table => [uniqueIndex('massar_level_unique').on(table.academicYearId, table.code), check('massar_level_kind_check', sql`${table.kind} in ('components', 'exam')`), check('massar_max_check', sql`${table.maxMark} in (10, 20)`)]);
export const massarClasses = pgTable('massar_classes', {
  id: idField(12), academicYearId: yearRef(), name: text('name').notNull(), levelId: text('level_id').notNull().references(() => massarLevels.id, { onDelete: 'restrict' }),
  guid: text('guid').notNull(), classId: text('class_id').references(() => classes.id, { onDelete: 'restrict' }), sectionId: text('section_id').references(() => sections.id, { onDelete: 'restrict' }),
  unmatchedCodes: jsonb('unmatched_codes').$type<string[]>().notNull().default([]),
  pendingStudents: jsonb('pending_students').$type<Array<{ studentCode: string; name: string; dateOfBirth: string; massarStudentId: string | number | null; position: number }>>().notNull().default([]),
}, table => [uniqueIndex('massar_class_unique').on(table.academicYearId, table.name), uniqueIndex('massar_class_guid_unique').on(table.academicYearId, table.guid)]);
export const massarSubjects = pgTable('massar_subjects', {
  id: idField(12), academicYearId: yearRef(), levelId: text('level_id').notNull().references(() => massarLevels.id, { onDelete: 'restrict' }),
  code: text('code').notNull(), name: text('name').notNull(), subjectId: text('subject_id').references(() => subjects.id, { onDelete: 'restrict' }),
  components: jsonb('components').$type<MassarComponent[]>().notNull(),
  observedRounds: jsonb('observed_rounds').$type<Array<{ term: number; exam: number; termLabel: string; examLabel: string; components: MassarComponent[] }>>().notNull().default([]),
  // False for a subject taken from the default model (last year's files), until a Massar file of this year confirms it.
  confirmed: boolean('confirmed').notNull().default(true),
}, table => [uniqueIndex('massar_subject_unique').on(table.academicYearId, table.levelId, table.code)]);
export const massarEnrollments = pgTable('massar_enrollments', {
  id: idField(12), academicYearId: yearRef(), studentId: text('student_id').notNull().references(() => students.id, { onDelete: 'restrict' }),
  massarClassId: text('massar_class_id').notNull().references(() => massarClasses.id, { onDelete: 'restrict' }),
  massarStudentId: text('massar_student_id'), massarStudentIdNumeric: boolean('massar_student_id_numeric').notNull().default(false), name: text('name').notNull(), dateOfBirth: text('date_of_birth').notNull(),
  position: integer('position').notNull(), leftOn: date('left_on'),
}, table => [uniqueIndex('massar_enrollment_unique').on(table.academicYearId, table.studentId), index('massar_roster_idx').on(table.academicYearId, table.massarClassId)]);
export const massarRounds = pgTable('massar_rounds', {
  id: idField(12), academicYearId: yearRef(), term: integer('term').notNull(), termLabel: text('term_label').notNull(), exam: integer('exam').notNull(), examLabel: text('exam_label').notNull(),
  status: text('status').$type<MassarRoundStatus>().notNull().default('open'), createdBy: actionByRef('created_by'), ...timestamps,
  dueDate: date('due_date'),
}, table => [uniqueIndex('massar_round_unique').on(table.academicYearId, table.term, table.exam), check('massar_round_status_check', sql`${table.status} in ('open','exported','closed')`)]);
export const massarSheets = pgTable('massar_sheets', {
  id: idField(12), academicYearId: yearRef(), roundId: text('round_id').notNull().references(() => massarRounds.id, { onDelete: 'restrict' }),
  massarClassId: text('massar_class_id').notNull().references(() => massarClasses.id, { onDelete: 'restrict' }),
  massarSubjectId: text('massar_subject_id').notNull().references(() => massarSubjects.id, { onDelete: 'restrict' }),
  teacherAssignmentId: text('teacher_assignment_id').references(() => teacherAssignments.id, { onDelete: 'set null' }),
  // Roster/components belong to the sheet. Imports, transfers and departures
  // affect later sheets, never change the meaning of existing marks.
  roster: jsonb('roster').$type<MassarStudent[]>().notNull(), components: jsonb('components').$type<MassarComponent[]>().notNull(),
  status: text('status').$type<MassarSheetStatus>().notNull().default('not_started'), revision: integer('revision').notNull().default(0),
  teacherUnlocked: boolean('teacher_unlocked').notNull().default(false),
  exportedAt: timestamp('exported_at', { mode: 'string' }), exportHash: text('export_hash'), ...timestamps,
}, table => [uniqueIndex('massar_sheet_unique').on(table.roundId, table.massarClassId, table.massarSubjectId), index('massar_sheet_year_idx').on(table.academicYearId, table.roundId), check('massar_sheet_status_check', sql`${table.status} in ('not_started','in_progress','submitted','exported','changed_after_export')`)]);
export const massarMarks = pgTable('massar_marks', {
  id: idField(12), academicYearId: yearRef(), sheetId: text('sheet_id').notNull().references(() => massarSheets.id, { onDelete: 'restrict' }),
  studentId: text('student_id').notNull().references(() => students.id, { onDelete: 'restrict' }), componentCode: text('component_code').notNull(),
  mark: numeric('mark'), absence: text('absence').$type<MassarAbsence>().notNull().default('none'), updatedBy: actionByRef('updated_by'), ...timestamps,
}, table => [uniqueIndex('massar_mark_unique').on(table.sheetId, table.studentId, table.componentCode), check('massar_mark_check', sql`(${table.mark} is null or ${table.mark} between 0 and 20) and (${table.absence} = 'none' or (${table.absence} = 'justified' and ${table.mark} is null))`)]);

/** A teacher's remark on one student for a grid's subject and Contrôle. An empty remark is no row. */
export const massarRemarks = pgTable('massar_remarks', {
  id: idField(12), academicYearId: yearRef(), sheetId: text('sheet_id').notNull().references(() => massarSheets.id, { onDelete: 'restrict' }),
  studentId: text('student_id').notNull().references(() => students.id, { onDelete: 'restrict' }),
  remark: text('remark').notNull(), updatedBy: actionByRef('updated_by'), ...timestamps,
}, table => [uniqueIndex('massar_remark_unique').on(table.sheetId, table.studentId), check('massar_remark_length', sql`char_length(${table.remark}) between 1 and ${sql.raw(String(MASSAR_REMARK_MAX_LENGTH))}`)]);

/** Only opaque ids are returned to the client; preview contents stay in restricted storage. */
export const massarImports = pgTable('massar_imports', {
  id: text('id').primaryKey(), academicYearId: yearRef(), actorId: actionByRef('actor_id', 'restrict'),
  fileId: text('file_id').notNull(), digest: text('digest').notNull(), expiresAt: timestamp('expires_at', { mode: 'string' }).notNull(),
});
