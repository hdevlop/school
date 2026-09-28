import { sql, type AnyColumn, type SQL } from 'drizzle-orm';

/** The columns an academic source (an assessment or an exam) is dated and targeted by. */
type DatedAcademicSource = {
  date: AnyColumn;
  academicYearId: AnyColumn;
  sectionIds: AnyColumn;
  teacherAssignmentId: AnyColumn;
};

// A student chosen by `who` occupied a target section on the source's date.
// The current students.section_id projection cannot answer a historical read,
// and a multi-section source can target sections beyond its one assignment.
const placedOn = (source: DatedAcademicSource, who: SQL, throughParent: boolean) => sql`exists (
  select 1 from student_enrollments enrollment
  join student_enrollment_placements placement on placement.enrollment_id = enrollment.id
  join students student on student.id = enrollment.student_id
  ${throughParent ? sql`join student_parents link on link.student_id = student.id
    join parents parent on parent.id = link.parent_id` : sql``}
  where ${who}
    and placement.valid_from <= ${source.date}
    and (placement.valid_to is null or placement.valid_to > ${source.date})
    and (enrollment.left_on is null or enrollment.left_on > ${source.date})
    and (enrollment.academic_year_id = ${source.academicYearId}
      or ${source.academicYearId} is null)
    and coalesce(${source.sectionIds}, jsonb_build_array(
      (select section_id from teacher_assignments where id = ${source.teacherAssignmentId})
    )) @> jsonb_build_array(placement.section_id)
)`;

/** The reader's student (or, for a parent, one of their children) sat in a target section on the source's date. */
export const placedOnSourceDate = (source: DatedAcademicSource, userId: string, parent: boolean) =>
  placedOn(source, parent ? sql`parent.user_id = ${userId}` : sql`student.user_id = ${userId}`, parent);

/** This student sat in a target section on the source's date: the sources that are theirs. */
export const studentPlacedOnSourceDate = (source: DatedAcademicSource, studentId: string) =>
  placedOn(source, sql`student.id = ${studentId}`, false);
