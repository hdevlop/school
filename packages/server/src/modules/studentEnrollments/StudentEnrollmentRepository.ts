import { and, asc, desc, eq, gt, inArray, isNull, lte, or } from 'drizzle-orm';
import { Repository } from '../../najm';
import type { DB } from '../../database/db';
import { classes } from '../classes/classSchema';
import { sections } from '../sections/sectionSchema';
import { students } from '../students/studentSchema';
import { academicYears } from '../academicYears/AcademicYearSchema';
import { studentEnrollmentPlacements, studentEnrollments } from './StudentEnrollmentSchema';

@Repository()
export class StudentEnrollmentRepository {
  declare db: DB;

  async getById(id: string) {
    const [row] = await this.db.select().from(studentEnrollments)
      .where(eq(studentEnrollments.id, id)).limit(1);
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
    return this.db.select({
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
    }).from(studentEnrollments)
      .innerJoin(academicYears, eq(studentEnrollments.academicYearId, academicYears.id))
      .where(eq(studentEnrollments.studentId, studentId))
      .orderBy(desc(academicYears.reportingStartsOn));
  }

  // One enrollment's dated placements, newest first, with class and section names.
  async listNamedPlacements(enrollmentId: string) {
    return this.db.select({
      id: studentEnrollmentPlacements.id,
      classId: studentEnrollmentPlacements.classId,
      className: classes.name,
      sectionId: studentEnrollmentPlacements.sectionId,
      sectionName: sections.name,
      validFrom: studentEnrollmentPlacements.validFrom,
      validTo: studentEnrollmentPlacements.validTo,
      reason: studentEnrollmentPlacements.reason,
    }).from(studentEnrollmentPlacements)
      .innerJoin(classes, eq(studentEnrollmentPlacements.classId, classes.id))
      .innerJoin(sections, eq(studentEnrollmentPlacements.sectionId, sections.id))
      .where(eq(studentEnrollmentPlacements.enrollmentId, enrollmentId))
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
