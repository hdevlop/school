import { and, asc, count, desc, eq, gte, inArray, isNull, lte, or, sql } from 'drizzle-orm';
import { Repository } from '../../../najm';
import { DB } from '../../../database/db';
import {
  attendance,
  classes,
  disciplineIncidents,
  floorManagerAssignments,
  sections,
  staff,
  students,
  users,
} from '../../../database/schema';
import { managesClass } from '../../staff/floorManagerScope';

// Every read takes the floor manager's user id, or section ids already
// derived from it, so a floor manager only counts the grades they run.
@Repository()
export class FloorManagerDashboardRepository {
  declare db: DB;

  async getManager(userId: string) {
    const [row] = await this.db
      .select({
        id: staff.id,
        name: staff.name,
        image: users.image,
        email: sql<string | null>`COALESCE(${staff.email}, ${users.email})`,
        phone: staff.phone,
        address: staff.address,
      })
      .from(staff)
      .leftJoin(users, eq(staff.userId, users.id))
      .where(eq(staff.userId, userId))
      .limit(1);
    return row ?? null;
  }

  /** The grades an assignment holding `today` names, as `managesGrade` reads them. */
  async getGrades(staffId: string, today: string) {
    const rows = await this.db
      .selectDistinct({ className: floorManagerAssignments.className })
      .from(floorManagerAssignments)
      .where(and(
        eq(floorManagerAssignments.staffId, staffId),
        eq(floorManagerAssignments.status, 'active'),
        or(isNull(floorManagerAssignments.startDate), lte(floorManagerAssignments.startDate, today)),
        or(isNull(floorManagerAssignments.endDate), gte(floorManagerAssignments.endDate, today)),
      ))
      .orderBy(asc(floorManagerAssignments.className));
    return rows.map((row) => row.className);
  }

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
      .where(and(eq(classes.academicYear, academicYear), managesClass(sections.classId, userId)))
      .orderBy(asc(classes.createdAt), asc(classes.name), asc(sections.name));
  }

  /** Student marks per day across the sections. */
  async getAttendanceByDay(sectionIds: string[], from: string, to: string) {
    if (!sectionIds.length) return [];
    return this.db
      .select({
        date: attendance.date,
        total: count(),
        attended: sql<number>`COUNT(*) FILTER (WHERE ${attendance.status} <> 'absent')`.mapWith(Number),
        absent: sql<number>`COUNT(*) FILTER (WHERE ${attendance.status} = 'absent')`.mapWith(Number),
        late: sql<number>`COUNT(*) FILTER (WHERE ${attendance.status} = 'late')`.mapWith(Number),
      })
      .from(attendance)
      .where(and(
        eq(attendance.type, 'student'),
        inArray(attendance.sectionId, sectionIds),
        gte(attendance.date, from),
        lte(attendance.date, to),
      ))
      .groupBy(attendance.date)
      .orderBy(asc(attendance.date));
  }

  /** The same active roster used by getSections' student counts. */
  async getStudentsByGender(sectionIds: string[]) {
    if (!sectionIds.length) return [];
    return this.db
      .select({ gender: students.gender, value: count() })
      .from(students)
      .where(and(inArray(students.sectionId, sectionIds), eq(students.status, 'active')))
      .groupBy(students.gender);
  }

  /**
   * Each student marked absent or late on `date`, once: per-lesson registers
   * can mark a student several times a day, and any absence wins.
   */
  async getMarkedStudents(sectionIds: string[], date: string) {
    if (!sectionIds.length) return [];
    const absent = sql<boolean>`BOOL_OR(${attendance.status} = 'absent')`;
    return this.db
      .select({
        studentId: students.id,
        studentName: students.name,
        image: students.image,
        classId: classes.id,
        className: classes.name,
        sectionId: sections.id,
        sectionName: sections.name,
        status: sql<'absent' | 'late'>`CASE WHEN ${absent} THEN 'absent' ELSE 'late' END`,
      })
      .from(attendance)
      .innerJoin(students, eq(attendance.studentId, students.id))
      .innerJoin(sections, eq(attendance.sectionId, sections.id))
      .innerJoin(classes, eq(sections.classId, classes.id))
      .where(and(
        eq(attendance.type, 'student'),
        inArray(attendance.sectionId, sectionIds),
        eq(attendance.date, date),
        inArray(attendance.status, ['absent', 'late']),
      ))
      .groupBy(students.id, students.name, students.image, classes.id, classes.name, sections.id, sections.name)
      .orderBy(desc(absent), asc(classes.name), asc(sections.name), asc(students.name));
  }

  /** The sections that hold any student mark on `date`. */
  async getRegisteredSectionIds(sectionIds: string[], date: string) {
    if (!sectionIds.length) return [];
    const rows = await this.db
      .selectDistinct({ sectionId: attendance.sectionId })
      .from(attendance)
      .where(and(
        eq(attendance.type, 'student'),
        inArray(attendance.sectionId, sectionIds),
        eq(attendance.date, date),
      ));
    return rows.flatMap((row) => row.sectionId ? [row.sectionId] : []);
  }

  async getOpenIncidents(sectionIds: string[], limit: number) {
    if (!sectionIds.length) return { total: 0, rows: [] };
    const condition = and(
      inArray(disciplineIncidents.sectionId, sectionIds),
      eq(disciplineIncidents.status, 'open'),
    );
    const [[total], rows] = await Promise.all([
      this.db.select({ count: count() }).from(disciplineIncidents).where(condition),
      this.db
        .select({
          id: disciplineIncidents.id,
          studentName: students.name,
          className: classes.name,
          sectionName: sections.name,
          category: disciplineIncidents.category,
          severity: disciplineIncidents.severity,
          incidentAt: disciplineIncidents.incidentAt,
        })
        .from(disciplineIncidents)
        .innerJoin(students, eq(disciplineIncidents.studentId, students.id))
        .innerJoin(sections, eq(disciplineIncidents.sectionId, sections.id))
        .innerJoin(classes, eq(sections.classId, classes.id))
        .where(condition)
        .orderBy(desc(disciplineIncidents.incidentAt))
        .limit(limit),
    ]);
    return { total: Number(total?.count ?? 0), rows };
  }
}
