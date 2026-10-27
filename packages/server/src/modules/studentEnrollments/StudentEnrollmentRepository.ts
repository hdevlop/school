import { and, asc, desc, eq, gt, inArray, isNull, lte, or, sql } from 'drizzle-orm';
import { Repository } from '../../najm';
import type { DB } from '../../database/db';
import { classes } from '../classes/classSchema';
import { sections } from '../sections/sectionSchema';
import { students } from '../students/studentSchema';
import { academicYears } from '../academicYears/AcademicYearSchema';
import { studentEnrollmentPlacements, studentEnrollments } from './StudentEnrollmentSchema';
import { Year } from '../academicYears/requestYear';
import type { ResolvedAcademicYear } from '../academicYears/AcademicYearValidator';
import { auditLogs } from '../../database/schema/coreSchema';
import type { CorrectEnrollmentDto } from './StudentEnrollmentDto';
import { usersTable as users } from '../../auth';

// Shared by the single-student and batched reads, so both return one shape.
const historyFields = {
  id: studentEnrollments.id,
  studentId: studentEnrollments.studentId,
  status: studentEnrollments.status,
  enrolledOn: studentEnrollments.enrolledOn,
  leftOn: studentEnrollments.leftOn,
  academicYear: {
    id: academicYears.id,
    label: academicYears.label,
    status: academicYears.status,
    reportingStartsOn: academicYears.reportingStartsOn,
    reportingEndsOn: academicYears.reportingEndsOn,
  },
};
const namedPlacementFields = {
  id: studentEnrollmentPlacements.id,
  classId: studentEnrollmentPlacements.classId,
  className: classes.name,
  sectionId: studentEnrollmentPlacements.sectionId,
  sectionName: sections.name,
  validFrom: studentEnrollmentPlacements.validFrom,
  validTo: studentEnrollmentPlacements.validTo,
  reason: studentEnrollmentPlacements.reason,
  actorId: studentEnrollmentPlacements.actorId,
  actorName: users.name,
  updatedAt: studentEnrollmentPlacements.updatedAt,
};

@Repository()
export class StudentEnrollmentRepository {
  @Year() private readonly year!: ResolvedAcademicYear;
  declare db: DB;

  async getById(id: string, lock = false) {
    const query = this.db.select().from(studentEnrollments)
      .where(and(eq(studentEnrollments.id, id), eq(studentEnrollments.academicYearId, this.year.id))).limit(1);
    const [row] = await (lock ? query.for('update') : query);
    return row ?? null;
  }

  async getByStudentAndYear(studentId: string, academicYearId: string) {
    const [row] = await this.db.select().from(studentEnrollments)
      .where(and(eq(studentEnrollments.studentId, studentId), eq(studentEnrollments.academicYearId, academicYearId)))
      .limit(1);
    return row ?? null;
  }

  // A student's yearly enrollments for the administrator's history, newest
  // year first, each naming its registered year.
  async listHistoryByStudent(studentId: string) {
    return this.db.select(historyFields).from(studentEnrollments)
      .innerJoin(academicYears, eq(studentEnrollments.academicYearId, academicYears.id))
      .where(eq(studentEnrollments.studentId, studentId))
      .orderBy(desc(academicYears.reportingStartsOn));
  }

  /** listHistoryByStudent for many students in one query, each student's rows in the same order. */
  async listHistoryByStudents(studentIds: string[]) {
    if (!studentIds.length) return [];
    return this.db.select(historyFields).from(studentEnrollments)
      .innerJoin(academicYears, eq(studentEnrollments.academicYearId, academicYears.id))
      .where(inArray(studentEnrollments.studentId, studentIds))
      .orderBy(desc(academicYears.reportingStartsOn));
  }

  // One enrollment's dated placements, newest first, with class and section names.
  async listNamedPlacements(enrollmentId: string) {
    return this.db.select(namedPlacementFields).from(studentEnrollmentPlacements)
      .innerJoin(classes, eq(studentEnrollmentPlacements.classId, classes.id))
      .innerJoin(sections, eq(studentEnrollmentPlacements.sectionId, sections.id))
      .leftJoin(users, eq(studentEnrollmentPlacements.actorId, users.id))
      .where(eq(studentEnrollmentPlacements.enrollmentId, enrollmentId))
      .orderBy(desc(studentEnrollmentPlacements.validFrom));
  }

  /** listNamedPlacements for many enrollments in one query, each row naming its enrollment. */
  async listNamedPlacementsByEnrollments(enrollmentIds: string[]) {
    if (!enrollmentIds.length) return [];
    return this.db.select({ enrollmentId: studentEnrollmentPlacements.enrollmentId, ...namedPlacementFields })
      .from(studentEnrollmentPlacements)
      .innerJoin(classes, eq(studentEnrollmentPlacements.classId, classes.id))
      .innerJoin(sections, eq(studentEnrollmentPlacements.sectionId, sections.id))
      .leftJoin(users, eq(studentEnrollmentPlacements.actorId, users.id))
      .where(inArray(studentEnrollmentPlacements.enrollmentId, enrollmentIds))
      .orderBy(desc(studentEnrollmentPlacements.validFrom));
  }

  async listAnnualRoster(academicYearId: string) {
    const rows = await this.db.select({
      studentId: students.id,
      studentName: students.name,
      studentCode: students.studentCode,
      gender: students.gender,
      enrollmentId: studentEnrollments.id,
      enrolledOn: studentEnrollments.enrolledOn,
      leftOn: studentEnrollments.leftOn,
      enrollmentStatus: studentEnrollments.status,
      placementId: studentEnrollmentPlacements.id,
      classId: classes.id,
      className: classes.name,
      sectionId: sections.id,
      sectionName: sections.name,
      validFrom: studentEnrollmentPlacements.validFrom,
      validTo: studentEnrollmentPlacements.validTo,
    }).from(studentEnrollments)
      .innerJoin(students, eq(studentEnrollments.studentId, students.id))
      .leftJoin(studentEnrollmentPlacements, eq(studentEnrollmentPlacements.enrollmentId, studentEnrollments.id))
      .leftJoin(classes, eq(studentEnrollmentPlacements.classId, classes.id))
      .leftJoin(sections, eq(studentEnrollmentPlacements.sectionId, sections.id))
      .where(eq(studentEnrollments.academicYearId, academicYearId))
      .orderBy(students.name, studentEnrollments.id, desc(studentEnrollmentPlacements.validFrom));

    const roster = new Map<string, {
      student: { id: string; name: string; studentCode: string; gender: string | null };
      enrollment: { id: string; enrolledOn: string; leftOn: string | null; status: string };
      lastPlacement: null | {
        id: string; classId: string; className: string; sectionId: string; sectionName: string;
        validFrom: string; validTo: string | null;
      };
    }>();
    for (const row of rows) {
      if (roster.has(row.enrollmentId)) continue;
      roster.set(row.enrollmentId, {
        student: {
          id: row.studentId, name: row.studentName,
          studentCode: row.studentCode, gender: row.gender,
        },
        enrollment: {
          id: row.enrollmentId, enrolledOn: row.enrolledOn,
          leftOn: row.leftOn, status: row.enrollmentStatus,
        },
        lastPlacement: row.placementId && row.classId && row.sectionId
          ? {
            id: row.placementId,
            classId: row.classId, className: row.className!,
            sectionId: row.sectionId, sectionName: row.sectionName!,
            validFrom: row.validFrom!, validTo: row.validTo,
          }
          : null,
      });
    }
    return [...roster.values()];
  }

  async listRosterAtDate(academicYearId: string, date: string) {
    return this.db.select({
      studentId: students.id,
      studentName: students.name,
      studentCode: students.studentCode,
      classId: classes.id,
      className: classes.name,
      sectionId: sections.id,
      sectionName: sections.name,
      enrollmentId: studentEnrollments.id,
      placementId: studentEnrollmentPlacements.id,
    }).from(studentEnrollmentPlacements)
      .innerJoin(studentEnrollments, eq(studentEnrollmentPlacements.enrollmentId, studentEnrollments.id))
      .innerJoin(students, eq(studentEnrollments.studentId, students.id))
      .innerJoin(classes, eq(studentEnrollmentPlacements.classId, classes.id))
      .innerJoin(sections, eq(studentEnrollmentPlacements.sectionId, sections.id))
      .where(and(
        eq(studentEnrollments.academicYearId, academicYearId),
        lte(studentEnrollments.enrolledOn, date),
        or(isNull(studentEnrollments.leftOn), gt(studentEnrollments.leftOn, date)),
        lte(studentEnrollmentPlacements.validFrom, date),
        or(isNull(studentEnrollmentPlacements.validTo), gt(studentEnrollmentPlacements.validTo, date)),
      ))
      .orderBy(classes.name, sections.name, students.name);
  }

  async getStudent(studentId: string) {
    const [row] = await this.db.select({
      id: students.id,
      classId: students.classId,
      sectionId: students.sectionId,
      enrollmentDate: students.enrollmentDate,
      classYear: classes.academicYear,
    }).from(students).leftJoin(classes, eq(students.classId, classes.id))
      .where(eq(students.id, studentId)).limit(1);
    return row ?? null;
  }

  async lockAdmissionDate(studentId: string) {
    await this.db.select({ id: students.id }).from(students).where(eq(students.id, studentId)).for('update');
  }

  async correctAdmissionDate(studentId: string, admissionDate: string, actor: { id: string; role: string }, before: string) {
    await this.db.update(students).set({ enrollmentDate: admissionDate }).where(eq(students.id, studentId));
    await this.db.insert(auditLogs).values({ userId: actor.id, userRole: actor.role, action: 'correct',
      resource: 'students', resourceId: studentId, status: 'success', metadata: {
        academicYearId: this.year.id, reason: 'Admission date restored from imported student file',
        before: { enrollmentDate: before }, after: { enrollmentDate: admissionDate },
      } });
  }

  async listActiveStudentProjections() {
    return this.db.select({
      studentId: students.id,
      classId: students.classId,
      sectionId: students.sectionId,
      classAcademicYear: classes.academicYear,
    }).from(students).leftJoin(classes, eq(students.classId, classes.id))
      .where(eq(students.status, 'active'));
  }

  async hasRecordedPlacement(studentId: string, classId: string, sectionId: string) {
    const [row] = await this.db.select({ id: studentEnrollmentPlacements.id })
      .from(studentEnrollmentPlacements)
      .innerJoin(studentEnrollments, eq(studentEnrollmentPlacements.enrollmentId, studentEnrollments.id))
      .where(and(
        eq(studentEnrollments.studentId, studentId),
        eq(studentEnrollmentPlacements.classId, classId),
        eq(studentEnrollmentPlacements.sectionId, sectionId),
      )).limit(1);
    return Boolean(row);
  }

  /** Whether a dated placement in that class and section was recorded in the named year. */
  async hasConfirmedPlacementInYear(studentId: string, label: string, classId: string, sectionId: string) {
    const [row] = await this.db.select({ id: studentEnrollmentPlacements.id }).from(studentEnrollmentPlacements)
      .innerJoin(studentEnrollments, eq(studentEnrollmentPlacements.enrollmentId, studentEnrollments.id))
      .innerJoin(academicYears, eq(studentEnrollments.academicYearId, academicYears.id))
      .where(and(
        eq(studentEnrollments.studentId, studentId),
        eq(academicYears.label, label),
        eq(studentEnrollmentPlacements.classId, classId),
        eq(studentEnrollmentPlacements.sectionId, sectionId),
      ))
      .limit(1);
    return Boolean(row);
  }

  /**
   * Every dated placement of these students in one year, with the class and
   * section names, for financial summaries that use the record's own date.
   */
  async listYearPlacements(academicYearId: string, studentIds: string[]) {
    if (!studentIds.length) return [];
    return this.db.select({
      studentId: studentEnrollments.studentId,
      enrolledOn: studentEnrollments.enrolledOn,
      leftOn: studentEnrollments.leftOn,
      classId: classes.id,
      className: classes.name,
      sectionId: sections.id,
      sectionName: sections.name,
      validFrom: studentEnrollmentPlacements.validFrom,
      validTo: studentEnrollmentPlacements.validTo,
    }).from(studentEnrollmentPlacements)
      .innerJoin(studentEnrollments, eq(studentEnrollmentPlacements.enrollmentId, studentEnrollments.id))
      .innerJoin(classes, eq(studentEnrollmentPlacements.classId, classes.id))
      .innerJoin(sections, eq(studentEnrollmentPlacements.sectionId, sections.id))
      .where(and(
        eq(studentEnrollments.academicYearId, academicYearId),
        inArray(studentEnrollments.studentId, studentIds),
      ));
  }

  async hasAnyForStudent(studentId: string) {
    const [row] = await this.db.select({ id: studentEnrollments.id }).from(studentEnrollments)
      .where(eq(studentEnrollments.studentId, studentId)).limit(1);
    return Boolean(row);
  }

  async isPlacedInSectionOnDate(studentId: string, sectionId: string, date: string) {
    const [row] = await this.db.select({ id: studentEnrollmentPlacements.id })
      .from(studentEnrollmentPlacements)
      .innerJoin(studentEnrollments, eq(studentEnrollmentPlacements.enrollmentId, studentEnrollments.id))
      .where(and(
        eq(studentEnrollments.studentId, studentId),
        eq(studentEnrollmentPlacements.sectionId, sectionId),
        lte(studentEnrollments.enrolledOn, date),
        or(isNull(studentEnrollments.leftOn), gt(studentEnrollments.leftOn, date)),
        lte(studentEnrollmentPlacements.validFrom, date),
        or(isNull(studentEnrollmentPlacements.validTo), gt(studentEnrollmentPlacements.validTo, date)),
      )).limit(1);
    return Boolean(row);
  }

  async earliestEnrolledOn(studentId: string) {
    const [row] = await this.db.select({ enrolledOn: studentEnrollments.enrolledOn })
      .from(studentEnrollments).where(eq(studentEnrollments.studentId, studentId))
      .orderBy(asc(studentEnrollments.enrolledOn)).limit(1);
    return row?.enrolledOn ?? null;
  }

  async hasAny() {
    const [row] = await this.db.select({ id: studentEnrollments.id }).from(studentEnrollments).limit(1);
    return Boolean(row);
  }

  async getClassAndSection(classId: string, sectionId: string) {
    const [row] = await this.db.select({
      classId: classes.id,
      academicYear: classes.academicYear,
      sectionId: sections.id,
    }).from(classes).innerJoin(sections, eq(sections.classId, classes.id))
      .where(and(eq(classes.id, classId), eq(sections.id, sectionId))).limit(1);
    return row ?? null;
  }

  /** Serializes admissions and capacity changes for one section until commit. */
  async lockSectionCapacity(sectionId: string) {
    const [row] = await this.db.select({
      id: sections.id, name: sections.name, maxStudents: sections.maxStudents, academicYear: classes.academicYear,
    }).from(sections).innerJoin(classes, eq(sections.classId, classes.id))
      // FK checks hold KEY SHARE after inserting a student. NO KEY UPDATE
      // serializes seat reservations without deadlocking those FK checks.
      .where(eq(sections.id, sectionId)).for('no key update', { of: sections });
    return row;
  }

  /** Peak simultaneous occupancy within an exclusive placement interval. */
  async sectionPeakOccupancy(sectionId: string, yearId: string, from: string, until: string, excludeEnrollmentId = '') {
    const rows = await this.db.execute(sql`
      WITH intervals AS (
        SELECT greatest(p.valid_from, e.enrolled_on, ${from}::date) AS starts,
          least(coalesce(p.valid_to, ${until}::date), coalesce(e.left_on, ${until}::date), ${until}::date) AS ends
        FROM student_enrollment_placements p
        JOIN student_enrollments e ON e.id = p.enrollment_id
        WHERE p.section_id = ${sectionId} AND e.academic_year_id = ${yearId}
          AND e.id <> ${excludeEnrollmentId}
      ), events AS (
        SELECT starts AS day, 1 AS delta FROM intervals WHERE starts < ends
        UNION ALL
        SELECT ends AS day, -1 AS delta FROM intervals WHERE starts < ends
      ), occupancy AS (
        SELECT sum(sum(delta)) OVER (ORDER BY day) AS occupied FROM events GROUP BY day
      )
      SELECT coalesce(max(occupied), 0)::integer AS peak FROM occupancy
    `);
    return Number(rows[0]?.peak ?? 0);
  }

  async create(data: typeof studentEnrollments.$inferInsert) {
    const [row] = await this.db.insert(studentEnrollments).values(data).returning();
    return row;
  }

  async addPlacement(data: typeof studentEnrollmentPlacements.$inferInsert) {
    const [row] = await this.db.insert(studentEnrollmentPlacements).values(data).returning();
    return row;
  }

  async getOpenPlacement(enrollmentId: string) {
    const [row] = await this.db.select().from(studentEnrollmentPlacements)
      .where(and(
        eq(studentEnrollmentPlacements.enrollmentId, enrollmentId),
        isNull(studentEnrollmentPlacements.validTo),
      )).limit(1);
    return row ?? null;
  }

  async listPlacements(enrollmentId: string) {
    return this.db.select().from(studentEnrollmentPlacements)
      .where(eq(studentEnrollmentPlacements.enrollmentId, enrollmentId))
      .orderBy(desc(studentEnrollmentPlacements.validFrom));
  }

  async closePlacement(id: string, validTo: string) {
    const [row] = await this.db.update(studentEnrollmentPlacements).set({ validTo })
      .where(eq(studentEnrollmentPlacements.id, id)).returning();
    return row;
  }

  async correct(id: string, data: CorrectEnrollmentDto, actorId: string) {
    await this.db.update(studentEnrollmentPlacements).set({
      classId: data.placement.classId, sectionId: data.placement.sectionId,
      validFrom: data.placement.validFrom, validTo: data.placement.validTo,
      actorId, reason: data.reason,
    }).where(and(eq(studentEnrollmentPlacements.id, data.placement.id),
      eq(studentEnrollmentPlacements.enrollmentId, id)));
    const [row] = await this.db.update(studentEnrollments).set({
      enrolledOn: data.enrolledOn, leftOn: data.leftOn, status: data.status, updatedBy: actorId,
    }).where(and(eq(studentEnrollments.id, id), eq(studentEnrollments.academicYearId, this.year.id))).returning();
    return row;
  }

  // Attendance and grade sources must still have a placement covering their
  // business date and section. A correction never rewrites those records.
  async hasInvalidDatedRecords(studentId: string) {
    const rows = await this.db.execute(sql`
      WITH records AS (
        SELECT a.date AS day, a.section_id AS section_id
        FROM attendance a WHERE a.student_id = ${studentId}
          AND (a.academic_year_id = ${this.year.id} OR
            (a.academic_year_id IS NULL AND a.date BETWEEN ${this.year.reportingStartsOn}::date AND ${this.year.reportingEndsOn}::date))
        UNION ALL
        SELECT COALESCE(x.date, a.date), ta.section_id
        FROM grades g LEFT JOIN exams x ON x.id = g.exam_id
        LEFT JOIN assessments a ON a.id = g.assessment_id
        JOIN teacher_assignments ta ON ta.id = COALESCE(x.teacher_assignment_id, a.teacher_assignment_id)
        WHERE g.student_id = ${studentId}
          AND COALESCE(x.date, a.date) BETWEEN ${this.year.reportingStartsOn}::date AND ${this.year.reportingEndsOn}::date
      )
      SELECT 1 FROM records r WHERE NOT EXISTS (
        SELECT 1 FROM student_enrollments e JOIN student_enrollment_placements p ON p.enrollment_id = e.id
        WHERE e.student_id = ${studentId} AND e.academic_year_id = ${this.year.id}
          AND e.enrolled_on <= r.day AND (e.left_on IS NULL OR e.left_on > r.day)
          AND p.valid_from <= r.day AND (p.valid_to IS NULL OR p.valid_to > r.day)
          AND (r.section_id IS NULL OR p.section_id = r.section_id)
      ) LIMIT 1`);
    return rows.length > 0;
  }

  async auditCorrection(id: string, actorId: string, userRole: string, reason: string, before: unknown, after: unknown) {
    await this.db.insert(auditLogs).values({ userId: actorId, userRole,
      action: 'correct', resource: 'student-enrollments', resourceId: id, status: 'success',
      metadata: { academicYearId: this.year.id, reason, before, after } });
  }

  async endEnrollment(id: string, leftOn: string, status: 'withdrawn' | 'graduated' | 'transferred', actorId: string) {
    const [row] = await this.db.update(studentEnrollments)
      .set({ leftOn, status, updatedBy: actorId })
      .where(eq(studentEnrollments.id, id)).returning();
    return row;
  }

  async updateCurrentStudent(studentId: string, classId: string, sectionId: string, status: 'active' | 'inactive' | 'graduated' | 'transferred') {
    await this.db.update(students).set({ classId, sectionId, status })
      .where(eq(students.id, studentId));
  }

  async updateCurrentStudentStatus(studentId: string, status: 'inactive' | 'graduated') {
    await this.db.update(students).set({ status })
      .where(eq(students.id, studentId));
  }

  async clearForSeedReset() {
    await this.db.delete(studentEnrollmentPlacements);
    await this.db.delete(studentEnrollments);
  }
}
