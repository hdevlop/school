import { Policy, CanList, CanRead, CanCreate, CanUpdate, CanDelete, own, join, where, when } from '../../auth';
import { classes, students, teachers, staff, parents, sections, teacherAssignments, studentParents } from '../../database/schema';
import { managesGrade } from '../staff/floorManagerScope';
import { supervisesClass } from '../staff/supervisorScope';

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
  )
  // Every year's classes of the grades they run.
  .for('floor_manager', when((userId: string) => managesGrade(classes.name, userId)))
  .for('supervisor', when((userId: string) => supervisesClass(classes.id, userId)));

export { Policy, CanList, CanRead, CanCreate, CanUpdate, CanDelete };
