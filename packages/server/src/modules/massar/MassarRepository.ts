import { and, eq, inArray, isNull, lte, sql } from 'drizzle-orm';
import { Repository } from '../../najm';
import { Owned, type OwnedWhere } from '../../auth';
import { DB } from '../../database/db';
import { Year } from '../academicYears/requestYear';
import type { ResolvedAcademicYear } from '../academicYears/AcademicYearValidator';
import { academicYears } from '../academicYears/AcademicYearSchema';
import { classes } from '../classes/classSchema';
import { sections } from '../sections/sectionSchema';
import { subjects } from '../subjects/subjectSchema';
import { students } from '../students/studentSchema';
import { studentEnrollments, studentEnrollmentPlacements } from '../studentEnrollments/StudentEnrollmentSchema';
import { staff } from '../staff/staffSchema';
import { teachers, teacherAssignments } from '../teachers/teacherSchema';
import { massarClasses, massarEnrollments, massarImports, massarLevels, massarMarks, massarRounds, massarSheets, massarSubjects, massarYears } from './massarSchema';
import { MassarSheet } from './MassarGuards';
import type { MassarMark } from '@sms/contracts';

@Repository()
export class MassarRepository {
  declare db: DB;
  @Year() private readonly year!: ResolvedAcademicYear;
  @Owned(MassarSheet) private ownedWhere!: OwnedWhere;

  /** All mutations share a year lock, within the service transaction. */
  async lock() { await this.db.select({ id: academicYears.id }).from(academicYears).where(eq(academicYears.id, this.year.id)).for('update'); }

  async setup() {
    const academicYearId = this.year.id;
    const [yearRows, levels, mappedClasses, mappedSubjects, enrollments, appClasses, appSections, appSubjects, appStudents, assignments] = await Promise.all([
      this.db.select().from(massarYears).where(eq(massarYears.academicYearId, academicYearId)),
      this.db.select().from(massarLevels).where(eq(massarLevels.academicYearId, academicYearId)),
      this.db.select().from(massarClasses).where(eq(massarClasses.academicYearId, academicYearId)),
      this.db.select().from(massarSubjects).where(eq(massarSubjects.academicYearId, academicYearId)),
      this.db.select({ enrollment: massarEnrollments, studentCode: students.studentCode }).from(massarEnrollments).innerJoin(students, eq(students.id, massarEnrollments.studentId)).where(eq(massarEnrollments.academicYearId, academicYearId)),
      this.db.select().from(classes).where(eq(classes.academicYear, this.year.label)),
      this.db.select({ id: sections.id, name: sections.name, classId: sections.classId }).from(sections).innerJoin(classes, eq(classes.id, sections.classId)).where(eq(classes.academicYear, this.year.label)),
      this.db.select().from(subjects), // Shared catalog; has no academic year.
      this.db.select({ id: students.id, studentCode: students.studentCode, name: students.name, arabicName: students.arabicName, dateOfBirth: students.dateOfBirth, classId: studentEnrollmentPlacements.classId, sectionId: studentEnrollmentPlacements.sectionId }).from(students)
        .innerJoin(studentEnrollments, eq(studentEnrollments.studentId, students.id))
        .leftJoin(studentEnrollmentPlacements, and(eq(studentEnrollmentPlacements.enrollmentId, studentEnrollments.id), sql`not exists (select 1 from student_enrollment_placements later where later.enrollment_id = ${studentEnrollments.id} and later.valid_from > ${studentEnrollmentPlacements.validFrom})`))
        .where(eq(studentEnrollments.academicYearId, academicYearId)),
      this.db.select({ assignment: teacherAssignments, name: staff.name }).from(teacherAssignments).innerJoin(classes, eq(classes.id, teacherAssignments.classId))
        .innerJoin(teachers, eq(teachers.id, teacherAssignments.teacherId)).innerJoin(staff, eq(staff.id, teachers.staffId)).where(eq(classes.academicYear, this.year.label)),
    ]);
    return { year: yearRows[0] ?? null, yearLabel: this.year.label, levels, classes: mappedClasses, subjects: mappedSubjects, enrollments, appClasses, appSections, appSubjects, appStudents, assignments };
  }
  async yearConfig() { return (await this.db.select().from(massarYears).where(eq(massarYears.academicYearId, this.year.id)))[0]; }
  async subjectForImport(levelId: string, code: string) { return (await this.db.select().from(massarSubjects).where(and(eq(massarSubjects.academicYearId, this.year.id), eq(massarSubjects.levelId, levelId), eq(massarSubjects.code, code))))[0]; }
  async saveYear(data: Omit<typeof massarYears.$inferInsert, 'academicYearId'>) {
    return this.db.insert(massarYears).values({ ...data, academicYearId: this.year.id }).onConflictDoUpdate({ target: massarYears.academicYearId, set: { ...data, importedAt: sql`CURRENT_TIMESTAMP` } });
  }
  async saveLevel(data: Omit<typeof massarLevels.$inferInsert, 'academicYearId'>) {
    const [row] = await this.db.insert(massarLevels).values({ ...data, academicYearId: this.year.id }).onConflictDoUpdate({ target: [massarLevels.academicYearId, massarLevels.code], set: data }).returning(); return row;
  }
  async saveClass(data: Omit<typeof massarClasses.$inferInsert, 'academicYearId'>) {
    const [row] = await this.db.insert(massarClasses).values({ ...data, academicYearId: this.year.id }).onConflictDoUpdate({ target: [massarClasses.academicYearId, massarClasses.name], set: data }).returning(); return row;
  }
  async saveSubject(data: Omit<typeof massarSubjects.$inferInsert, 'academicYearId'>) {
    const [row] = await this.db.insert(massarSubjects).values({ ...data, academicYearId: this.year.id }).onConflictDoUpdate({ target: [massarSubjects.academicYearId, massarSubjects.levelId, massarSubjects.code], set: data }).returning(); return row;
  }
  async saveEnrollment(data: Omit<typeof massarEnrollments.$inferInsert, 'academicYearId'>) {
    await this.db.insert(massarEnrollments).values({ ...data, academicYearId: this.year.id }).onConflictDoUpdate({ target: [massarEnrollments.academicYearId, massarEnrollments.studentId], set: data });
  }
  async leave(id: string, leftOn: string) { return this.db.update(massarEnrollments).set({ leftOn }).where(and(eq(massarEnrollments.academicYearId, this.year.id), eq(massarEnrollments.id, id))).returning(); }
  async createPreview(data: Omit<typeof massarImports.$inferInsert, 'academicYearId'>) { await this.db.insert(massarImports).values({ ...data, academicYearId: this.year.id }); }
  async previewById(id: string, actorId: string) { return (await this.db.select().from(massarImports).where(and(eq(massarImports.academicYearId, this.year.id), eq(massarImports.id, id), eq(massarImports.actorId, actorId))).for('update'))[0]; }
  async consumePreview(id: string) { await this.db.delete(massarImports).where(and(eq(massarImports.academicYearId, this.year.id), eq(massarImports.id, id))); }

  /** Trusted storage maintenance runs across years, without a request/user scope. */
  async storageReferencesForMaintenance() {
    const [previews, templates] = await Promise.all([
      this.db.select().from(massarImports),
      this.db.select({ fileId: massarYears.templateFileId }).from(massarYears),
    ]);
    return { previews, templates };
  }
  async removeExpiredPreviewForMaintenance(id: string, now: string) {
    await this.db.delete(massarImports).where(and(eq(massarImports.id, id), lte(massarImports.expiresAt, now)));
  }
  async expiredPreviewsForMaintenance(now: string) {
    return this.db.select().from(massarImports).where(lte(massarImports.expiresAt, now)).for('update', { skipLocked: true });
  }

  private sheetQuery() {
    return this.db.select({ sheet: massarSheets, cls: massarClasses, subject: massarSubjects, level: massarLevels, round: massarRounds, teacherName: staff.name }).from(massarSheets)
      .innerJoin(massarClasses, eq(massarClasses.id, massarSheets.massarClassId)).innerJoin(massarSubjects, eq(massarSubjects.id, massarSheets.massarSubjectId))
      .innerJoin(massarLevels, eq(massarLevels.id, massarClasses.levelId)).innerJoin(massarRounds, eq(massarRounds.id, massarSheets.roundId))
      .leftJoin(teacherAssignments, eq(teacherAssignments.id, massarSheets.teacherAssignmentId)).leftJoin(teachers, eq(teachers.id, teacherAssignments.teacherId)).leftJoin(staff, eq(staff.id, teachers.staffId));
  }
  async sheets(roundId?: string) {
    return this.sheetQuery().where(and(this.ownedWhere(), eq(massarSheets.academicYearId, this.year.id), roundId ? eq(massarSheets.roundId, roundId) : undefined)).orderBy(massarClasses.name, massarSubjects.name);
  }
  async sheetById(id: string) { return (await this.sheetQuery().where(and(this.ownedWhere(), eq(massarSheets.academicYearId, this.year.id), eq(massarSheets.id, id))))[0]; }
  async marks(sheetId?: string) {
    return this.db.select({ sheetId: massarMarks.sheetId, studentId: massarMarks.studentId, componentCode: massarMarks.componentCode, mark: massarMarks.mark, absence: massarMarks.absence }).from(massarMarks)
      .innerJoin(massarSheets, eq(massarSheets.id, massarMarks.sheetId))
      .where(and(this.ownedWhere(), eq(massarSheets.academicYearId, this.year.id), eq(massarMarks.academicYearId, this.year.id), sheetId ? eq(massarMarks.sheetId, sheetId) : undefined));
  }
  async completedMarkCounts(roundId?: string) {
    return this.db.select({ sheetId: massarMarks.sheetId, completed: sql<number>`count(*)::integer` }).from(massarMarks)
      .innerJoin(massarSheets, eq(massarSheets.id, massarMarks.sheetId))
      .where(and(this.ownedWhere(), eq(massarSheets.academicYearId, this.year.id), eq(massarMarks.academicYearId, this.year.id),
        roundId ? eq(massarSheets.roundId, roundId) : undefined, sql`(${massarMarks.mark} is not null or ${massarMarks.absence} = 'justified')`))
      .groupBy(massarMarks.sheetId);
  }
  async hiddenIds(sheetId: string) {
    const rows = await this.db.select({ studentId: massarEnrollments.studentId, massarStudentId: massarEnrollments.massarStudentId, numeric: massarEnrollments.massarStudentIdNumeric }).from(massarSheets)
      .innerJoin(massarEnrollments, and(eq(massarEnrollments.massarClassId, massarSheets.massarClassId), eq(massarEnrollments.academicYearId, massarSheets.academicYearId)))
      .where(and(this.ownedWhere(), eq(massarSheets.academicYearId, this.year.id), eq(massarSheets.id, sheetId)));
    return rows.map(row => ({ studentId: row.studentId, massarStudentId: row.numeric && row.massarStudentId !== null ? Number(row.massarStudentId) : row.massarStudentId }));
  }
  async rounds() {
    // A limited reader can discover only rounds containing their owned sheets.
    const owned = this.db.select({ id: massarSheets.roundId }).from(massarSheets).where(and(this.ownedWhere(), eq(massarSheets.academicYearId, this.year.id)));
    return this.db.select().from(massarRounds).where(and(eq(massarRounds.academicYearId, this.year.id), inArray(massarRounds.id, owned))).orderBy(massarRounds.term, massarRounds.exam);
  }
  /** Setup and generation are school-wide operations behind manage:massar. */
  async allRoundsForManagement() { return this.db.select().from(massarRounds).where(eq(massarRounds.academicYearId, this.year.id)); }
  async createRound(data: Omit<typeof massarRounds.$inferInsert, 'academicYearId'>) { return (await this.db.insert(massarRounds).values({ ...data, academicYearId: this.year.id }).onConflictDoNothing().returning())[0]; }
  async updateRound(id: string, status: typeof massarRounds.$inferInsert['status']) { await this.db.update(massarRounds).set({ status }).where(and(eq(massarRounds.academicYearId, this.year.id), eq(massarRounds.id, id))); }
  async createSheet(data: Omit<typeof massarSheets.$inferInsert, 'academicYearId'>) { await this.db.insert(massarSheets).values({ ...data, academicYearId: this.year.id }).onConflictDoNothing(); }
  async updateSheet(id: string, data: Partial<Pick<typeof massarSheets.$inferInsert, 'status' | 'exportHash' | 'exportedAt' | 'teacherAssignmentId' | 'teacherUnlocked'>>) {
    return (await this.db.update(massarSheets).set({ ...data, revision: sql`${massarSheets.revision} + 1` }).where(and(eq(massarSheets.academicYearId, this.year.id), eq(massarSheets.id, id))).returning())[0];
  }
  async saveMarks(sheetId: string, marks: MassarMark[], actorId: string) {
    if (!marks.length) return;
    await this.db.insert(massarMarks).values(marks.map(mark => ({ ...mark, mark: mark.mark === null ? null : String(mark.mark), sheetId, academicYearId: this.year.id, updatedBy: actorId }))).onConflictDoUpdate({
      target: [massarMarks.sheetId, massarMarks.studentId, massarMarks.componentCode], set: { mark: sql`excluded.mark`, absence: sql`excluded.absence`, updatedBy: actorId, updatedAt: sql`CURRENT_TIMESTAMP` },
    });
  }
  async activeRoster(classId: string) {
    const rows = await this.db.select({ id: students.id, studentCode: students.studentCode, name: massarEnrollments.name, dateOfBirth: massarEnrollments.dateOfBirth, massarStudentId: massarEnrollments.massarStudentId, numeric: massarEnrollments.massarStudentIdNumeric, position: massarEnrollments.position })
      .from(massarEnrollments).innerJoin(students, eq(students.id, massarEnrollments.studentId)).where(and(eq(massarEnrollments.academicYearId, this.year.id), eq(massarEnrollments.massarClassId, classId), isNull(massarEnrollments.leftOn))).orderBy(massarEnrollments.position, students.studentCode);
    return rows.map(({ numeric, ...row }) => ({ ...row, massarStudentId: numeric && row.massarStudentId !== null ? Number(row.massarStudentId) : row.massarStudentId }));
  }
  async clearForSeedReset() {
    for (const table of [massarMarks, massarSheets, massarRounds, massarEnrollments, massarImports, massarSubjects, massarClasses, massarLevels, massarYears]) await this.db.delete(table);
  }
}
