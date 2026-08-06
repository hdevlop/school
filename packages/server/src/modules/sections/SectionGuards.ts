import { Policy, CanList, CanRead, CanCreate, CanUpdate, CanDelete } from '@server/auth';
import { own, join, where } from 'najm-auth';
import { sections, students, teachers, staff, parents, teacherAssignments, studentParents } from '@server/database/schema';

export const Section = own(sections)
  .for('teacher',
    join(sections.id, teacherAssignments.sectionId),
    join(teacherAssignments.teacherId, teachers.id),
    join(teachers.staffId, staff.id),
    where(staff.userId),
  )
  .for('parent',
    join(sections.id, students.sectionId),
    join(students.id, studentParents.studentId),
    join(studentParents.parentId, parents.id),
    where(parents.userId),
  )
  .for('student',
    join(sections.id, students.sectionId),
    where(students.userId),
  );

export { Policy, CanList, CanRead, CanCreate, CanUpdate, CanDelete };
