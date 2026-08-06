import { Policy, CanList, CanRead, CanCreate, CanUpdate, CanDelete } from '@server/auth';
import { own, join, where } from 'najm-auth';
import { parents, students, teachers, staff, teacherAssignments, studentParents } from '@server/database/schema';

export const Parent = own(parents)
  .for('parent',
    where(parents.userId),
  )
  .for('student',
    join(parents.id, studentParents.parentId),
    join(studentParents.studentId, students.id),
    where(students.userId),
  )
  .for('teacher',
    join(parents.id, studentParents.parentId),
    join(studentParents.studentId, students.id),
    join(students.sectionId, teacherAssignments.sectionId),
    join(teacherAssignments.teacherId, teachers.id),
    join(teachers.staffId, staff.id),
    where(staff.userId),
  );

export { Policy, CanList, CanRead, CanCreate, CanUpdate, CanDelete };
