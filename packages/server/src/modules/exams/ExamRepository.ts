import { Repository } from '../../najm';
import { Owned } from '../../auth';
import { and, desc, eq, sql, asc, count, gte, inArray, or, type SQL, isNotNull } from 'drizzle-orm';
import { exams, grades, teacherAssignments, teachers, staff, subjects, classes, sections, users } from '../../database/schema';
import { inReportingYear } from '../academicYears/academicRecordYear';
import { Year } from '../academicYears/requestYear';
import type { ResolvedAcademicYear } from '../academicYears/AcademicYearValidator';
import { DB } from '../../database/db';
import { alias } from 'drizzle-orm/pg-core';
import { Exam, ExamForPlacedStudent, ExamForPlacedParent } from './ExamGuards';
import { sourceAssignmentColumns, sourceTeachingColumns } from '../academicSources/academicSourceContext';
import { studentPlacedOnSourceDate } from '../academicSources/placedOnSourceDate';

export type ExamListFilters = {
  sectionId?: string;
  subjectId?: string;
  teacherId?: string;
};

@Owned(Exam, ExamForPlacedStudent, ExamForPlacedParent)
@Repository()
export class ExamRepository {
  @Year() private readonly year!: ResolvedAcademicYear;
  declare db: DB;
  declare ownershipCondition: () => SQL | undefined;

  // An exam belongs to its stored year, else to the year whose reporting interval holds its date.
  private inSelectedYear() {
    return inReportingYear(exams.academicYearId, exams.date, this.year);
  }

  /** What the signed-in reader may see in the selected year, narrowed by a read's own filters. */
  private readCondition(...filters: (SQL | undefined)[]) {
    return and(this.ownershipCondition(), this.inSelectedYear(), ...filters);
  }

  // ========================================
  // QUERY_BUILDERS (Reusable)
  // ========================================

  // Never chain another .where() on this: it would replace the read condition.
  private buildExamQuery(...filters: (SQL | undefined)[]) {
    const teacherUsers = alias(users, 'teacher_users');

    return this.db
      .select({
        id: exams.id,
        academicYearId: exams.academicYearId,
        teacherAssignmentId: exams.teacherAssignmentId,
        title: exams.title,
        description: exams.description,
        type: exams.type,
        date: exams.date,
        startTime: exams.startTime,
        endTime: exams.endTime,
        duration: exams.duration,
        totalMarks: exams.totalMarks,
        passingMarks: exams.passingMarks,
        roomNumber: exams.roomNumber,
        instructions: exams.instructions,
        status: exams.status,
        sectionIds: exams.sectionIds,
        createdAt: exams.createdAt,
        updatedAt: exams.updatedAt,
        subject: {
          id: subjects.id,
          name: subjects.name,
          code: subjects.code,
        },
        teacher: {
          id: teachers.id,
          name: staff.name,
          image: teacherUsers.image,
        },
        class: {
          id: classes.id,
          name: classes.name,
        },
        section: {
          id: sections.id,
          name: sections.name,
        },
      })
      .from(exams)
      .leftJoin(teacherAssignments, eq(exams.teacherAssignmentId, teacherAssignments.id))
      .leftJoin(subjects, eq(teacherAssignments.subjectId, subjects.id))
      .leftJoin(teachers, eq(teacherAssignments.teacherId, teachers.id))
      .leftJoin(staff, eq(teachers.staffId, staff.id))
      .leftJoin(teacherUsers, eq(staff.userId, teacherUsers.id))
      .leftJoin(sections, eq(teacherAssignments.sectionId, sections.id))
      .leftJoin(classes, eq(sections.classId, classes.id))
      .where(this.readCondition(...filters));
  }

  // The year's exams the user may read, optionally for one section, subject or teacher.
  async getAll({ sectionId, subjectId, teacherId }: ExamListFilters = {}) {
    return await this.buildExamQuery(
      sectionId ? or(
        eq(teacherAssignments.sectionId, sectionId),
        sql`EXISTS (
          SELECT 1 FROM jsonb_array_elements_text(COALESCE(${exams.sectionIds}, '[]'::jsonb)) AS target_section_id
          WHERE target_section_id = ${sectionId}
        )`,
      ) : undefined,
      subjectId ? eq(teacherAssignments.subjectId, subjectId) : undefined,
      teacherId ? eq(teacherAssignments.teacherId, teacherId) : undefined,
    )
      .orderBy(desc(exams.date));
  }

  /** One student's exams in the year, from `onOrAfter` when given: those of a section they sat in on the date. */
  async getForStudent(studentId: string, onOrAfter?: string) {
    return await this.buildExamQuery(
      studentPlacedOnSourceDate(exams, studentId),
      onOrAfter ? gte(exams.date, onOrAfter) : undefined,
    )
      .orderBy(asc(exams.date), asc(exams.startTime));
  }

  async getById(id) {
    const [result] = await this.buildExamQuery(eq(exams.id, id))
      .limit(1);

    return result;
  }

  async getByType(type) {
    return await this.buildExamQuery(eq(exams.type, type))
      .orderBy(desc(exams.date));
  }

  async getByStatus(status) {
    return await this.buildExamQuery(eq(exams.status, status))
      .orderBy(desc(exams.date));
  }

  async getByTeacherAssignment(teacherAssignmentId) {
    return await this.buildExamQuery(eq(exams.teacherAssignmentId, teacherAssignmentId))
      .orderBy(desc(exams.date));
  }

  async getTodayExams() {
    const today = new Date().toISOString().split('T')[0];
    return await this.buildExamQuery(eq(exams.date, today))
      .orderBy(asc(exams.startTime));
  }

  async getUpcomingExams() {
    const today = new Date().toISOString().split('T')[0];
    return await this.buildExamQuery(sql`${exams.date} >= ${today}`)
      .orderBy(asc(exams.date), asc(exams.startTime));
  }

  async getCount() {
    const [result] = await this.db
      .select({ count: count() })
      .from(exams)
      .where(this.readCondition());

    return result;
  }

  async create(examData) {
    const [newExam] = await this.db
      .insert(exams)
      .values({ ...examData, academicYearId: this.year.id })
      .returning();

    return await this.getById(newExam.id);
  }

  async update(id, examData) {
    const [updatedExam] = await this.db
      .update(exams)
      .set(examData)
      .where(and(eq(exams.id, id), this.inSelectedYear()))
      .returning();

    return updatedExam;
  }

  async delete(id) {
    const [deletedExam] = await this.db
      .delete(exams)
      .where(and(eq(exams.id, id), this.inSelectedYear()))
      .returning();

    return deletedExam;
  }

  async deleteAll() {
    const deletedExams = await this.db
      .delete(exams)
      .where(this.inSelectedYear())
      .returning();

    return {
      deletedCount: deletedExams.length,
      deletedExams: deletedExams
    };
  }

  async deleteBulk(ids: string[]) {
    const deletedExams = await this.db
      .delete(exams)
      .where(and(inArray(exams.id, ids), this.inSelectedYear()))
      .returning();

    return {
      deletedCount: deletedExams.length,
      deletedExams: deletedExams,
    };
  }

  async getTeacherAssignment(teacherId, subjectId, sectionId) {
    const [result] = await this.db
      .select()
      .from(teacherAssignments)
      .where(
        and(
          eq(teacherAssignments.teacherId, teacherId),
          eq(teacherAssignments.subjectId, subjectId),
          eq(teacherAssignments.sectionId, sectionId)
        )
      )
      .limit(1);

    return result;
  }

  async getExamByParams(teacherId, subjectId, sectionId, examTitle) {
    // First get the teacher assignment
    const teacherAssignment = await this.getTeacherAssignment(teacherId, subjectId, sectionId);

    if (!teacherAssignment) {
      return null;
    }

    // Then find the exam by title and teacher assignment
    const [result] = await this.db
      .select()
      .from(exams)
      .where(
        and(
          eq(exams.teacherAssignmentId, teacherAssignment.id),
          eq(exams.title, examTitle)
        )
      )
      .limit(1);

    return result;
  }

  async checkExamInUse(examId) {
    const [result] = await this.db
      .select({ count: count() })
      .from(grades)
      .where(eq(grades.examId, examId));

    return result.count > 0;
  }

  // School-wide context reads used to validate grade writes and migration issues.

  /** The context a grade is checked against when it is recorded for this exam. */
  async getSourceContext(id: string) {
    const [row] = await this.db.select({
      id: exams.id,
      academicYearId: exams.academicYearId,
      date: exams.date,
      sectionIds: exams.sectionIds,
      ...sourceAssignmentColumns,
      ...sourceTeachingColumns,
    }).from(exams)
      .leftJoin(teacherAssignments, eq(exams.teacherAssignmentId, teacherAssignments.id))
      .leftJoin(sections, eq(teacherAssignments.sectionId, sections.id))
      .leftJoin(classes, eq(sections.classId, classes.id))
      .where(eq(exams.id, id)).limit(1);
    return row ?? null;
  }

  async hasRegisteredYear(id: string) {
    const [row] = await this.db.select({ id: exams.id }).from(exams)
      .where(and(eq(exams.id, id), isNotNull(exams.academicYearId)))
      .limit(1);
    return Boolean(row);
  }

  /** Trusted full reset; user-facing deletion is limited to the selected year. */
  async clearForSeedReset() {
    await this.db.delete(exams);
  }

}
