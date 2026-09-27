import { sql } from 'drizzle-orm';
import { check, date, index, pgTable, text, uniqueIndex } from 'drizzle-orm/pg-core';
import { actionByRef, idField, timestamps } from '../../database/shared';
import { academicYears } from '../academicYears/AcademicYearSchema';
import { students } from '../students/studentSchema';
import { classes } from '../classes/classSchema';
import { sections } from '../sections/sectionSchema';

export const studentEnrollments = pgTable('student_enrollments', {
  id: idField(10),
  studentId: text('student_id').notNull().references(() => students.id, { onDelete: 'restrict' }),
  academicYearId: text('academic_year_id').notNull().references(() => academicYears.id, { onDelete: 'restrict' }),
  status: text('status').notNull().default('active'),
  enrolledOn: date('enrolled_on').notNull(),
  // Exclusive: the student is no longer enrolled on this date.
  leftOn: date('left_on'),
  createdBy: actionByRef('created_by'),
  updatedBy: actionByRef('updated_by'),
  ...timestamps,
}, (table) => [
  uniqueIndex('student_enrollments_student_year_unique').on(table.studentId, table.academicYearId),
  index('student_enrollments_year_student_idx').on(table.academicYearId, table.studentId),
  check('student_enrollments_dates_check', sql`${table.leftOn} IS NULL OR ${table.leftOn} > ${table.enrolledOn}`),
  check('student_enrollments_status_check', sql`${table.status} IN ('active', 'withdrawn', 'graduated', 'transferred')`),
]);

export const studentEnrollmentPlacements = pgTable('student_enrollment_placements', {
  id: idField(10),
  enrollmentId: text('enrollment_id').notNull().references(() => studentEnrollments.id, { onDelete: 'restrict' }),
  classId: text('class_id').notNull().references(() => classes.id, { onDelete: 'restrict' }),
  sectionId: text('section_id').notNull().references(() => sections.id, { onDelete: 'restrict' }),
  validFrom: date('valid_from').notNull(),
  validTo: date('valid_to'),
  reason: text('reason'),
  actorId: actionByRef('actor_id'),
  ...timestamps,
}, (table) => [
  index('student_placements_enrollment_dates_idx').on(table.enrollmentId, table.validFrom, table.validTo),
  uniqueIndex('student_placements_one_open_unique').on(table.enrollmentId).where(sql`${table.validTo} IS NULL`),
  check('student_placements_dates_check', sql`${table.validTo} IS NULL OR ${table.validTo} > ${table.validFrom}`),
]);
