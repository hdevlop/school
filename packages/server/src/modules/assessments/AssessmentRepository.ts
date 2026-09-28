import { Repository } from '../../najm';
import { Owned } from '../../auth';
import { and, desc, eq, sql, asc, count, gte, lte, inArray, or, type SQL, isNotNull } from 'drizzle-orm';
import { assessments, grades, teacherAssignments, teachers, staff, subjects, classes, sections, users } from '../../database/schema';
import { inReportingYear } from '../academicYears/academicRecordYear';
import { DB } from '../../database/db';
import { alias } from 'drizzle-orm/pg-core';
import { Assessment, AssessmentForPlacedStudent, AssessmentForPlacedParent } from './AssessmentGuards';
import { sourceAssignmentColumns, sourceTeachingColumns } from '../academicSources/academicSourceContext';
import { studentPlacedOnSourceDate } from '../academicSources/placedOnSourceDate';
import { Year } from '../academicYears/requestYear';
import type { ResolvedAcademicYear } from '../academicYears/AcademicYearValidator';

export const assessmentSelect = {
  id: assessments.id,
  academicYearId: assessments.academicYearId,
  teacherAssignmentId: assessments.teacherAssignmentId,
  title: assessments.title,
  description: assessments.description,
  type: assessments.type,
  totalMarks: assessments.totalMarks,
  passingMarks: assessments.passingMarks,
  date: assessments.date,
  duration: assessments.duration,
  instructions: assessments.instructions,
  status: assessments.status,
  sectionIds: assessments.sectionIds,
  createdAt: assessments.createdAt,
  updatedAt: assessments.updatedAt,
};

export type AssessmentListFilters = {
  sectionId?: string;
  subjectId?: string;
  teacherId?: string;
  classId?: string;
};

@Owned(Assessment, AssessmentForPlacedStudent, AssessmentForPlacedParent)
@Repository()
export class AssessmentRepository {
  @Year() private readonly year!: ResolvedAcademicYear;
  declare db: DB;
  declare ownershipCondition: () => SQL | undefined;

  // ========================================
  // QUERY_BUILDERS (Reusable)
  // ========================================

  private buildAssessmentQuery() {
    const teacherUsers = alias(users, 'teacher_users');

    return this.db
      .select({
        ...assessmentSelect,
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
      .from(assessments)
      .leftJoin(teacherAssignments, eq(assessments.teacherAssignmentId, teacherAssignments.id))
      .leftJoin(subjects, eq(teacherAssignments.subjectId, subjects.id))
      .leftJoin(teachers, eq(teacherAssignments.teacherId, teachers.id))
      .leftJoin(staff, eq(teachers.staffId, staff.id))
      .leftJoin(teacherUsers, eq(staff.userId, teacherUsers.id))
      .leftJoin(sections, eq(teacherAssignments.sectionId, sections.id))
      .leftJoin(classes, eq(sections.classId, classes.id));
  }

  // The year's assessments the user may read: the stored year, else the date
  // in the year's reporting interval. Year, filters and ownership are one WHERE.
  async getAll({ sectionId, subjectId, teacherId, classId }: AssessmentListFilters = {}) {
    return await this.buildAssessmentQuery()
      .where(and(
        this.ownershipCondition(),
        inReportingYear(assessments.academicYearId, assessments.date, this.year),
        sectionId ? or(
          eq(teacherAssignments.sectionId, sectionId),
          sql`EXISTS (
            SELECT 1 FROM jsonb_array_elements_text(COALESCE(${assessments.sectionIds}, '[]'::jsonb)) AS target_section_id
            WHERE target_section_id = ${sectionId}
          )`,
        ) : undefined,
        subjectId ? eq(teacherAssignments.subjectId, subjectId) : undefined,
        teacherId ? eq(teacherAssignments.teacherId, teacherId) : undefined,
        classId ? eq(classes.id, classId) : undefined,
      ))
      .orderBy(desc(assessments.date));
  }

  /** One student's assessments in the year: those of a section they sat in on the date. */
  async getForStudent(studentId: string) {
    return await this.buildAssessmentQuery()
      .where(and(
        this.ownershipCondition(),
        inReportingYear(assessments.academicYearId, assessments.date, this.year),
        studentPlacedOnSourceDate(assessments, studentId),
      ))
      .orderBy(desc(assessments.date));
  }

  async getById(id) {
    const [result] = await this.buildAssessmentQuery()
      .where(and(this.ownershipCondition(), eq(assessments.id, id), inReportingYear(assessments.academicYearId, assessments.date, this.year)))
      .limit(1);

    return result;
  }

  async getByType(type) {
    return await this.buildAssessmentQuery()
      .where(and(this.ownershipCondition(), eq(assessments.type, type), inReportingYear(assessments.academicYearId, assessments.date, this.year)))
      .orderBy(desc(assessments.date));
  }

  async getByStatus(status) {
    return await this.buildAssessmentQuery()
      .where(and(this.ownershipCondition(), eq(assessments.status, status), inReportingYear(assessments.academicYearId, assessments.date, this.year)))
      .orderBy(desc(assessments.date));
  }

  async getByTeacherAssignment(teacherAssignmentId) {
    return await this.buildAssessmentQuery()
      .where(and(this.ownershipCondition(), eq(assessments.teacherAssignmentId, teacherAssignmentId), inReportingYear(assessments.academicYearId, assessments.date, this.year)))
      .orderBy(desc(assessments.date));
  }

  async getTodayAssessments() {
    const today = new Date().toISOString().split('T')[0];
    return await this.buildAssessmentQuery()
      .where(and(this.ownershipCondition(), eq(assessments.date, today), inReportingYear(assessments.academicYearId, assessments.date, this.year)))
      .orderBy(asc(assessments.date));
  }

  async getUpcoming() {
    const today = new Date().toISOString().split('T')[0];
    return await this.buildAssessmentQuery()
      .where(and(
        this.ownershipCondition(),
        inReportingYear(assessments.academicYearId, assessments.date, this.year),
        gte(assessments.date, today),
        eq(assessments.status, 'scheduled')
      ))
      .orderBy(asc(assessments.date));
  }

  async getDueThisWeek() {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    const startStr = startOfWeek.toISOString().split('T')[0];
    const endStr = endOfWeek.toISOString().split('T')[0];

    return await this.buildAssessmentQuery()
      .where(and(
        this.ownershipCondition(),
        inReportingYear(assessments.academicYearId, assessments.date, this.year),
        gte(assessments.date, startStr),
        lte(assessments.date, endStr)
      ))
      .orderBy(asc(assessments.date));
  }

  async getOverdue() {
    const today = new Date().toISOString().split('T')[0];
    return await this.buildAssessmentQuery()
      .where(and(
        this.ownershipCondition(),
        inReportingYear(assessments.academicYearId, assessments.date, this.year),
        lte(assessments.date, today),
        eq(assessments.status, 'scheduled')
      ))
      .orderBy(desc(assessments.date));
  }

  async getCount() {
    const [result] = await this.db
      .select({ count: count() })
      .from(assessments)
      .where(and(this.ownershipCondition(), inReportingYear(assessments.academicYearId, assessments.date, this.year)));

    return result;
  }

  async create(assessmentData) {
    const [newAssessment] = await this.db
      .insert(assessments)
      .values({ ...assessmentData, academicYearId: this.year.id })
      .returning();

    return await this.getById(newAssessment.id);
  }

  async update(id, assessmentData) {
    const [updatedAssessment] = await this.db
      .update(assessments)
      .set(assessmentData)
      .where(and(eq(assessments.id, id), inReportingYear(assessments.academicYearId, assessments.date, this.year)))
      .returning();

    return updatedAssessment;
  }

  async delete(id) {
    const [deletedAssessment] = await this.db
      .delete(assessments)
      .where(and(eq(assessments.id, id), inReportingYear(assessments.academicYearId, assessments.date, this.year)))
      .returning();

    return deletedAssessment;
  }

  async deleteAll() {
    const deletedAssessments = await this.db
      .delete(assessments)
      .where(inReportingYear(assessments.academicYearId, assessments.date, this.year))
      .returning();

    return {
      deletedCount: deletedAssessments.length,
      deletedAssessments: deletedAssessments
    };
  }

  async deleteBulk(ids: string[]) {
    const deletedAssessments = await this.db
      .delete(assessments)
      .where(and(inArray(assessments.id, ids), inReportingYear(assessments.academicYearId, assessments.date, this.year)))
      .returning();

    return {
      deletedCount: deletedAssessments.length,
      deletedAssessments: deletedAssessments
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

  async getAssessmentByParams(teacherId, subjectId, sectionId, assessmentTitle) {
    // First get the teacher assignment
    const teacherAssignment = await this.getTeacherAssignment(teacherId, subjectId, sectionId);

    if (!teacherAssignment) {
      return null;
    }

    // Then find the assessment by title and teacher assignment
    const [result] = await this.db
      .select()
      .from(assessments)
      .where(
        and(
          eq(assessments.teacherAssignmentId, teacherAssignment.id),
          eq(assessments.title, assessmentTitle)
        )
      )
      .limit(1);

    return result;
  }

  async checkAssessmentInUse(assessmentId) {
    const [result] = await this.db
      .select({ count: count() })
      .from(grades)
      .where(eq(grades.assessmentId, assessmentId));

    return result.count > 0;
  }

  // School-wide context reads used to validate grade writes and migration issues.

  /** The context a grade is checked against when it is recorded for this assessment. */
  async getSourceContext(id: string) {
    const [row] = await this.db.select({
      id: assessments.id,
      academicYearId: assessments.academicYearId,
      date: assessments.date,
      sectionIds: assessments.sectionIds,
      ...sourceAssignmentColumns,
      ...sourceTeachingColumns,
    }).from(assessments)
      .leftJoin(teacherAssignments, eq(assessments.teacherAssignmentId, teacherAssignments.id))
      .leftJoin(sections, eq(teacherAssignments.sectionId, sections.id))
      .leftJoin(classes, eq(sections.classId, classes.id))
      .where(eq(assessments.id, id)).limit(1);
    return row ?? null;
  }

  async hasRegisteredYear(id: string) {
    const [row] = await this.db.select({ id: assessments.id }).from(assessments)
      .where(and(eq(assessments.id, id), isNotNull(assessments.academicYearId)))
      .limit(1);
    return Boolean(row);
  }

  /** Trusted full reset; user-facing deletion is limited to the selected year. */
  async clearForSeedReset() {
    await this.db.delete(assessments);
  }

}
