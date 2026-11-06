import { Policy, CanList, CanRead, CanCreate, CanUpdate, CanDelete, own, join, where, when } from '../../auth';
import { sections, students, teachers, staff, parents, teacherAssignments, studentParents } from '../../database/schema';
import { managesClass } from '../staff/monitorScope';
import { supervisesClass } from '../staff/supervisorScope';

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
  )
  .for('monitor', when((userId: string) => managesClass(sections.classId, userId)))
  .for('supervisor', when((userId: string) => supervisesClass(sections.classId, userId)));

export { Policy, CanList, CanRead, CanCreate, CanUpdate, CanDelete };
