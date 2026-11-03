import { Policy, CanList, CanRead, CanCreate, CanUpdate, CanDelete, own, join, where, when } from '../../auth';
import { students, teachers, staff, parents, teacherAssignments, studentParents, studentEnrollments, studentEnrollmentPlacements } from '../../database/schema';
import { sql, type SQLWrapper } from 'drizzle-orm';
import type { ScopeContext } from '../../auth';
import { managesStudent, managesStudentInYear } from '../staff/floorManagerScope';
import { supervisesStudent, supervisesStudentInYear } from '../staff/supervisorScope';

export const Student = own(students)
  .for('student',
    where(students.userId),
  )
  .for('teacher',
    join(students.id, studentEnrollments.studentId),
    join(studentEnrollments.id, studentEnrollmentPlacements.enrollmentId),
    join(studentEnrollmentPlacements.sectionId, teacherAssignments.sectionId),
    join(teacherAssignments.teacherId, teachers.id),
    join(teachers.staffId, staff.id),
    where(staff.userId),
  )
  .for('parent',
    join(students.id, studentParents.studentId),
    join(studentParents.parentId, parents.id),
    where(parents.userId),
  )
  .for('floor_manager', when((userId: string) => managesStudent(students.id, userId)))
  .for('supervisor', when((userId: string) => supervisesStudent(students.id, userId)));

export { Policy, CanList, CanRead, CanCreate, CanUpdate, CanDelete };

// Shared identity can be readable through any recorded teaching relationship,
// or any placement in a floor manager's class. A year's roster additionally
// requires that relationship in that same year.
export function studentReachedInYear(yearId: string, context?: ScopeContext, placementId?: SQLWrapper) {
  const actor = context?.getUser();
  if (actor?.role === 'floor_manager') return managesStudentInYear(students.id, yearId, actor.id, placementId);
  if (actor?.role === 'supervisor') return supervisesStudentInYear(students.id, yearId, actor.id, placementId);
  if (actor?.role !== 'teacher') return undefined;
  return sql`EXISTS (SELECT 1 FROM student_enrollments e
    JOIN student_enrollment_placements p ON p.enrollment_id = e.id
    JOIN teacher_assignments ta ON ta.section_id = p.section_id
    JOIN teachers t ON t.id = ta.teacher_id JOIN staff s ON s.id = t.staff_id
    WHERE e.student_id = ${students.id} AND e.academic_year_id = ${yearId} AND s.user_id = ${actor.id}
    ${placementId ? sql`AND p.id = ${placementId}` : sql`AND NOT EXISTS (
      SELECT 1 FROM student_enrollment_placements later
      WHERE later.enrollment_id = e.id AND later.valid_from > p.valid_from
    )`})`;
}
