import { Policy, CanList, CanRead, CanCreate, CanUpdate, CanDelete, own, join, where, when } from '../../auth';
import { exams, teachers, staff, teacherAssignments } from '../../database/schema';
import { placedOnSourceDate } from '../academicSources/placedOnSourceDate';

export const Exam = own(exams)
  .for('teacher',
    join(exams.teacherAssignmentId, teacherAssignments.id),
    join(teacherAssignments.teacherId, teachers.id),
    join(teachers.staffId, staff.id),
    where(staff.userId),
  );

// A student sees an exam of a section they were placed in on the exam date, and
// a parent their children's; the current section would lose a transferred
// student's past exams and show them the new section's.
export const ExamForPlacedStudent = own(exams)
  .for('student', when((userId: string) => placedOnSourceDate(exams, userId, false)));

export const ExamForPlacedParent = own(exams)
  .for('parent', when((userId: string) => placedOnSourceDate(exams, userId, true)));

export { Policy, CanList, CanRead, CanCreate, CanUpdate, CanDelete };
