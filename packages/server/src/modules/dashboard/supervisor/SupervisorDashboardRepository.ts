import { and, asc, eq, gte, inArray, lte, sql } from 'drizzle-orm';
import { Repository } from '../../../najm';
import { DB } from '../../../database/db';
import {
  assessments,
  attendance,
  classes,
  disciplineIncidents,
  exams,
  grades,
  sections,
  staff,
  students,
  users,
  visitRequests,
} from '../../../database/schema';
import { supervisesClass } from '../../staff/supervisorScope';

// The supervisor's sections are the classes assigned to them today, as their
// ownership rules read them; the section-id reads they share with the floor
// manager stay in MonitorDashboardRepository.
@Repository()
export class SupervisorDashboardRepository {
  declare db: DB;

  /** The signed-in account, with its staff record when it has one. */
  async getSupervisor(userId: string) {
    const [row] = await this.db
      .select({
        id: sql<string>`COALESCE(${staff.id}, ${users.id})`,
        name: sql<string>`COALESCE(${staff.name}, ${users.name}, '')`,
        image: users.image,
        gender: staff.gender,
        email: sql<string | null>`COALESCE(${staff.email}, ${users.email})`,
        phone: sql<string | null>`COALESCE(${staff.phone}, ${users.phone})`,
        address: staff.address,
      })
      .from(users)
      .leftJoin(staff, eq(staff.userId, users.id))
      .where(eq(users.id, userId))
      .limit(1);
    return row ?? null;
  }

  /** The sections of the year's assigned classes, in the order the monitor's are listed. */
  async getSections(userId: string, academicYear: string) {
    return this.db
      .select({
        classId: classes.id,
        className: classes.name,
        sectionId: sections.id,
        sectionName: sections.name,
        roomNumber: sections.roomNumber,
        studentCount: sql<number>`(
          SELECT COUNT(*) FROM ${students}
          WHERE ${students.sectionId} = ${sections.id} AND ${students.status} = 'active'
        )`.mapWith(Number),
      })
      .from(sections)
      .innerJoin(classes, eq(sections.classId, classes.id))
      .where(and(eq(classes.academicYear, academicYear), supervisesClass(sections.classId, userId)))
      .orderBy(asc(classes.createdAt), asc(classes.name), asc(sections.name));
  }

  /**
   * Graded marks of the year by the student's class, each as a share of its
   * assessment's or exam's total marks.
   */
  async getGradesByClass(academicYearId: string, sectionIds: string[]) {
    if (!sectionIds.length) return [];
    const total = sql`COALESCE(${assessments.totalMarks}, ${exams.totalMarks})`;
    const passing = sql`COALESCE(${assessments.passingMarks}, ${exams.passingMarks})`;
    return this.db
      .select({
        classId: classes.id,
        className: classes.name,
        average: sql<number>`COALESCE(ROUND(AVG(${grades.marksObtained} * 100.0 / NULLIF(${total}, 0))), 0)`.mapWith(Number),
        passRate: sql<number>`COALESCE(ROUND(AVG(CASE WHEN ${grades.marksObtained} >= ${passing} THEN 100.0 ELSE 0 END)), 0)`.mapWith(Number),
        graded: sql<number>`COUNT(*)`.mapWith(Number),
      })
      .from(grades)
      .innerJoin(students, eq(grades.studentId, students.id))
      .innerJoin(sections, eq(students.sectionId, sections.id))
      .innerJoin(classes, eq(sections.classId, classes.id))
      .leftJoin(assessments, eq(grades.assessmentId, assessments.id))
      .leftJoin(exams, eq(grades.examId, exams.id))
      .where(and(
        eq(grades.academicYearId, academicYearId),
        eq(grades.status, 'graded'),
        inArray(students.sectionId, sectionIds),
        sql`${total} > 0`,
      ))
      .groupBy(classes.id, classes.name, classes.createdAt)
      .orderBy(asc(classes.createdAt), asc(classes.name));
  }

  /** Incidents in the sections reported between two school dates, by local month and severity. */
  async getIncidentsByMonth(sectionIds: string[], from: string, to: string, timeZone: string) {
    if (!sectionIds.length) return [];
    const localDate = sql<string>`TO_CHAR(${disciplineIncidents.incidentAt} AT TIME ZONE ${timeZone}, 'YYYY-MM-DD')`;
    return this.db
      .select({
        month: sql<string>`LEFT(${localDate}, 7)`,
        severity: disciplineIncidents.severity,
        count: sql<number>`COUNT(*)`.mapWith(Number),
      })
      .from(disciplineIncidents)
      .where(and(
        inArray(disciplineIncidents.sectionId, sectionIds),
        gte(localDate, from),
        lte(localDate, to),
      ))
      // By position: the month repeats the time zone parameter, which a
      // second copy of the expression would bind as a different one.
      .groupBy(sql`1`, disciplineIncidents.severity);
  }

  /** Teachers marked absent on a day in the staff register, across the school. */
  async getAbsentTeacherCount(date: string) {
    const [row] = await this.db
      .select({ count: sql<number>`COUNT(*)`.mapWith(Number) })
      .from(attendance)
      .innerJoin(staff, eq(attendance.staffId, staff.id))
      .where(and(
        eq(attendance.type, 'staff'),
        eq(attendance.date, date),
        eq(attendance.status, 'absent'),
        eq(staff.role, 'teacher'),
      ));
    return row?.count ?? 0;
  }

  /** Visit requests no one has contacted yet. */
  async getNewVisitRequestCount() {
    const [row] = await this.db
      .select({ count: sql<number>`COUNT(*)`.mapWith(Number) })
      .from(visitRequests)
      .where(eq(visitRequests.status, 'new'));
    return row?.count ?? 0;
  }
}
