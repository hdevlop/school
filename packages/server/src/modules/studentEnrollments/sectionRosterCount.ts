import { sql } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import { academicYears } from '../academicYears/AcademicYearSchema';
import { studentEnrollments, studentEnrollmentPlacements } from './StudentEnrollmentSchema';

/** Latest active placement in the section's own year, including historical classes. */
export function sectionRosterCount(sectionId: AnyPgColumn, academicYear: AnyPgColumn) {
  return sql<number>`(select count(distinct e.student_id)::integer
    from ${studentEnrollments} e
    join ${studentEnrollmentPlacements} p on p.enrollment_id = e.id
    join ${academicYears} y on y.id = e.academic_year_id
    where p.section_id = ${sectionId} and y.label = ${academicYear}
      and p.valid_to is null and e.left_on is null and e.status = 'active')`;
}
