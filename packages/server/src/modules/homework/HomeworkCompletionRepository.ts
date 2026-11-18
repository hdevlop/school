import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import {
  HOMEWORK_MISSED_STATUS_VALUES,
  type HomeworkCompletionEntry, type HomeworkCompletionStatus, type HomeworkMissedStatus, type HomeworkRosterEntry,
} from '@sms/contracts';
import { Repository } from '../../najm';
import { Owned, type OwnedWhere } from '../../auth';
import { DB } from '../../database/db';
import { homework, homeworkCompletions, students, subjects, teacherAssignments, users } from '../../database/schema';
import { inReportingYear } from '../academicYears/academicRecordYear';
import type { ResolvedAcademicYear } from '../academicYears/AcademicYearValidator';
import { Year } from '../academicYears/requestYear';
import { inTargetSectionOnSourceDate } from '../academicSources/placedOnSourceDate';
import { HomeworkCompletion } from './HomeworkGuards';

// The roster row as a plain object type: what the driver's row type accepts.
type RosterRow = { [Key in keyof HomeworkRosterEntry]: HomeworkRosterEntry[Key] };

type Placement ={ sectionId: string; sectionName: string; classId: string; className: string } | null;

// Where the pupil of a follow-up sat on the day the homework was given: one of
// its target sections, by the same rule as the homework's roster.
const placementOnHomeworkDate = sql<Placement>`(
  select jsonb_build_object(
    'sectionId', placed_section.id, 'sectionName', placed_section.name,
    'classId', placed_class.id, 'className', placed_class.name
  )
  from student_enrollments enrollment
  join student_enrollment_placements placement on placement.enrollment_id = enrollment.id
  join sections placed_section on placed_section.id = placement.section_id
  join classes placed_class on placed_class.id = placed_section.class_id
  where enrollment.student_id = ${homeworkCompletions.studentId}
    and ${inTargetSectionOnSourceDate(homework)}
  limit 1
)`;

@Repository()
export class HomeworkCompletionRepository {
  @Year() private readonly year!: ResolvedAcademicYear;
  declare db: DB;
  @Owned(HomeworkCompletion)
  private ownedWhere!: OwnedWhere;

  /**
   * The pupils a homework was given to (those who sat in a target section on
   * its date), with their follow-up when one was recorded. The service reads
   * the homework through ownership first, and only staff reach this.
   */
  async roster(homeworkId: string): Promise<HomeworkRosterEntry[]> {
    const rows = await this.db.execute<RosterRow>(sql`
      select distinct on (student.id)
        student.id as "studentId", student.name as "name", account.image as "image",
        completion.status as "status", completion.note as "note"
      from homework
      join student_enrollments enrollment on true
      join student_enrollment_placements placement on placement.enrollment_id = enrollment.id
      join students student on student.id = enrollment.student_id
      left join users account on account.id = student.user_id
      left join homework_completions completion
        on completion.homework_id = homework.id and completion.student_id = student.id
      where homework.id = ${homeworkId}
        and ${inTargetSectionOnSourceDate(homework)}
      order by student.id`);
    return [...rows].sort((left, right) => left.name.localeCompare(right.name));
  }

  /** Writes each pupil's follow-up; a pupil already recorded gets the new status and remark. */
  async save(homeworkId: string, entries: HomeworkCompletionEntry[], recordedBy: string) {
    if (!entries.length) return;
    await this.db.insert(homeworkCompletions)
      .values(entries.map((entry) => ({
        homeworkId,
        studentId: entry.studentId,
        status: entry.status as HomeworkCompletionStatus,
        note: entry.note || null,
        recordedBy,
      })))
      .onConflictDoUpdate({
        target: [homeworkCompletions.homeworkId, homeworkCompletions.studentId],
        set: {
          status: sql`excluded.status`,
          note: sql`excluded.note`,
          recordedBy: sql`excluded.recorded_by`,
          updatedAt: sql`now()`,
        },
      });
  }

  /**
   * The selected year's missed homework (incomplete or not done) the reader
   * may see, newest first. Year, filter and ownership are one WHERE.
   */
  async missed({ studentId }: { studentId?: string } = {}) {
    const rows = await this.db
      .select({
        id: homeworkCompletions.id,
        status: homeworkCompletions.status,
        note: homeworkCompletions.note,
        homeworkId: homework.id,
        title: homework.title,
        date: homework.date,
        dueOn: homework.dueOn,
        subSubject: homework.subSubject,
        subjectId: subjects.id,
        subjectName: subjects.name,
        studentId: students.id,
        studentName: students.name,
        studentImage: users.image,
        placement: placementOnHomeworkDate,
      })
      .from(homeworkCompletions)
      .innerJoin(homework, eq(homeworkCompletions.homeworkId, homework.id))
      .innerJoin(students, eq(homeworkCompletions.studentId, students.id))
      .leftJoin(users, eq(students.userId, users.id))
      .leftJoin(teacherAssignments, eq(homework.teacherAssignmentId, teacherAssignments.id))
      .leftJoin(subjects, eq(teacherAssignments.subjectId, subjects.id))
      .where(and(
        this.ownedWhere(),
        inReportingYear(homework.academicYearId, homework.date, this.year),
        inArray(homeworkCompletions.status, [...HOMEWORK_MISSED_STATUS_VALUES]),
        studentId ? eq(homeworkCompletions.studentId, studentId) : undefined,
      ))
      .orderBy(desc(homework.date), desc(homeworkCompletions.updatedAt));

    return rows.map((row) => ({
      id: row.id,
      status: row.status as HomeworkMissedStatus,
      note: row.note,
      homeworkId: row.homeworkId,
      title: row.title,
      date: row.date,
      dueOn: row.dueOn,
      subSubject: row.subSubject,
      subject: row.subjectId ? { id: row.subjectId, name: row.subjectName ?? '' } : null,
      student: { id: row.studentId, name: row.studentName, image: row.studentImage ?? null },
      class: row.placement ? { id: row.placement.classId, name: row.placement.className } : null,
      section: row.placement ? { id: row.placement.sectionId, name: row.placement.sectionName } : null,
    }));
  }
}
