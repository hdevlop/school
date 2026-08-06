import { Policy, CanList, CanRead, CanCreate, CanUpdate, CanDelete } from '@server/auth';
import { own, join, where } from 'najm-auth';
import { grades, students, teachers, staff, parents, teacherAssignments, studentParents } from '@server/database/schema';

export const Grade = own(grades)
  .for('teacher',
    join(grades.studentId, students.id),
    join(students.sectionId, teacherAssignments.sectionId),
    join(teacherAssignments.teacherId, teachers.id),
    join(teachers.staffId, staff.id),
    where(staff.userId),
  )
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

export { Policy, CanList, CanRead, CanCreate, CanUpdate, CanDelete };
