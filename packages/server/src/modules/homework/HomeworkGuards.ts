import { Policy, CanList, CanRead, CanCreate, CanUpdate, CanDelete, own, join, where, when } from '../../auth';
import { homework, teachers, staff, teacherAssignments } from '../../database/schema';
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

export { Policy, CanList, CanRead, CanCreate, CanUpdate, CanDelete };
