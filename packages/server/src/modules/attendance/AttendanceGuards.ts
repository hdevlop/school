import { Policy, CanList, CanRead, CanCreate, CanUpdate, CanDelete } from '@server/auth';
import { own, join, where } from 'najm-auth';
import { attendance, students, staff, parents, studentParents } from '@server/database/schema';

export const Attendance = own(attendance)
  .for('teacher',
    join(attendance.staffId, staff.id),
    where(staff.userId),
  )
  .for('parent',
    join(attendance.studentId, students.id),
    join(students.id, studentParents.studentId),
    join(studentParents.parentId, parents.id),
    where(parents.userId),
  )
  .for('student',
    join(attendance.studentId, students.id),
    where(students.userId),
  )
  .writeBy(attendance.studentId);

export { Policy, CanList, CanRead, CanCreate, CanUpdate, CanDelete };
