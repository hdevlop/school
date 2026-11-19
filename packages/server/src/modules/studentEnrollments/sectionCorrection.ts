import { sql } from 'drizzle-orm';
import type { DB } from '../../database/db';

/**
 * A pupil's section corrected for a whole school year, with what was
 * recorded under the wrong section following them. Massar is the reference:
 * a pupil Massar lists in a section of the same class sat in it all year, so
 * a placement elsewhere was a mistake, not a move. Used by the Massar import
 * and by the one-off alignment script; both run it inside a transaction.
 */

type Executor = Pick<DB, 'execute'>;

// Arabic letter forms and marks that teachers type both ways (الأعداد / الاعداد),
// spaces and case: two grids name one competency alike once these are dropped.
const MARKS = '[ً-ْـ\\s]+';
const normalized = (column: ReturnType<typeof sql.raw>) =>
  sql`lower(regexp_replace(translate(${column}, 'أإآٱى', 'ااااي'), ${MARKS}, '', 'g'))`;

export type SectionCorrectionCandidate = {
  enrollmentId: string;
  studentId: string;
  studentName: string;
  className: string;
  targetSectionId: string;
  targetSectionName: string;
  /** Where the section comes from: Massar's class list, or the student record when Massar has none. */
  source: 'massar' | 'student';
  wrongSectionIds: string[];
  wrongSectionNames: string[];
  /** A placement in another class: never corrected here, only reported. */
  otherClass: boolean;
};

/**
 * The year's pupils with a placement outside their reference section: the
 * Massar class's section, or the student record's when Massar does not list
 * them (preschool). Left pupils keep their history.
 */
export async function sectionCorrectionCandidates(db: Executor, yearId: string, studentId?: string) {
  const rows = await db.execute<SectionCorrectionCandidate & { wrongSectionIds: string[]; wrongSectionNames: string[] }>(sql`
    with reference as (
      select enrollment.id as enrollment_id, enrollment.student_id,
        coalesce(massar_class.section_id, student.section_id) as target_section_id,
        case when massar_class.section_id is null then 'student' else 'massar' end as source
      from student_enrollments enrollment
      join students student on student.id = enrollment.student_id
      left join massar_enrollments listed on listed.student_id = enrollment.student_id
        and listed.academic_year_id = enrollment.academic_year_id and listed.left_on is null
      left join massar_classes massar_class on massar_class.id = listed.massar_class_id
      where enrollment.academic_year_id = ${yearId} and enrollment.left_on is null
        ${studentId ? sql`and enrollment.student_id = ${studentId}` : sql``}
    )
    select reference.enrollment_id as "enrollmentId", reference.student_id as "studentId",
      student.name as "studentName", target_class.name as "className",
      reference.target_section_id as "targetSectionId", target.name as "targetSectionName",
      reference.source as "source",
      array_agg(distinct placement.section_id) as "wrongSectionIds",
      array_agg(distinct wrong.name) as "wrongSectionNames",
      bool_or(wrong.class_id <> target.class_id) as "otherClass"
    from reference
    join students student on student.id = reference.student_id
    join sections target on target.id = reference.target_section_id
    join classes target_class on target_class.id = target.class_id
    join student_enrollment_placements placement on placement.enrollment_id = reference.enrollment_id
      and placement.section_id <> reference.target_section_id
    join sections wrong on wrong.id = placement.section_id
    group by 1, 2, 3, 4, 5, 6, 7
    order by target_class.name, student.name`);
  return [...rows];
}

export type MovedRecords = {
  attendance: number;
  ratings: number;
  remarks: number;
  incidents: number;
  rewards: number;
  /** Ratings whose competency the right section's grid does not have: left where they are. */
  unmatchedRatings: Array<{ competency: string; subject: string; month: string }>;
  /** Each recreated attendance row: the old id and the new one. */
  replacedAttendance: Array<{ id: string; replacedBy: string }>;
};

const sectionList = (ids: string[]) => sql`array[${sql.join(ids.map((id) => sql`${id}`), sql`, `)}]::text[]`;

/**
 * Marks the pupil has on the wrong sections' tests and exams this year. A test
 * belongs to its section and cannot follow the pupil, so a pupil with any is
 * left for a person; check this before changing anything.
 */
export async function marksInSections(db: Executor, studentId: string, yearId: string, sectionIds: string[]) {
  const [{ count }] = await db.execute<{ count: number }>(sql`
    select count(*)::int as count from grades grade
    left join assessments test on test.id = grade.assessment_id
    left join exams exam on exam.id = grade.exam_id
    join teacher_assignments assignment on assignment.id = coalesce(test.teacher_assignment_id, exam.teacher_assignment_id)
    where grade.student_id = ${studentId} and assignment.section_id = any(${sectionList(sectionIds)})
      and coalesce(test.academic_year_id, exam.academic_year_id, ${yearId}) = ${yearId}`);
  return count;
}

/**
 * Moves the pupil's records of the year from the wrong sections to the right
 * one: attendance, competency ratings (to the same competency of the right
 * section's grid, same subject), teacher remarks, incidents and rewards.
 * Run it after the placements are corrected: a recorded attendance row is
 * accepted only in a section the pupil is placed in on its day.
 */
export async function moveRecordsToSection(db: Executor, input: {
  studentId: string; yearId: string; wrongSectionIds: string[]; targetSectionId: string;
}): Promise<MovedRecords> {
  const { studentId, yearId, targetSectionId } = input;
  const wrong = sectionList(input.wrongSectionIds);

  // A recorded attendance row's section cannot be edited (the database
  // refuses it), so each one is recreated as it was in the right section, its
  // history follows it, and the old row goes. The new id derives from the old
  // one, so the audit can tell which became which.
  const attendance = [...await db.execute<{ id: string; replacedBy: string }>(sql`
    select record.id, 'mv' || substr(md5(record.id || ':' || ${targetSectionId}), 1, 10) as "replacedBy"
    from attendance record
    where record.student_id = ${studentId} and record.section_id = any(${wrong})
      and (record.academic_year_id = ${yearId} or record.academic_year_id is null)`)];
  if (attendance.length) {
    const oldIds = sql.join(attendance.map((row) => sql`${row.id}`), sql`, `);
    await db.execute(sql`
      insert into attendance (id, student_id, teacher_assignment_id, date, status, notes, marked_by, created_at, updated_at,
        type, teacher_id, section_id, last_updated_by, staff_id, academic_year_id, arrival_time)
      select 'mv' || substr(md5(old.id || ':' || ${targetSectionId}), 1, 10), old.student_id,
        (select target_assignment.id from teacher_assignments assignment
          join teacher_assignments target_assignment on target_assignment.section_id = ${targetSectionId}
            and target_assignment.subject_id = assignment.subject_id
          where assignment.id = old.teacher_assignment_id order by target_assignment.id limit 1),
        old.date, old.status, old.notes, old.marked_by, old.created_at, now(),
        old.type, old.teacher_id, ${targetSectionId}, old.last_updated_by, old.staff_id, old.academic_year_id, old.arrival_time
      from attendance old where old.id in (${oldIds})`);
    await db.execute(sql`
      update attendance_history entry set attendance_id = 'mv' || substr(md5(entry.attendance_id || ':' || ${targetSectionId}), 1, 10)
      where entry.attendance_id in (${oldIds})`);
    await db.execute(sql`delete from attendance where id in (${oldIds})`);
  }

  // A rating moves to the competency of the right section's grid that has the
  // same subject and the same name; the domain it sits under may differ.
  const ratings = await db.execute(sql`
    with moves as (
      select rating.id, (
        select target_competency.id from competencies target_competency
        join competency_domains target_domain on target_domain.id = target_competency.domain_id
        join teacher_assignments target_assignment on target_assignment.id = target_domain.teacher_assignment_id
        where target_assignment.section_id = ${targetSectionId}
          and target_assignment.subject_id = assignment.subject_id
          and target_domain.academic_year_id = ${yearId}
          and ${normalized(sql.raw('target_competency.name'))} = ${normalized(sql.raw('competency.name'))}
        order by target_competency.position limit 1
      ) as target_competency_id
      from competency_evaluations rating
      join competencies competency on competency.id = rating.competency_id
      join competency_domains domain on domain.id = competency.domain_id
      join teacher_assignments assignment on assignment.id = domain.teacher_assignment_id
      where rating.student_id = ${studentId} and rating.academic_year_id = ${yearId}
        and assignment.section_id = any(${wrong})
    )
    update competency_evaluations rating set competency_id = moves.target_competency_id, updated_at = now()
    from moves
    where rating.id = moves.id and moves.target_competency_id is not null
      and not exists (select 1 from competency_evaluations taken
        where taken.competency_id = moves.target_competency_id and taken.student_id = rating.student_id and taken.month = rating.month)
    returning rating.id`);

  const unmatched = await db.execute<{ competency: string; subject: string; month: string }>(sql`
    select competency.name as competency, subject.name as subject, rating.month
    from competency_evaluations rating
    join competencies competency on competency.id = rating.competency_id
    join competency_domains domain on domain.id = competency.domain_id
    join teacher_assignments assignment on assignment.id = domain.teacher_assignment_id
    join subjects subject on subject.id = assignment.subject_id
    where rating.student_id = ${studentId} and rating.academic_year_id = ${yearId}
      and assignment.section_id = any(${wrong})
    order by rating.month, competency.name`);

  // The remark of a month belongs to the class's subject: the right section's
  // assignment of that subject, unless it already holds one for that month.
  const remarks = await db.execute(sql`
    update competency_remarks remark set teacher_assignment_id = target_assignment.id, updated_at = now()
    from teacher_assignments assignment, teacher_assignments target_assignment
    where remark.student_id = ${studentId} and remark.academic_year_id = ${yearId}
      and assignment.id = remark.teacher_assignment_id and assignment.section_id = any(${wrong})
      and target_assignment.section_id = ${targetSectionId} and target_assignment.subject_id = assignment.subject_id
      and target_assignment.id = (select first.id from teacher_assignments first
        where first.section_id = ${targetSectionId} and first.subject_id = assignment.subject_id order by first.id limit 1)
      and not exists (select 1 from competency_remarks taken
        where taken.teacher_assignment_id = target_assignment.id and taken.student_id = remark.student_id and taken.month = remark.month)
    returning remark.id`);

  const incidents = await db.execute(sql`
    update discipline_incidents set section_id = ${targetSectionId}, updated_at = now()
    where student_id = ${studentId} and section_id = any(${wrong}) returning id`);
  const rewards = await db.execute(sql`
    update behavior_rewards set section_id = ${targetSectionId}, updated_at = now()
    where student_id = ${studentId} and section_id = any(${wrong}) returning id`);

  return {
    attendance: attendance.length, ratings: ratings.length, remarks: remarks.length,
    incidents: incidents.length, rewards: rewards.length, unmatchedRatings: [...unmatched],
    replacedAttendance: attendance,
  };
}

/**
 * One placement for the whole enrollment, in the right section: the earliest
 * placement keeps its start and takes the latest one's end; the others go.
 * Returns the placements before and after, for the audit.
 */
export async function collapsePlacementsToSection(db: Executor, input: {
  enrollmentId: string; targetSectionId: string; reason: string; actorId: string | null;
}) {
  const before = [...await db.execute<{ id: string; sectionId: string; classId: string; validFrom: string; validTo: string | null }>(sql`
    select id, section_id as "sectionId", class_id as "classId", valid_from::text as "validFrom", valid_to::text as "validTo"
    from student_enrollment_placements where enrollment_id = ${input.enrollmentId} order by valid_from`)];
  if (!before.length) return { before, after: before };
  const [first] = before;
  const last = before[before.length - 1];
  const others = before.slice(1).map((placement) => placement.id);
  if (others.length) {
    await db.execute(sql`delete from student_enrollment_placements
      where id in (${sql.join(others.map((id) => sql`${id}`), sql`, `)})`);
  }
  await db.execute(sql`
    update student_enrollment_placements
    set section_id = ${input.targetSectionId},
      class_id = (select class_id from sections where id = ${input.targetSectionId}),
      valid_to = ${last.validTo}, reason = ${input.reason}, actor_id = ${input.actorId}, updated_at = now()
    where id = ${first.id}`);
  const after = [...await db.execute<{ id: string; sectionId: string; classId: string; validFrom: string; validTo: string | null }>(sql`
    select id, section_id as "sectionId", class_id as "classId", valid_from::text as "validFrom", valid_to::text as "validTo"
    from student_enrollment_placements where enrollment_id = ${input.enrollmentId} order by valid_from`)];
  return { before, after };
}

/** Attendance or marks of the year that no placement of the pupil covers any more: a correction must leave none. */
export async function uncoveredRecords(db: Executor, studentId: string, yearId: string) {
  const [{ count }] = await db.execute<{ count: number }>(sql`
    with records as (
      select a.date as day, a.section_id from attendance a
      where a.student_id = ${studentId} and a.academic_year_id = ${yearId} and a.section_id is not null
      union all
      select coalesce(x.date, t.date), ta.section_id from grades g
      left join exams x on x.id = g.exam_id left join assessments t on t.id = g.assessment_id
      join teacher_assignments ta on ta.id = coalesce(x.teacher_assignment_id, t.teacher_assignment_id)
      where g.student_id = ${studentId} and coalesce(x.academic_year_id, t.academic_year_id) = ${yearId}
    )
    select count(*)::int as count from records r where not exists (
      select 1 from student_enrollments e join student_enrollment_placements p on p.enrollment_id = e.id
      where e.student_id = ${studentId} and e.academic_year_id = ${yearId}
        and p.valid_from <= r.day and (p.valid_to is null or p.valid_to > r.day)
        and p.section_id = r.section_id)`);
  return count;
}
