import { Policy, CanList, CanRead, CanCreate, CanUpdate, CanDelete, own, join, where } from '../../auth';
import { attendance, students, staff, parents, studentParents, teachers, teacherAssignments } from '../../database/schema';

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

// A najm rule is one join chain, so a teacher's other readable rows are
// alternative tokens that AttendanceRepository OR-s with the rule above:
// student attendance in a section the teacher is assigned to, and older
// student rows that carry only the teacher's assignment. Joining students
// first keeps both to student rows, never a colleague's staff attendance.
export const AttendanceInTaughtSection = own(attendance)
  .for('teacher',
    join(attendance.studentId, students.id),
    join(attendance.sectionId, teacherAssignments.sectionId),
    join(teacherAssignments.teacherId, teachers.id),
    join(teachers.staffId, staff.id),
    where(staff.userId),
  );

export const AttendanceUnderOwnAssignment = own(attendance)
  .for('teacher',
    join(attendance.studentId, students.id),
    join(attendance.teacherAssignmentId, teacherAssignments.id),
    join(teacherAssignments.teacherId, teachers.id),
    join(teachers.staffId, staff.id),
    where(staff.userId),
  );

export { Policy, CanList, CanRead, CanCreate, CanUpdate, CanDelete };
