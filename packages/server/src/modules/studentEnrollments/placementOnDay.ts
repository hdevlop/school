import { and, eq, gt, isNull, lte, or, sql } from 'drizzle-orm';
import type { DB } from '../../database/db';
import { studentEnrollmentPlacements, studentEnrollments, students } from '../../database/schema';
import { occurredInReportingInterval, schoolLocalDay, type ReportingYear } from '../academicYears/academicRecordYear';

/**
 * Where a student was on the school-local day of `at` in `year`: the class and
 * section of the enrollment placement covering that day, or null when there is
 * none (not enrolled that year, already left, or between placements).
 * `inSelectedYear` says whether that day belongs to `year` at all. Undefined
 * when the student does not exist.
 *
 * A dated record (a behavior reward, a discipline incident) is filed under this
 * placement, not the student's current one, so a past-dated record keeps the
 * class of its own day.
 */
export async function studentPlacementOn(db: DB, studentId: string, at: string, year: ReportingYear) {
  const moment = sql`${at}::timestamptz`;
  const day = schoolLocalDay(moment);
  const [student] = await db
    .select({
      id: students.id,
      classId: studentEnrollmentPlacements.classId,
      sectionId: studentEnrollmentPlacements.sectionId,
      inSelectedYear: sql<boolean>`${occurredInReportingInterval(moment, year)}`,
    })
    .from(students)
    .leftJoin(studentEnrollments, and(
      eq(studentEnrollments.studentId, students.id),
      eq(studentEnrollments.academicYearId, year.id),
      or(isNull(studentEnrollments.leftOn), gt(studentEnrollments.leftOn, day)),
    ))
    .leftJoin(studentEnrollmentPlacements, and(
      eq(studentEnrollmentPlacements.enrollmentId, studentEnrollments.id),
      lte(studentEnrollmentPlacements.validFrom, day),
      or(isNull(studentEnrollmentPlacements.validTo), gt(studentEnrollmentPlacements.validTo, day)),
    ))
    .where(eq(students.id, studentId))
    .limit(1);
  return student;
}
