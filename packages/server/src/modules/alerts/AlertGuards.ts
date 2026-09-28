import { and, isNull, sql } from 'drizzle-orm';
import { Policy, CanList, CanRead, CanCreate, CanUpdate, CanDelete, own, join, where, when } from '../../auth';
import { alerts, students, sections, teachers, staff, parents, teacherAssignments, studentParents } from '../../database/schema';

// An alert without an audience: a reminder is for the family (the fee job
// writes those), a system notice is for staff alone, and anything else is for
// everyone around its subject.
const audience = sql`coalesce(${alerts.targetAudience}, case ${alerts.type} when 'reminder' then 'parents' when 'system' then null else 'all' end)`;
const reaches = (group: 'students' | 'parents' | 'teachers') => sql`${audience} in ('all', ${group})`;

// A notice for a class or the whole school rather than about one person. It
// is one shared record, so only staff change its status (see isAboutSomeone).
const aboutNobody = and(isNull(alerts.studentId), isNull(alerts.teacherId), isNull(alerts.teacherAssignmentId))!;

/** An alert about a student reaches the people who can see that student, within its audience. */
export const Alert = own(alerts)
  .for('student',
    join(alerts.studentId, students.id),
    where(students.userId),
    when(reaches('students')),
  )
  .for('parent',
    join(alerts.studentId, students.id),
    join(students.id, studentParents.studentId),
    join(studentParents.parentId, parents.id),
    where(parents.userId),
    when(reaches('parents')),
  )
  .for('teacher',
    join(alerts.studentId, students.id),
    join(students.sectionId, teacherAssignments.sectionId),
    join(teacherAssignments.teacherId, teachers.id),
    join(teachers.staffId, staff.id),
    where(staff.userId),
    when(reaches('teachers')),
  );

// A najm rule is one join chain, so a teacher's other alerts are alternative
// tokens the repository ORs with the rule above: alerts that name the teacher,
// directly or through one of their assignments.
export const AlertForTeacher = own(alerts)
  .for('teacher',
    join(alerts.teacherId, teachers.id),
    join(teachers.staffId, staff.id),
    where(staff.userId),
    when(reaches('teachers')),
  );

export const AlertUnderOwnAssignment = own(alerts)
  .for('teacher',
    join(alerts.teacherAssignmentId, teacherAssignments.id),
    join(teacherAssignments.teacherId, teachers.id),
    join(teachers.staffId, staff.id),
    where(staff.userId),
    when(reaches('teachers')),
  );

/** A class notice reaches the class's students, their parents and its teachers, within its audience. */
export const AlertForClass = own(alerts)
  .for('student',
    join(alerts.classId, students.classId),
    where(students.userId),
    when(aboutNobody, reaches('students')),
  )
  .for('parent',
    join(alerts.classId, students.classId),
    join(students.id, studentParents.studentId),
    join(studentParents.parentId, parents.id),
    where(parents.userId),
    when(aboutNobody, reaches('parents')),
  )
  .for('teacher',
    join(alerts.classId, sections.classId),
    join(sections.id, teacherAssignments.sectionId),
    join(teacherAssignments.teacherId, teachers.id),
    join(teachers.staffId, staff.id),
    where(staff.userId),
    when(aboutNobody, reaches('teachers')),
  );

/** A school notice (no person, no class) reaches its whole audience. */
export const AlertForAudience = own(alerts)
  .for('student', when(aboutNobody, isNull(alerts.classId), reaches('students')))
  .for('parent', when(aboutNobody, isNull(alerts.classId), reaches('parents')))
  .for('teacher', when(aboutNobody, isNull(alerts.classId), reaches('teachers')));

/**
 * Whether an alert names a student, teacher or assignment: the opposite of
 * aboutNobody. Only the person rules above reach such an alert, so a teacher,
 * parent or student who can read one is the person it is about.
 */
export function isAboutSomeone(alert: {
  studentId?: string | null;
  teacherId?: string | null;
  teacherAssignmentId?: string | null;
}) {
  return Boolean(alert.studentId || alert.teacherId || alert.teacherAssignmentId);
}

export { Policy, CanList, CanRead, CanCreate, CanUpdate, CanDelete };
