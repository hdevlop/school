import { sql } from 'drizzle-orm';
import { Policy, CanList, CanRead, CanCreate, CanUpdate, CanDelete, own, join, where, when } from '../../auth';
import { grades, students, parents, studentParents } from '../../database/schema';

export const Grade = own(grades)
  .for('parent',
    join(grades.studentId, students.id),
    join(students.id, studentParents.studentId),
    join(studentParents.parentId, parents.id),
    where(parents.userId),
  )
  .for('student',
    join(grades.studentId, students.id),
    where(students.userId),
  )
  .writeBy(grades.studentId);

// A grade has exactly one source; its date and assignment come from it.
const sourceDate = sql`coalesce(
  (select source.date from assessments source where source.id = ${grades.assessmentId}),
  (select source.date from exams source where source.id = ${grades.examId}))`;
const sourceAssignment = sql`coalesce(
  (select source.teacher_assignment_id from assessments source where source.id = ${grades.assessmentId}),
  (select source.teacher_assignment_id from exams source where source.id = ${grades.examId}))`;

/**
 * A teacher reads the grades of their own assessments and exams, and every
 * grade of a student who sat in a section they teach on the grade's source
 * date. The current students.section_id would drop a transferred student's
 * earlier grades and show the new section's teacher history that was not
 * theirs. A student with no dated enrollment at all has only that projection,
 * as grade creation accepts.
 */
const taughtByReader = (userId: string) => sql`exists (
  select 1 from teacher_assignments assignment
  join teachers teacher on teacher.id = assignment.teacher_id
  join staff member on member.id = teacher.staff_id
  where member.user_id = ${userId}
    and (
      assignment.id = ${sourceAssignment}
      or exists (
        select 1 from student_enrollments enrollment
        join student_enrollment_placements placement on placement.enrollment_id = enrollment.id
        where enrollment.student_id = ${grades.studentId}
          and placement.section_id = assignment.section_id
          and placement.valid_from <= ${sourceDate}
          and (placement.valid_to is null or placement.valid_to > ${sourceDate})
          and (enrollment.left_on is null or enrollment.left_on > ${sourceDate})
      )
      or (
        not exists (select 1 from student_enrollments enrollment where enrollment.student_id = ${grades.studentId})
        and exists (select 1 from students student
          where student.id = ${grades.studentId} and student.section_id = assignment.section_id)
      )
    )
)`;

export const GradeForTeacher = own(grades)
  .for('teacher', when((userId: string) => taughtByReader(userId)));

export { Policy, CanList, CanRead, CanCreate, CanUpdate, CanDelete };
