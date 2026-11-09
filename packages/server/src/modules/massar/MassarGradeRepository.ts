import { and, eq, inArray, isNotNull, ne, sql } from 'drizzle-orm';
import { Repository } from '../../najm';
import { DB } from '../../database/db';
import { Year } from '../academicYears/requestYear';
import type { ResolvedAcademicYear } from '../academicYears/AcademicYearValidator';
import { exams } from '../exams/examSchema';
import { grades } from '../grades/gradeSchema';
import { teacherAssignments } from '../teachers/teacherSchema';
import { examPlanning } from '../examPlanning/ExamPlanningSchema';
import { massarClasses, massarLevels, massarMarks, massarRounds, massarSheets, massarSubjects } from './massarSchema';
import type { MassarMark } from '@sms/contracts';

/**
 * Reads and writes that keep a Massar grid and School's exam grades the same.
 * Unscoped by owner: every call follows a write the caller was already allowed
 * to make, on the grid or on the grade.
 */
@Repository()
export class MassarGradeRepository {
  declare db: DB;
  @Year() private readonly year!: ResolvedAcademicYear;

  async planningMonths() {
    return this.db.select({ classId: examPlanning.classId, months: examPlanning.months }).from(examPlanning).where(eq(examPlanning.academicYearId, this.year.id));
  }
  /** The year's grids, with what places them: School class, section and subject, level, Contrôle. */
  async sheets(filter: { sheetIds?: string[]; classId?: string; sectionId?: string; subjectId?: string } = {}) {
    if (filter.sheetIds && !filter.sheetIds.length) return [];
    return this.db.select({
      id: massarSheets.id, status: massarSheets.status, exportedAt: massarSheets.exportedAt, roster: massarSheets.roster, components: massarSheets.components,
      classId: massarClasses.classId, sectionId: massarClasses.sectionId, subjectId: massarSubjects.subjectId, kind: massarLevels.kind, maxMark: massarLevels.maxMark,
      term: massarRounds.term, exam: massarRounds.exam, roundStatus: massarRounds.status,
    }).from(massarSheets)
      .innerJoin(massarClasses, eq(massarClasses.id, massarSheets.massarClassId)).innerJoin(massarSubjects, eq(massarSubjects.id, massarSheets.massarSubjectId))
      .innerJoin(massarLevels, eq(massarLevels.id, massarClasses.levelId)).innerJoin(massarRounds, eq(massarRounds.id, massarSheets.roundId))
      .where(and(eq(massarSheets.academicYearId, this.year.id), filter.sheetIds ? inArray(massarSheets.id, filter.sheetIds) : undefined,
        filter.classId ? eq(massarClasses.classId, filter.classId) : undefined, filter.sectionId ? eq(massarClasses.sectionId, filter.sectionId) : undefined,
        filter.subjectId ? eq(massarSubjects.subjectId, filter.subjectId) : undefined));
  }
  /** The year's exams that Planning made, still held, with their class, section and subject. */
  async plannedExams(filter: { examIds?: string[]; classId?: string; sectionId?: string; subjectId?: string } = {}) {
    if (filter.examIds && !filter.examIds.length) return [];
    return this.db.select({
      id: exams.id, title: exams.title, date: exams.date, totalMarks: exams.totalMarks,
      classId: teacherAssignments.classId, sectionId: teacherAssignments.sectionId, subjectId: teacherAssignments.subjectId,
    }).from(exams).innerJoin(teacherAssignments, eq(teacherAssignments.id, exams.teacherAssignmentId))
      .where(and(eq(exams.academicYearId, this.year.id), isNotNull(exams.planningEntryId), ne(exams.status, 'cancelled'),
        filter.examIds ? inArray(exams.id, filter.examIds) : undefined, filter.classId ? eq(teacherAssignments.classId, filter.classId) : undefined,
        filter.sectionId ? eq(teacherAssignments.sectionId, filter.sectionId) : undefined, filter.subjectId ? eq(teacherAssignments.subjectId, filter.subjectId) : undefined));
  }
  async marks(sheetIds: string[]) {
    if (!sheetIds.length) return [];
    return this.db.select({ sheetId: massarMarks.sheetId, studentId: massarMarks.studentId, componentCode: massarMarks.componentCode, mark: massarMarks.mark, absence: massarMarks.absence })
      .from(massarMarks).where(and(eq(massarMarks.academicYearId, this.year.id), inArray(massarMarks.sheetId, sheetIds)));
  }
  async grades(examIds: string[]) {
    if (!examIds.length) return [];
    return this.db.select({ id: grades.id, examId: grades.examId, studentId: grades.studentId, marksObtained: grades.marksObtained, status: grades.status })
      .from(grades).where(and(eq(grades.academicYearId, this.year.id), inArray(grades.examId, examIds)));
  }
  async insertGrade(data: { studentId: string; examId: string; marksObtained: string; status: 'graded' | 'missed'; gradedBy: string | null }) {
    await this.db.insert(grades).values({ ...data, academicYearId: this.year.id });
  }
  async updateGrade(id: string, data: { marksObtained: string; status: 'graded' | 'missed'; gradedBy: string | null }) {
    await this.db.update(grades).set(data).where(and(eq(grades.academicYearId, this.year.id), eq(grades.id, id)));
  }
  async deleteGrade(id: string) {
    await this.db.delete(grades).where(and(eq(grades.academicYearId, this.year.id), eq(grades.id, id)));
  }
  async saveMarks(sheetId: string, marks: MassarMark[], actorId: string | null) {
    for (const mark of marks) {
      await this.db.insert(massarMarks).values({ ...mark, mark: mark.mark === null ? null : String(mark.mark), sheetId, academicYearId: this.year.id, updatedBy: actorId }).onConflictDoUpdate({
        target: [massarMarks.sheetId, massarMarks.studentId, massarMarks.componentCode], set: { mark: sql`excluded.mark`, absence: sql`excluded.absence`, updatedBy: actorId, updatedAt: sql`CURRENT_TIMESTAMP` },
      });
    }
  }
  /** A grid changed from Grades: a new revision, so a grid open elsewhere asks to reload before saving over it. */
  async touchSheet(id: string, status: string) {
    await this.db.update(massarSheets).set({ status: status as typeof massarSheets.$inferInsert['status'], revision: sql`${massarSheets.revision} + 1` })
      .where(and(eq(massarSheets.academicYearId, this.year.id), eq(massarSheets.id, id)));
  }
}
