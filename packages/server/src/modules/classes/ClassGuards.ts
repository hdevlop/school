import { Policy, CanList, CanRead, CanCreate, CanUpdate, CanDelete } from '@server/auth';
import { own, join, where } from 'najm-auth';
import { classes, students, teachers, staff, parents, sections, teacherAssignments, studentParents } from '@server/database/schema';

export const Class = own(classes)
  .for('teacher',
    join(classes.id, sections.classId),
    join(sections.id, teacherAssignments.sectionId),
    join(teacherAssignments.teacherId, teachers.id),
    join(teachers.staffId, staff.id),
    where(staff.userId),
  )
  .for('parent',
    join(classes.id, students.classId),
    join(students.id, studentParents.studentId),
    join(studentParents.parentId, parents.id),
    where(parents.userId),
  )
  .for('student',
    join(classes.id, students.classId),
    where(students.userId),
  );

export { Policy, CanList, CanRead, CanCreate, CanUpdate, CanDelete };
