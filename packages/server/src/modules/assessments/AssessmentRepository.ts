import { Repository } from '@server/najm';
import { Owned } from '@server/auth';
import { and, desc, eq, sql, asc, count, gte, lte, inArray, or } from 'drizzle-orm';
import { assessments, grades, teacherAssignments, teachers, staff, subjects, classes, sections, users } from '@server/database/schema';
import { DB } from '@server/database/db';
import { alias } from 'drizzle-orm/pg-core';
import { Assessment } from './AssessmentGuards';

export const assessmentSelect = {
  id: assessments.id,
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

@Owned(Assessment)
@Repository()
export class AssessmentRepository {
  declare db: DB;
  declare scope: (query: any) => any;

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

  async getAll() {
    return await this.scope(this.buildAssessmentQuery())
      .orderBy(desc(assessments.date));
  }

  async getById(id) {
    const [result] = await this.scope(this.buildAssessmentQuery())
      .where(eq(assessments.id, id))
      .limit(1);

    return result;
  }

  async getByType(type) {
    return await this.buildAssessmentQuery()
      .where(eq(assessments.type, type))
      .orderBy(desc(assessments.date));
  }

  async getByStatus(status) {
    return await this.buildAssessmentQuery()
      .where(eq(assessments.status, status))
      .orderBy(desc(assessments.date));
  }

  async getBySection(sectionId) {
    return await this.buildAssessmentQuery()
      .where(or(
        eq(teacherAssignments.sectionId, sectionId),
        sql`EXISTS (
          SELECT 1 FROM jsonb_array_elements_text(COALESCE(${assessments.sectionIds}, '[]'::jsonb)) AS target_section_id
          WHERE target_section_id = ${sectionId}
        )`,
      ))
      .orderBy(desc(assessments.date));
  }

  async getByTeacherAssignment(teacherAssignmentId) {
    return await this.buildAssessmentQuery()
      .where(eq(assessments.teacherAssignmentId, teacherAssignmentId))
      .orderBy(desc(assessments.date));
  }

  async getBySubject(subjectId) {
    return await this.buildAssessmentQuery()
      .where(eq(teacherAssignments.subjectId, subjectId))
      .orderBy(desc(assessments.date));
  }

  async getByTeacher(teacherId) {
    return await this.buildAssessmentQuery()
      .where(eq(teacherAssignments.teacherId, teacherId))
      .orderBy(desc(assessments.date));
  }

  async getTodayAssessments() {
    const today = new Date().toISOString().split('T')[0];
    return await this.buildAssessmentQuery()
      .where(eq(assessments.date, today))
      .orderBy(asc(assessments.date));
  }

  async getByClass(classId) {
    return await this.buildAssessmentQuery()
      .where(eq(classes.id, classId))
      .orderBy(desc(assessments.date));
  }

  async getUpcoming() {
    const today = new Date().toISOString().split('T')[0];
    return await this.scope(this.buildAssessmentQuery())
      .where(and(
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

    return await this.scope(this.buildAssessmentQuery())
      .where(and(
        gte(assessments.date, startStr),
        lte(assessments.date, endStr)
      ))
      .orderBy(asc(assessments.date));
  }

  async getOverdue() {
    const today = new Date().toISOString().split('T')[0];
    return await this.scope(this.buildAssessmentQuery())
      .where(and(
        lte(assessments.date, today),
        eq(assessments.status, 'scheduled')
      ))
      .orderBy(desc(assessments.date));
  }

  async getCount() {
    const [result] = await this.db
      .select({ count: count() })
      .from(assessments);

    return result;
  }

  async create(assessmentData) {
    const [newAssessment] = await this.db
      .insert(assessments)
      .values(assessmentData)
      .returning();

    return await this.getById(newAssessment.id);
  }

  async update(id, assessmentData) {
    const [updatedAssessment] = await this.db
      .update(assessments)
      .set(assessmentData)
      .where(eq(assessments.id, id))
      .returning();

    return updatedAssessment;
  }

  async delete(id) {
    const [deletedAssessment] = await this.db
      .delete(assessments)
      .where(eq(assessments.id, id))
      .returning();

    return deletedAssessment;
  }

  async deleteAll() {
    const deletedAssessments = await this.db
      .delete(assessments)
      .returning();

    return {
      deletedCount: deletedAssessments.length,
      deletedAssessments: deletedAssessments
    };
  }

  async deleteBulk(ids: string[]) {
    const deletedAssessments = await this.db
      .delete(assessments)
      .where(inArray(assessments.id, ids))
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

}
