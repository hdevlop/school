import { sql, type SQL } from 'drizzle-orm';
import { Policy, CanList, CanRead, CanCreate, CanUpdate, CanDelete, own, join, where, when } from '../../auth';
import {
  competencies, competencyDomains, competencyEvaluations, competencyRemarks, parents, staff, studentParents, students, teacherAssignments, teachers,
} from '../../database/schema';
import { managesSection } from '../staff/monitorScope';
import { supervisesSection } from '../staff/supervisorScope';

/** The section a domain's assignment teaches. */
const domainSection = sql`(select assignment.section_id from teacher_assignments assignment
  where assignment.id = ${competencyDomains.teacherAssignmentId})`;

/** The section an evaluation's competency is followed in. */
const evaluationSection = sql`(select assignment.section_id from competencies competency
  join competency_domains domain on domain.id = competency.domain_id
  join teacher_assignments assignment on assignment.id = domain.teacher_assignment_id
  where competency.id = ${competencyEvaluations.competencyId})`;

/**
 * The reader's pupil (or, for a parent, one of their children) sat in the
 * domain's section during the domain's year: a family reads the list the
 * pupil was followed by, and nothing of another class.
 */
function placedInDomainSection(userId: string, throughParent: boolean): SQL {
  return sql`exists (
    select 1 from student_enrollments enrollment
    join student_enrollment_placements placement on placement.enrollment_id = enrollment.id
    join students student on student.id = enrollment.student_id
    ${throughParent ? sql`join student_parents link on link.student_id = student.id
      join parents parent on parent.id = link.parent_id` : sql``}
    where ${throughParent ? sql`parent.user_id = ${userId}` : sql`student.user_id = ${userId}`}
      and enrollment.academic_year_id = ${competencyDomains.academicYearId}
      and placement.section_id = ${domainSection}
  )`;
}

// A teacher builds the list of their own assignment; a monitor or supervisor
// reads that of their classes; a family reads that of the pupil's section.
export const CompetencyDomainOwner = own(competencyDomains)
  .for('teacher',
    join(competencyDomains.teacherAssignmentId, teacherAssignments.id),
    join(teacherAssignments.teacherId, teachers.id),
    join(teachers.staffId, staff.id),
    where(staff.userId),
  )
  .for('monitor', when((userId: string) => managesSection(domainSection, userId)))
  .for('supervisor', when((userId: string) => supervisesSection(domainSection, userId)))
  .for('student', when((userId: string) => placedInDomainSection(userId, false)))
  .for('parent', when((userId: string) => placedInDomainSection(userId, true)));

// A level belongs to its pupil and their family, to the teacher whose list it
// was set in, and to the monitor or supervisor of that section.
export const CompetencyEvaluationOwner = own(competencyEvaluations)
  .for('parent',
    join(competencyEvaluations.studentId, students.id),
    join(students.id, studentParents.studentId),
    join(studentParents.parentId, parents.id),
    where(parents.userId),
  )
  .for('student',
    join(competencyEvaluations.studentId, students.id),
    where(students.userId),
  )
  .for('teacher',
    join(competencyEvaluations.competencyId, competencies.id),
    join(competencies.domainId, competencyDomains.id),
    join(competencyDomains.teacherAssignmentId, teacherAssignments.id),
    join(teacherAssignments.teacherId, teachers.id),
    join(teachers.staffId, staff.id),
    where(staff.userId),
  )
  .for('monitor', when((userId: string) => managesSection(evaluationSection, userId)))
  .for('supervisor', when((userId: string) => supervisesSection(evaluationSection, userId)));

/** The section a remark's assignment teaches. Named in full: a read from one table writes its columns bare. */
const remarkSection = sql`(select assignment.section_id from teacher_assignments assignment
  where assignment.id = "competency_remarks"."teacher_assignment_id")`;

// A remark belongs, like a level, to its pupil and their family, to the
// teacher of the assignment it was written in, and to that section's monitor
// or supervisor.
export const CompetencyRemarkOwner = own(competencyRemarks)
  .for('parent',
    join(competencyRemarks.studentId, students.id),
    join(students.id, studentParents.studentId),
    join(studentParents.parentId, parents.id),
    where(parents.userId),
  )
  .for('student',
    join(competencyRemarks.studentId, students.id),
    where(students.userId),
  )
  .for('teacher',
    join(competencyRemarks.teacherAssignmentId, teacherAssignments.id),
    join(teacherAssignments.teacherId, teachers.id),
    join(teachers.staffId, staff.id),
    where(staff.userId),
  )
  .for('monitor', when((userId: string) => managesSection(remarkSection, userId)))
  .for('supervisor', when((userId: string) => supervisesSection(remarkSection, userId)));

export { Policy, CanList, CanRead, CanCreate, CanUpdate, CanDelete };
