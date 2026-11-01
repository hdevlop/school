import { and, eq, sql, type SQLWrapper } from 'drizzle-orm';
import { DB } from '../../database/db';
import { classes, sections } from '../../database/schema';
import { Repository } from '../../najm';
import { getBusinessDateOnly } from '../../shared/businessDate';

/**
 * A grade the user runs as floor manager: one of their assignments names it
 * and holds today, as `isCurrentAssignment` reads one. `className` is a class
 * row's name, so every year's class of that grade matches.
 */
export function managesGrade(className: SQLWrapper, userId: string) {
  const today = getBusinessDateOnly();
  return sql`exists (select 1 from floor_manager_assignments managed_grade
    join staff manager on manager.id = managed_grade.staff_id
    where manager.user_id = ${userId}
      and managed_grade.class_name = ${className}
      and managed_grade.status = 'active'
      and (managed_grade.start_date is null or managed_grade.start_date <= ${today})
      and (managed_grade.end_date is null or managed_grade.end_date >= ${today}))`;
}

/** A class of one of the user's grades. */
export function managesClass(classId: SQLWrapper, userId: string) {
  return sql`exists (select 1 from classes managed_class
    where managed_class.id = ${classId} and ${managesGrade(sql`managed_class.name`, userId)})`;
}

/** A section of such a class. */
export function managesSection(sectionId: SQLWrapper, userId: string) {
  return sql`exists (select 1 from sections managed_section
    where managed_section.id = ${sectionId} and ${managesClass(sql`managed_section.class_id`, userId)})`;
}

/**
 * A student placed in such a class in any year: their identity stays readable
 * through any recorded placement, as a teacher's does through any section they
 * taught. A year's roster narrows this with `managesStudentInYear`.
 */
export function managesStudent(studentId: SQLWrapper, userId: string) {
  return sql`exists (select 1 from student_enrollments managed_enrollment
    join student_enrollment_placements managed_placement on managed_placement.enrollment_id = managed_enrollment.id
    where managed_enrollment.student_id = ${studentId}
      and ${managesClass(sql`managed_placement.class_id`, userId)})`;
}

/**
 * The student's placement in `yearId` is in one of the user's classes: the
 * placement given, or else the year's latest.
 */
export function managesStudentInYear(studentId: SQLWrapper, yearId: string, userId: string, placementId?: SQLWrapper) {
  return sql`exists (select 1 from student_enrollments e
    join student_enrollment_placements p on p.enrollment_id = e.id
    where e.student_id = ${studentId} and e.academic_year_id = ${yearId}
      and ${managesClass(sql`p.class_id`, userId)}
      ${placementId ? sql`and p.id = ${placementId}` : sql`and not exists (
        select 1 from student_enrollment_placements later
        where later.enrollment_id = e.id and later.valid_from > p.valid_from
      )`})`;
}

/** Whether a floor manager may act on a class or section a write names. */
@Repository()
export class FloorManagerScopeRepository {
  declare db: DB;

  async managesClass(userId: string, classId: string) {
    const [row] = await this.db.select({ id: classes.id }).from(classes)
      .where(and(eq(classes.id, classId), managesGrade(classes.name, userId)))
      .limit(1);
    return !!row;
  }

  async managesSection(userId: string, sectionId: string) {
    const [row] = await this.db.select({ id: sections.id }).from(sections)
      .where(and(eq(sections.id, sectionId), managesClass(sections.classId, userId)))
      .limit(1);
    return !!row;
  }
}
