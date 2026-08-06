import { usersTable as users } from '@server/auth';
import { sql } from 'drizzle-orm';
import { date, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

import { attendanceStatusEnum, attendanceTypeEnum, idField, timestamps } from '@server/database/shared';
import { studentRef } from '../students/studentSchema';
import { staffRef } from '../staff/staffSchema';
import { teacherRef } from '../teachers/teacherSchema';
import { teacherAssignmentRef } from '../teachers/teacherSchema';
import { sectionRef } from '../sections/sectionSchema';

export const attendance = pgTable('attendance', {
  id: idField(),
  type: attendanceTypeEnum('type').notNull().default('student'),
  studentId: studentRef('set null'),
  staffId: staffRef('set null'),
  teacherId: teacherRef('set null'),
  teacherAssignmentId: teacherAssignmentRef('set null'),
  // Denormalized so admin/staff-marked daily attendance (teacherAssignmentId=null)
  // still has a section association. Required for the daily duplicate-check and
  // frontend roster matching to work without joining teacher_assignments.
  sectionId: sectionRef('set null'),
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
