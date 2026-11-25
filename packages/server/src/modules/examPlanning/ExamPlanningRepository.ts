import { and, eq, inArray, isNotNull, sql } from 'drizzle-orm';
import { Repository } from '../../najm';
import { Owned, type OwnedWhere } from '../../auth';
import { DB } from '../../database/db';
import { Class } from '../classes/ClassGuards';
import { classes } from '../classes/classSchema';
import { Year } from '../academicYears/requestYear';
import { academicYears } from '../academicYears/AcademicYearSchema';
import type { ResolvedAcademicYear } from '../academicYears/AcademicYearValidator';
import { examControls, examPlanning } from './ExamPlanningSchema';
import { supervisesClass } from '../staff/supervisorScope';
import { cycles } from '../cycles/cycleSchema';
import { sections } from '../sections/sectionSchema';
import { subjects, subSubjects } from '../subjects/subjectSchema';
import { foldSubjectName } from '@sms/contracts';
import { teacherAssignments, teachers } from '../teachers/teacherSchema';
import { staff } from '../staff/staffSchema';
import { exams } from '../exams/examSchema';
import type { SaveExamPlanningDto } from './ExamPlanningDto';
import type { ExamControl, ExamPlanningClass } from '@sms/contracts';

@Repository()
export class ExamPlanningRepository {
  declare db: DB;
  @Year() private readonly year!: ResolvedAcademicYear;
  @Owned(Class) private ownedWhere!: OwnedWhere;

  async getAll() {
    const rows = await this.db.select({
      id: classes.id, name: classes.name, visible: examPlanning.visible, months: examPlanning.months,
      cycleId: cycles.id, cycleName: cycles.name, cycleLabels: cycles.labels, cycleOrder: cycles.sortOrder,
    })
      .from(classes)
      .leftJoin(examPlanning, and(eq(examPlanning.classId, classes.id), eq(examPlanning.academicYearId, this.year.id)))
      .leftJoin(cycles, eq(cycles.id, classes.cycleId))
      .where(and(this.ownedWhere(), eq(classes.academicYear, this.year.label)))
      .orderBy(classes.createdAt, classes.name);
    return rows.map(({ cycleId, cycleName, cycleLabels, cycleOrder, ...row }) => ({
      ...row, cycle: cycleId && cycleName ? { id: cycleId, name: cycleName, labels: cycleLabels ?? null, order: cycleOrder ?? 0 } : null,
    }));
  }

  async saveMonth(classId: string, data: SaveExamPlanningDto) {
    await this.db.insert(examPlanning).values({ academicYearId: this.year.id, classId, months: { [data.month]: data.entries } })
      .onConflictDoUpdate({
        target: [examPlanning.academicYearId, examPlanning.classId],
        set: { months: sql`jsonb_set(${examPlanning.months}, ARRAY[${data.month}]::text[], ${JSON.stringify(data.entries)}::jsonb, true)`, updatedAt: sql`CURRENT_TIMESTAMP` },
      });
  }

  async saveVisibility(allClassIds: string[], selectedIds: string[]) {
    if (!allClassIds.length) return;
    const selected = new Set(selectedIds);
    // One statement keeps the class settings atomic and preserves every month's topics.
    await this.db.insert(examPlanning).values(allClassIds.map(classId => ({ academicYearId: this.year.id, classId, visible: selected.has(classId) })))
      .onConflictDoUpdate({ target: [examPlanning.academicYearId, examPlanning.classId], set: { visible: sql`excluded.visible`, updatedAt: sql`CURRENT_TIMESTAMP` } });
  }

  async importDocument(classes: ExamPlanningClass[]) {
    // One statement makes the entire import atomic. Merge only the included months.
    await this.db.insert(examPlanning).values(classes.map(cls => ({
      academicYearId: this.year.id, classId: cls.id, visible: cls.visible, months: cls.months,
    }))).onConflictDoUpdate({
      target: [examPlanning.academicYearId, examPlanning.classId],
      set: { visible: sql`excluded.visible`, months: sql`${examPlanning.months} || excluded.months`, updatedAt: sql`CURRENT_TIMESTAMP` },
    });
  }

  async clearContent(classIds: string[]) {
    if (!classIds.length) return;
    await this.db.update(examPlanning).set({ months: {}, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(and(eq(examPlanning.academicYearId, this.year.id), inArray(examPlanning.classId, classIds)));
  }

  /** The subjects this account teaches in each of these classes: what a teacher may plan there. */
  async taughtSubjects(userId: string, classIds: string[]) {
    if (!classIds.length) return [];
    return this.db.selectDistinct({ classId: teacherAssignments.classId, subjectId: teacherAssignments.subjectId })
      .from(teacherAssignments)
      .innerJoin(teachers, eq(teachers.id, teacherAssignments.teacherId))
      .innerJoin(staff, eq(staff.id, teachers.staffId))
      .where(and(eq(staff.userId, userId), inArray(teacherAssignments.classId, classIds)));
  }

  /**
   * What the exam sync needs for these classes. One query after another: the
   * sync runs inside the save's transaction, where parallel queries hang.
   */
  async syncContext(classIds: string[]) {
    if (!classIds.length) return { classes: [], sections: [], assignments: [], subjects: [], subSubjects: [], planned: [] };
    const classRows = await this.db.select({ id: classes.id, level: classes.level, cycle: cycles.name }).from(classes).leftJoin(cycles, eq(cycles.id, classes.cycleId)).where(inArray(classes.id, classIds));
    const sectionRows = await this.db.select({ id: sections.id, classId: sections.classId }).from(sections).where(inArray(sections.classId, classIds));
    const assignmentRows = await this.db.select({ id: teacherAssignments.id, classId: teacherAssignments.classId, sectionId: teacherAssignments.sectionId, subjectId: teacherAssignments.subjectId, teacherId: teacherAssignments.teacherId })
      .from(teacherAssignments).where(inArray(teacherAssignments.classId, classIds));
    const subjectRows = await this.db.select({ id: subjects.id, name: subjects.name, nameAr: subjects.nameAr }).from(subjects).orderBy(subjects.name);
    const partRows = await this.db.select({ id: subSubjects.id, subjectId: subSubjects.subjectId, name: subSubjects.name }).from(subSubjects).orderBy(subSubjects.position, subSubjects.name);
    const planned = await this.db.select({ id: exams.id, planningEntryId: exams.planningEntryId, sectionIds: exams.sectionIds, teacherAssignmentId: exams.teacherAssignmentId, title: exams.title, description: exams.description, date: exams.date, status: exams.status, startTime: exams.startTime, endTime: exams.endTime,
      graded: sql<boolean>`exists (select 1 from grades mark where mark.exam_id = ${exams.id})` })
      .from(exams).innerJoin(teacherAssignments, eq(teacherAssignments.id, exams.teacherAssignmentId))
      .where(and(isNotNull(exams.planningEntryId), inArray(teacherAssignments.classId, classIds)));
    return { classes: classRows, sections: sectionRows, assignments: assignmentRows, subjects: subjectRows, subSubjects: partRows, planned };
  }
  /** A class's subject that has no teacher yet: Planning's exams use it until one is assigned. */
  async createSlot(classId: string, sectionId: string, subjectId: string) {
    const [slot] = await this.db.insert(teacherAssignments).values({ classId, sectionId, subjectId, teacherId: null }).returning({ id: teacherAssignments.id });
    return slot.id;
  }
  async insertExam(values: typeof exams.$inferInsert) { await this.db.insert(exams).values(values); }
  async updateExam(id: string, values: Partial<typeof exams.$inferInsert>) { await this.db.update(exams).set({ ...values, updatedAt: sql`CURRENT_TIMESTAMP` }).where(eq(exams.id, id)); }
  async deleteExams(ids: string[]) { if (ids.length) await this.db.delete(exams).where(inArray(exams.id, ids)); }

  /**
   * A subject or sub-subject renamed in Subjects: Planning finds it by name, so
   * its entries take the new name in every year, and so do the titles of
   * their exams not marked yet. Outside any year scope, like the seed reset.
   */
  async renameEverywhere(renames: Array<{ from: string; to: string }>) {
    if (!renames.length) return;
    const renamed = (name: string) => renames.find(item => foldSubjectName(item.from) === foldSubjectName(name))?.to;
    for (const row of await this.db.select({ id: examPlanning.id, months: examPlanning.months }).from(examPlanning)) {
      let changed = false;
      const months = Object.fromEntries(Object.entries(row.months ?? {}).map(([month, entries]) => [month, entries.map(entry => {
        const to = renamed(entry.subject);
        if (!to || to === entry.subject) return entry;
        changed = true;
        return { ...entry, subject: to };
      })]));
      if (changed) await this.db.update(examPlanning).set({ months, updatedAt: sql`CURRENT_TIMESTAMP` }).where(eq(examPlanning.id, row.id));
    }
    for (const { from, to } of renames) await this.db.update(exams).set({ title: to, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(and(isNotNull(exams.planningEntryId), eq(exams.title, from), sql`not exists (select 1 from grades mark where mark.exam_id = ${exams.id})`));
  }

  /** Every plan of a year not closed, for a change in Subjects; outside any year scope, like the seed reset. */
  async openPlans() {
    return this.db.select({ academicYearId: examPlanning.academicYearId, id: examPlanning.classId, visible: examPlanning.visible, months: examPlanning.months })
      .from(examPlanning).innerJoin(academicYears, eq(academicYears.id, examPlanning.academicYearId))
      .where(sql`${academicYears.status} <> 'closed'`);
  }

  // Seed resets remove plans in every year before deleting the year registry.
  async clearForSeedReset() {
    await this.db.delete(examControls);
    await this.db.delete(examPlanning);
  }

  // Contrôles are the school's: numbered across every class, so these reads are not narrowed to the reader's classes.

  /** The year's saved Contrôles. */
  async storedControls(): Promise<ExamControl[]> {
    const rows = await this.db.select({ id: examControls.id, term: examControls.term, dateFrom: examControls.dateFrom, dateTo: examControls.dateTo, classIds: examControls.classIds, subjectIds: examControls.subjectIds })
      .from(examControls).where(eq(examControls.academicYearId, this.year.id));
    return rows.map(row => ({ ...row, term: row.term === 2 ? 2 : 1, classIds: row.classIds ?? [], subjectIds: row.subjectIds ?? [] }));
  }

  /** Every class's Planning this year, the months Contrôles are read from until one is saved. */
  async yearPlans() {
    return this.db.select({ classId: examPlanning.classId, months: examPlanning.months }).from(examPlanning).where(eq(examPlanning.academicYearId, this.year.id));
  }

  /** Every class of the year. */
  async yearClassIds() {
    return (await this.db.select({ id: classes.id }).from(classes).where(eq(classes.academicYear, this.year.label))).map(row => row.id);
  }

  async insertControls(rows: Array<Omit<ExamControl, 'id' | 'derived'> & { createdBy: string | null }>) {
    if (!rows.length) return [];
    return this.db.insert(examControls).values(rows.map(row => ({ ...row, academicYearId: this.year.id }))).returning({ id: examControls.id });
  }

  async updateControl(id: string, values: Omit<ExamControl, 'id' | 'derived'>) {
    await this.db.update(examControls).set({ ...values, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(and(eq(examControls.id, id), eq(examControls.academicYearId, this.year.id)));
  }

  async deleteControl(id: string) {
    await this.db.delete(examControls).where(and(eq(examControls.id, id), eq(examControls.academicYearId, this.year.id)));
  }

  /** Which of these classes the account supervises today. */
  async supervisedClassIds(userId: string, classIds: readonly string[]) {
    if (!classIds.length) return [];
    return (await this.db.select({ id: classes.id }).from(classes)
      .where(and(inArray(classes.id, [...classIds]), supervisesClass(classes.id, userId)))).map(row => row.id);
  }
}
