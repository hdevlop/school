import { Policy, CanList, CanRead, CanCreate, CanUpdate, CanDelete } from '@server/auth';
import { own, join, where } from 'najm-auth';
import { students, teachers, staff, parents, teacherAssignments, studentParents } from '@server/database/schema';

export const Student = own(students)
  .for('student',
    where(students.userId),
  )
  .for('teacher',
    join(students.sectionId, teacherAssignments.sectionId),
    join(teacherAssignments.teacherId, teachers.id),
    join(teachers.staffId, staff.id),
    where(staff.userId),
  )
  .for('parent',
    join(students.id, studentParents.studentId),
    join(studentParents.parentId, parents.id),
    where(parents.userId),
  );

export { Policy, CanList, CanRead, CanCreate, CanUpdate, CanDelete };
