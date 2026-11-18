import { sql } from 'drizzle-orm';
import { Policy, CanList, CanRead, CanCreate, CanUpdate, CanDelete, own, join, where, when } from '../../auth';
import { homework, homeworkCompletions, parents, studentParents, students, teachers, staff, teacherAssignments } from '../../database/schema';
import { placedOnSourceDate, targetsManagedSection } from '../academicSources/placedOnSourceDate';
import { supervisesSection } from '../staff/supervisorScope';

// The same chains as AssessmentGuards: a teacher's own assignment, a
// monitor's or supervisor's classes, and the families of the pupils who sat
// in a target section on the day the homework was given.
export const Homework = own(homework)
  .for('teacher',
    join(homework.teacherAssignmentId, teacherAssignments.id),
    join(teacherAssignments.teacherId, teachers.id),
    join(teachers.staffId, staff.id),
    where(staff.userId),
  )
  .for('monitor', when((userId: string) => targetsManagedSection(homework, userId)))
  .for('supervisor', when((userId: string) => targetsManagedSection(homework, userId, supervisesSection)));

export const HomeworkForPlacedStudent = own(homework)
  .for('student', when((userId: string) => placedOnSourceDate(homework, userId, false)));

export const HomeworkForPlacedParent = own(homework)
  .for('parent', when((userId: string) => placedOnSourceDate(homework, userId, true)));

/**
 * A pupil's follow-up of a homework. Staff read it as they read the homework
 * (a query over it joins `homework`); a family reads its own child's only,
 * never the rest of the class's.
 */
export const HomeworkCompletion = own(homeworkCompletions)
  .for('teacher', when((userId: string) => sql`exists (
    select 1 from teacher_assignments assignment
    join teachers teacher on teacher.id = assignment.teacher_id
    join staff member on member.id = teacher.staff_id
    where assignment.id = ${homework.teacherAssignmentId} and member.user_id = ${userId}
  )`))
  .for('monitor', when((userId: string) => targetsManagedSection(homework, userId)))
  .for('supervisor', when((userId: string) => targetsManagedSection(homework, userId, supervisesSection)))
  .for('parent',
    join(homeworkCompletions.studentId, students.id),
    join(students.id, studentParents.studentId),
    join(studentParents.parentId, parents.id),
    where(parents.userId),
  )
  .for('student',
    join(homeworkCompletions.studentId, students.id),
    where(students.userId),
  );

export { Policy, CanList, CanRead, CanCreate, CanUpdate, CanDelete };
