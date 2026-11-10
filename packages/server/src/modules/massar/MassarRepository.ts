import { and, desc, eq, inArray, isNull, lt, lte, ne, notInArray, sql } from 'drizzle-orm';
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
import { examPlanning } from '../examPlanning/ExamPlanningSchema';
import { massarClasses, massarEnrollments, massarImports, massarLevels, massarMarks, massarRounds, massarSheets, massarSubjects, massarYears } from './massarSchema';
import { MassarSheet } from './MassarGuards';
import type { MassarComponent, MassarMark, MassarSheetStatus, MassarStudent } from '@sms/contracts';

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
      this.db.select({ id: students.id, studentCode: students.studentCode, name: students.name, arabicName: students.arabicName, dateOfBirth: students.dateOfBirth, leftOn: studentEnrollments.leftOn, classId: studentEnrollmentPlacements.classId, sectionId: studentEnrollmentPlacements.sectionId }).from(students)
        .innerJoin(studentEnrollments, eq(studentEnrollments.studentId, students.id))
        .leftJoin(studentEnrollmentPlacements, and(eq(studentEnrollmentPlacements.enrollmentId, studentEnrollments.id), sql`not exists (select 1 from student_enrollment_placements later where later.enrollment_id = ${studentEnrollments.id} and later.valid_from > ${studentEnrollmentPlacements.validFrom})`))
        .where(eq(studentEnrollments.academicYearId, academicYearId)),
      this.db.select({ assignment: teacherAssignments, name: staff.name }).from(teacherAssignments).innerJoin(classes, eq(classes.id, teacherAssignments.classId))
        .innerJoin(teachers, eq(teachers.id, teacherAssignments.teacherId)).innerJoin(staff, eq(staff.id, teachers.staffId)).where(eq(classes.academicYear, this.year.label)),
    ]);
    return { year: yearRows[0] ?? null, yearLabel: this.year.label, levels, classes: mappedClasses, subjects: mappedSubjects, enrollments, appClasses, appSections, appSubjects, appStudents, assignments };
  }
  async savePlan(plan: NonNullable<typeof massarYears.$inferInsert['plan']>) { await this.db.update(massarYears).set({ plan }).where(eq(massarYears.academicYearId, this.year.id)); }
  /** The year's Planning, every class: when each Contrôle's exams take place. */
  async planningMonths() { return this.db.select({ classId: examPlanning.classId, months: examPlanning.months }).from(examPlanning).where(eq(examPlanning.academicYearId, this.year.id)); }
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
  /** A subject from the default model: added only where no file brought it, and to confirm. */
  async addModelSubject(data: Omit<typeof massarSubjects.$inferInsert, 'academicYearId' | 'confirmed'>) {
    await this.db.insert(massarSubjects).values({ ...data, academicYearId: this.year.id, confirmed: false }).onConflictDoNothing();
  }
  /** The latest earlier year's confirmed Massar subjects: the school's own starting model for this year. */
  async previousYearSubjects() {
    const [previous] = await this.db.select({ id: academicYears.id }).from(academicYears)
      .where(lt(academicYears.reportingStartsOn, this.year.reportingStartsOn)).orderBy(desc(academicYears.reportingStartsOn)).limit(1);
    if (!previous) return [];
    return this.db.select({ level: massarLevels.code, code: massarSubjects.code, name: massarSubjects.name, components: massarSubjects.components, rounds: massarSubjects.observedRounds }).from(massarSubjects)
      .innerJoin(massarLevels, eq(massarLevels.id, massarSubjects.levelId))
      .where(and(eq(massarSubjects.academicYearId, previous.id), eq(massarSubjects.confirmed, true)));
  }
  /** This year's Massar levels with the subject codes each already has: what the model is compared with. */
  async levelSubjectCodes() {
    const [levels, subjects] = await Promise.all([
      this.db.select({ id: massarLevels.id, code: massarLevels.code }).from(massarLevels).where(eq(massarLevels.academicYearId, this.year.id)),
      this.db.select({ levelId: massarSubjects.levelId, code: massarSubjects.code }).from(massarSubjects).where(eq(massarSubjects.academicYearId, this.year.id)),
    ]);
    return levels.map(level => ({ code: level.code, subjects: new Set(subjects.filter(subject => subject.levelId === level.id).map(subject => subject.code)) }));
  }
  /** A subject's grids still being filled: not sent to Massar, in a Contrôle still open. */
  async subjectOpenSheets(subjectId: string) {
    return this.db.select({ id: massarSheets.id, components: massarSheets.components, term: massarRounds.term, exam: massarRounds.exam, examLabel: massarRounds.examLabel }).from(massarSheets)
      .innerJoin(massarRounds, eq(massarRounds.id, massarSheets.roundId))
      .where(and(eq(massarSheets.academicYearId, this.year.id), eq(massarSheets.massarSubjectId, subjectId), isNull(massarSheets.exportedAt), ne(massarRounds.status, 'closed')));
  }
  /** A class's grids of one subject still open to marks: not sent, in a Contrôle not closed. */
  async openClassSheets(massarClassId: string, massarSubjectId: string) {
    return this.db.select({ id: massarSheets.id, roster: massarSheets.roster, components: massarSheets.components, status: massarSheets.status, term: massarRounds.term, exam: massarRounds.exam }).from(massarSheets)
      .innerJoin(massarRounds, eq(massarRounds.id, massarSheets.roundId))
      .where(and(eq(massarSheets.academicYearId, this.year.id), eq(massarSheets.massarClassId, massarClassId), eq(massarSheets.massarSubjectId, massarSubjectId), isNull(massarSheets.exportedAt), ne(massarRounds.status, 'closed')));
  }
  /** The cells of a grid that hold a mark or a justified absence, with what they hold. */
  async filledCells(sheetId: string) {
    return this.db.select({ studentId: massarMarks.studentId, componentCode: massarMarks.componentCode, mark: massarMarks.mark, absence: massarMarks.absence }).from(massarMarks)
      .where(and(eq(massarMarks.academicYearId, this.year.id), eq(massarMarks.sheetId, sheetId), sql`(${massarMarks.mark} is not null or ${massarMarks.absence} = 'justified')`));
  }
  /** Marks entered on a subject's open grids for parts Massar's file does not have. */
  async marksOutside(subjectId: string, codes: string[]) {
    const [row] = await this.db.select({ count: sql<number>`count(*)::integer` }).from(massarMarks)
      .innerJoin(massarSheets, eq(massarSheets.id, massarMarks.sheetId)).innerJoin(massarRounds, eq(massarRounds.id, massarSheets.roundId))
      .where(and(eq(massarMarks.academicYearId, this.year.id), eq(massarSheets.massarSubjectId, subjectId), isNull(massarSheets.exportedAt), ne(massarRounds.status, 'closed'),
        codes.length ? notInArray(massarMarks.componentCode, codes) : undefined, sql`(${massarMarks.mark} is not null or ${massarMarks.absence} = 'justified')`));
    return row?.count ?? 0;
  }
  /** A grid takes Massar's parts; marks on a part Massar does not have go with it. */
  async replaceSheetComponents(id: string, components: MassarComponent[]) {
    await this.db.delete(massarMarks).where(and(eq(massarMarks.academicYearId, this.year.id), eq(massarMarks.sheetId, id), notInArray(massarMarks.componentCode, components.map(component => component.code))));
    await this.db.update(massarSheets).set({ components, revision: sql`${massarSheets.revision} + 1` }).where(and(eq(massarSheets.academicYearId, this.year.id), eq(massarSheets.id, id)));
  }
  async saveEnrollment(data: Omit<typeof massarEnrollments.$inferInsert, 'academicYearId'>) {
    await this.db.insert(massarEnrollments).values({ ...data, academicYearId: this.year.id }).onConflictDoUpdate({ target: [massarEnrollments.academicYearId, massarEnrollments.studentId], set: data });
  }
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
    return this.db.select({ sheet: massarSheets, cls: massarClasses, subject: massarSubjects, level: massarLevels, round: massarRounds, teacherName: staff.name, teacherId: teacherAssignments.teacherId }).from(massarSheets)
      .innerJoin(massarClasses, eq(massarClasses.id, massarSheets.massarClassId)).innerJoin(massarSubjects, eq(massarSubjects.id, massarSheets.massarSubjectId))
      .innerJoin(massarLevels, eq(massarLevels.id, massarClasses.levelId)).innerJoin(massarRounds, eq(massarRounds.id, massarSheets.roundId))
      .leftJoin(teacherAssignments, eq(teacherAssignments.id, massarSheets.teacherAssignmentId)).leftJoin(teachers, eq(teachers.id, teacherAssignments.teacherId)).leftJoin(staff, eq(staff.id, teachers.staffId));
  }
  async sheets(roundId?: string) {
    return this.sheetQuery().where(and(this.ownedWhere(), eq(massarSheets.academicYearId, this.year.id), roundId ? eq(massarSheets.roundId, roundId) : undefined)).orderBy(massarClasses.name, massarSubjects.code); // Massar's own order: Arabic (0011), French (0012), …
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
        roundId ? eq(massarSheets.roundId, roundId) : undefined, sql`(${massarMarks.mark} is not null or ${massarMarks.absence} = 'justified')`,
        // A student who left the grid keeps their marks, but they no longer count towards it.
        sql`exists (select 1 from jsonb_array_elements(${massarSheets.roster}) as listed where listed->>'id' = ${massarMarks.studentId})`))
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
  async updateDueDate(id: string, dueDate: string | null) { await this.db.update(massarRounds).set({ dueDate }).where(and(eq(massarRounds.academicYearId, this.year.id), eq(massarRounds.id, id))); }
  /**
   * Point every open, unsent sheet at its class's one School assignment for the subject (none when
   * there are zero or several), so assigning a teacher in School reaches Massar with no import.
   * Unscoped on purpose: a teacher's own sheets are found through this link. The revision stays,
   * since who teaches is not the sheet's content and an open draft must still save.
   */
  async relinkTeachers() {
    await this.db.execute(sql`update massar_sheets sheet set teacher_assignment_id = link.assignment_id
      from (select candidate.id as sheet_id,
          (select case when count(*) = 1 then min(assignment.id) end from teacher_assignments assignment
            where assignment.class_id = cls.class_id and assignment.section_id is not distinct from cls.section_id
              and assignment.subject_id = subject.subject_id) as assignment_id
        from massar_sheets candidate
        join massar_classes cls on cls.id = candidate.massar_class_id
        join massar_subjects subject on subject.id = candidate.massar_subject_id
        join massar_rounds round on round.id = candidate.round_id
        where candidate.academic_year_id = ${this.year.id} and round.status <> 'closed' and candidate.exported_at is null) link
      where sheet.id = link.sheet_id and sheet.teacher_assignment_id is distinct from link.assignment_id`);
  }
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
  async activeRoster(classId: string) { return (await this.activeRosters(classId)).get(classId) ?? []; }
  /** Each Massar class's students as a grid lists them, in Massar's order; one class, or all of them. */
  async activeRosters(classId?: string) {
    const rows = await this.db.select({ classId: massarEnrollments.massarClassId, id: students.id, studentCode: students.studentCode, name: massarEnrollments.name, dateOfBirth: massarEnrollments.dateOfBirth, massarStudentId: massarEnrollments.massarStudentId, numeric: massarEnrollments.massarStudentIdNumeric, position: massarEnrollments.position })
      .from(massarEnrollments).innerJoin(students, eq(students.id, massarEnrollments.studentId))
      // A sheet follows the Students view: a student withdrawn there, or no longer enrolled this year, is not on it.
      .innerJoin(studentEnrollments, and(eq(studentEnrollments.studentId, students.id), eq(studentEnrollments.academicYearId, this.year.id), isNull(studentEnrollments.leftOn)))
      .where(and(eq(massarEnrollments.academicYearId, this.year.id), classId ? eq(massarEnrollments.massarClassId, classId) : undefined, isNull(massarEnrollments.leftOn))).orderBy(massarEnrollments.position, students.studentCode);
    const rosters = new Map<string, MassarStudent[]>();
    for (const { classId: owner, numeric, ...row } of rows) {
      const list = rosters.get(owner) ?? [];
      list.push({ ...row, massarStudentId: numeric && row.massarStudentId !== null ? Number(row.massarStudentId) : row.massarStudentId });
      rosters.set(owner, list);
    }
    return rosters;
  }
  /** Every grid of the year with the student list it was given. */
  async sheetRosters() {
    return this.db.select({ id: massarSheets.id, massarClassId: massarSheets.massarClassId, roster: massarSheets.roster, status: massarSheets.status }).from(massarSheets).where(eq(massarSheets.academicYearId, this.year.id));
  }
  /** A grid takes its class's current students; marks stay with each student. */
  async replaceSheetRoster(id: string, roster: MassarStudent[], status?: MassarSheetStatus) {
    await this.db.update(massarSheets).set({ roster, ...(status ? { status } : {}), revision: sql`${massarSheets.revision} + 1` }).where(and(eq(massarSheets.academicYearId, this.year.id), eq(massarSheets.id, id)));
  }
  async clearForSeedReset() {
    for (const table of [massarMarks, massarSheets, massarRounds, massarEnrollments, massarImports, massarSubjects, massarClasses, massarLevels, massarYears]) await this.db.delete(table);
  }
}
