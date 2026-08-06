import { Policy, CanList, CanRead, CanCreate, CanUpdate, CanDelete } from '@server/auth';
import { own, join, where } from 'najm-auth';
import { exams, students, teachers, staff, parents, teacherAssignments, studentParents } from '@server/database/schema';

export const Exam = own(exams)
  .for('teacher',
    join(exams.teacherAssignmentId, teacherAssignments.id),
    join(teacherAssignments.teacherId, teachers.id),
    join(teachers.staffId, staff.id),
    where(staff.userId),
  )
  .for('parent',
    join(exams.teacherAssignmentId, teacherAssignments.id),
    join(teacherAssignments.sectionId, students.sectionId),
    join(students.id, studentParents.studentId),
    join(studentParents.parentId, parents.id),
    where(parents.userId),
  )
  .for('student',
    join(exams.teacherAssignmentId, teacherAssignments.id),
    join(teacherAssignments.sectionId, students.sectionId),
    where(students.userId),
  );

export { Policy, CanList, CanRead, CanCreate, CanUpdate, CanDelete };
