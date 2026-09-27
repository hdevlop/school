import { usersTable as users } from '../../auth';
import { sql } from 'drizzle-orm';
import { date, index, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

import { attendanceStatusEnum, attendanceTypeEnum, idField, timestamps } from '../../database/shared';
import { students } from '../students/studentSchema';
import { staff } from '../staff/staffSchema';
import { teachers, teacherAssignments } from '../teachers/teacherSchema';
import { sections } from '../sections/sectionSchema';
import { academicYears } from '../academicYears/AcademicYearSchema';

export const attendance = pgTable('attendance', {
  id: idField(),
  type: attendanceTypeEnum('type').notNull().default('student'),
  studentId: text('student_id').references(() => students.id, { onDelete: 'restrict' }),
  staffId: text('staff_id').references(() => staff.id, { onDelete: 'restrict' }),
  teacherId: text('teacher_id').references(() => teachers.id, { onDelete: 'restrict' }),
  teacherAssignmentId: text('teacher_assignment_id').references(() => teacherAssignments.id, { onDelete: 'restrict' }),
  // Denormalized so admin/staff-marked daily attendance (teacherAssignmentId=null)
  // still has a section association. Required for the daily duplicate-check and
  // frontend roster matching to work without joining teacher_assignments.
  sectionId: text('section_id').references(() => sections.id, { onDelete: 'restrict' }),
  academicYearId: text('academic_year_id').references(() => academicYears.id, { onDelete: 'restrict' }),
  date: date('date').notNull(),
  status: attendanceStatusEnum('status').notNull().default('present'),
  notes: text('notes'),
  markedBy: text('marked_by').references(() => users.id),
  lastUpdatedBy: text('last_updated_by').references(() => users.id),
  ...timestamps,
}, (table) => ({
  staffDateUnique: uniqueIndex('attendance_staff_date_unique')
    .on(table.staffId, table.date)
    .where(sql`${table.type} = 'staff'`),
  yearDateIdx: index('attendance_year_date_idx').on(table.academicYearId, table.date),
}));

// Audit trail for attendance status changes. In daily-mode a later teacher
// may correct an earlier record (absent → late when the student arrives
// mid-day); we keep every transition for accountability.
export const attendanceHistory = pgTable('attendance_history', {
  id: idField(),
  attendanceId: text('attendance_id')
    .references(() => attendance.id, { onDelete: 'cascade' })
    .notNull(),
  oldStatus: attendanceStatusEnum('old_status'),
  newStatus: attendanceStatusEnum('new_status').notNull(),
  note: text('note'),
  changedBy: text('changed_by').references(() => users.id),
  changedAt: timestamp('changed_at', { mode: 'string' }).defaultNow(),
});
