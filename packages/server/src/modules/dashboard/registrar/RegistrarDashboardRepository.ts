import { and, count, eq, ne, sql } from 'drizzle-orm';
import { Repository } from '../../../najm';
import { DB } from '../../../database/db';
import { assessments, classes, exams, grades, subjects, teacherAssignments } from '../../../database/schema';
import { Year } from '../../academicYears/requestYear';
import type { ResolvedAcademicYear } from '../../academicYears/AcademicYearValidator';

// A grade belongs to one test, whose date, total and class it is counted by, so
// a student who changes class later does not move their earlier marks with them.
const total = sql`COALESCE(${assessments.totalMarks}, ${exams.totalMarks})`;
const passing = sql`COALESCE(${assessments.passingMarks}, ${exams.passingMarks})`;
const sourceDate = sql`COALESCE(${assessments.date}, ${exams.date})`;
const sourceAssignment = sql`COALESCE(${assessments.teacherAssignmentId}, ${exams.teacherAssignmentId})`;
const percentage = sql`${grades.marksObtained} * 100.0 / NULLIF(${total}, 0)`;
const average = sql<number>`ROUND(AVG(${percentage}))`.mapWith(Number);

/**
 * School-wide grade totals for the registrar's dashboard. It reads no owned
 * rows into the response: every figure is a count or an average, and the route
 * is limited to the registrar role.
 */
@Repository()
export class RegistrarDashboardRepository {
  @Year() private readonly year!: ResolvedAcademicYear;
  declare db: DB;

  /** Recorded marks of the year that can be read as a share of their test's total. */
  private recordedMarks() {
    return and(eq(grades.academicYearId, this.year.id), eq(grades.status, 'graded'), sql`${total} > 0`);
  }

  async getTotals() {
    const graded = sql`${grades.status} = 'graded' AND ${total} > 0`;
    const [row] = await this.db
      .select({
        recorded: sql<number>`COUNT(*) FILTER (WHERE ${grades.status} = 'graded')`.mapWith(Number),
        pending: sql<number>`COUNT(*) FILTER (WHERE ${grades.status} = 'pending')`.mapWith(Number),
        missed: sql<number>`COUNT(*) FILTER (WHERE ${grades.status} = 'missed')`.mapWith(Number),
        average: sql<number | null>`ROUND(AVG(${percentage}) FILTER (WHERE ${graded}))`.mapWith(Number),
        passRate: sql<number | null>`ROUND(AVG(CASE WHEN ${grades.marksObtained} >= ${passing} THEN 100.0 ELSE 0 END) FILTER (WHERE ${graded}))`.mapWith(Number),
      })
      .from(grades)
      .leftJoin(assessments, eq(grades.assessmentId, assessments.id))
      .leftJoin(exams, eq(grades.examId, exams.id))
      .where(eq(grades.academicYearId, this.year.id));
    return row;
  }

  /** Tests that should have marks by now and have none recorded. */
  async countTestsAwaitingGrades(today: string) {
    const noneRecorded = (source: typeof grades.assessmentId | typeof grades.examId, id: typeof assessments.id | typeof exams.id) => sql`NOT EXISTS (
      SELECT 1 FROM ${grades} WHERE ${source} = ${id} AND ${grades.status} = 'graded'
    )`;
    const [assessmentRow] = await this.db.select({ value: count() }).from(assessments).where(and(
      eq(assessments.academicYearId, this.year.id),
      ne(assessments.status, 'cancelled'),
      sql`${assessments.date} <= ${today}`,
      noneRecorded(grades.assessmentId, assessments.id),
    ));
    const [examRow] = await this.db.select({ value: count() }).from(exams).where(and(
      eq(exams.academicYearId, this.year.id),
      ne(exams.status, 'cancelled'),
      sql`${exams.date} <= ${today}`,
      noneRecorded(grades.examId, exams.id),
    ));
    return (assessmentRow?.value ?? 0) + (examRow?.value ?? 0);
  }

  async getDistribution() {
    const band = sql<string>`CASE
      WHEN ${percentage} < 50 THEN '0-49'
      WHEN ${percentage} < 60 THEN '50-59'
      WHEN ${percentage} < 70 THEN '60-69'
      WHEN ${percentage} < 80 THEN '70-79'
      WHEN ${percentage} < 90 THEN '80-89'
      ELSE '90-100'
    END`;
    return this.db
      .select({ band, count: sql<number>`COUNT(*)`.mapWith(Number) })
      .from(grades)
      .leftJoin(assessments, eq(grades.assessmentId, assessments.id))
      .leftJoin(exams, eq(grades.examId, exams.id))
      .where(this.recordedMarks())
      // By position: the expression binds its own parameters.
      .groupBy(sql`1`);
  }

  async getMonthlyAverages() {
    return this.db
      .select({
        month: sql<string>`LEFT((${sourceDate})::text, 7)`,
        average,
        graded: sql<number>`COUNT(*)`.mapWith(Number),
      })
      .from(grades)
      .leftJoin(assessments, eq(grades.assessmentId, assessments.id))
      .leftJoin(exams, eq(grades.examId, exams.id))
      .where(this.recordedMarks())
      .groupBy(sql`1`);
  }

  async getClassAverages() {
    return this.db
      .select({ id: classes.id, name: classes.name, average, graded: sql<number>`COUNT(*)`.mapWith(Number) })
      .from(grades)
      .leftJoin(assessments, eq(grades.assessmentId, assessments.id))
      .leftJoin(exams, eq(grades.examId, exams.id))
      .innerJoin(teacherAssignments, sql`${teacherAssignments.id} = ${sourceAssignment}`)
      .innerJoin(classes, eq(teacherAssignments.classId, classes.id))
      .where(this.recordedMarks())
      .groupBy(classes.id, classes.name);
  }

  async getSubjectAverages() {
    return this.db
      .select({ id: subjects.id, name: subjects.name, average, graded: sql<number>`COUNT(*)`.mapWith(Number) })
      .from(grades)
      .leftJoin(assessments, eq(grades.assessmentId, assessments.id))
      .leftJoin(exams, eq(grades.examId, exams.id))
      .innerJoin(teacherAssignments, sql`${teacherAssignments.id} = ${sourceAssignment}`)
      .innerJoin(subjects, eq(teacherAssignments.subjectId, subjects.id))
      .where(this.recordedMarks())
      .groupBy(subjects.id, subjects.name);
  }
}
