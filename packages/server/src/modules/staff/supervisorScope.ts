import { and, eq, sql, type SQLWrapper } from 'drizzle-orm';
import { DB } from '../../database/db';
import { classes, sections } from '../../database/schema';
import { Repository } from '../../najm';
import { getBusinessDateOnly } from '../../shared/businessDate';

/** A supervisor's access follows their current assignments to specific class rows. */
export function supervisesClass(classId: SQLWrapper, userId: string) {
  const today = getBusinessDateOnly();
  return sql`exists (select 1 from supervisor_assignments supervised
    join staff supervisor on supervisor.id = supervised.staff_id
    where supervisor.user_id = ${userId} and supervisor.role = 'supervisor'
      and supervised.class_id = ${classId}
      and supervised.status = 'active'
      and (supervised.start_date is null or supervised.start_date <= ${today})
      and (supervised.end_date is null or supervised.end_date >= ${today}))`;
}

export function supervisesSection(sectionId: SQLWrapper, userId: string) {
  return sql`exists (select 1 from sections supervised_section
    where supervised_section.id = ${sectionId} and ${supervisesClass(sql`supervised_section.class_id`, userId)})`;
}

/** Shared identities remain readable through a recorded placement in an assigned class. */
export function supervisesStudent(studentId: SQLWrapper, userId: string) {
  return sql`exists (select 1 from student_enrollments supervised_enrollment
    join student_enrollment_placements supervised_placement on supervised_placement.enrollment_id = supervised_enrollment.id
    where supervised_enrollment.student_id = ${studentId}
      and ${supervisesClass(sql`supervised_placement.class_id`, userId)})`;
}

export function supervisesParent(parentId: SQLWrapper, userId: string) {
  return sql`exists (select 1 from student_parents supervised_link
    join students supervised_student on supervised_student.id = supervised_link.student_id
    where supervised_link.parent_id = ${parentId}
      and ${supervisesClass(sql`supervised_student.class_id`, userId)})`;
}

/** A roster additionally requires the selected year's placement to be assigned. */
export function supervisesStudentInYear(studentId: SQLWrapper, yearId: string, userId: string, placementId?: SQLWrapper) {
  return sql`exists (select 1 from student_enrollments e
    join student_enrollment_placements p on p.enrollment_id = e.id
    where e.student_id = ${studentId} and e.academic_year_id = ${yearId}
      and ${supervisesClass(sql`p.class_id`, userId)}
      ${placementId ? sql`and p.id = ${placementId}` : sql`and not exists (
        select 1 from student_enrollment_placements later
        where later.enrollment_id = e.id and later.valid_from > p.valid_from
      )`})`;
}

@Repository()
export class SupervisorScopeRepository {
  declare db: DB;

  async managesClass(userId: string, classId: string) {
    const [row] = await this.db.select({ id: classes.id }).from(classes)
      .where(and(eq(classes.id, classId), supervisesClass(classes.id, userId))).limit(1);
    return !!row;
  }

  async managesSection(userId: string, sectionId: string) {
    const [row] = await this.db.select({ id: sections.id }).from(sections)
      .where(and(eq(sections.id, sectionId), supervisesClass(sections.classId, userId))).limit(1);
    return !!row;
  }
}
