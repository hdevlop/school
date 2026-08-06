import { Repository } from '@server/najm';
import { Owned } from '@server/auth';
import { and, desc, eq, sql, asc, count, inArray } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { grades, students, assessments, exams, teacherAssignments, subjects, teachers, staff, classes, sections, users } from '@server/database/schema';
import { DB } from '@server/database/db';
import { Grade } from './GradeGuards';

export const gradeSelect = {
  id: grades.id,
  assessmentId: grades.assessmentId,
  examId: grades.examId,
  studentId: grades.studentId,
  marksObtained: grades.marksObtained,
  feedback: grades.feedback,
  status: grades.status,
  gradedBy: grades.gradedBy,
  createdAt: grades.createdAt,
  updatedAt: grades.updatedAt,
};

@Owned(Grade)
@Repository()
export class GradeRepository {
  declare db: DB;
  declare scope: (query: any) => any;

  // ========================================
  // QUERY_BUILDERS (Reusable)
  // ========================================

  private buildGradeQuery() {
    const studentUsers = alias(users, 'student_users');
    const teacherUsers = alias(users, 'teacher_users');
    const gradedByUsers = alias(users, 'graded_by_users');

    return this.db
      .select({
        ...gradeSelect,
        student: {
          id: students.id,
          studentCode: students.studentCode,
          name: students.name,
          image: studentUsers.image,
          gender: students.gender,
          phone: students.phone,
        },
        assessment: {
          id: assessments.id,
          title: assessments.title,
          type: assessments.type,
          date: assessments.date,
          totalMarks: assessments.totalMarks,
          passingMarks: assessments.passingMarks,
        },
        exam: {
          id: exams.id,
          title: exams.title,
          type: exams.type,
          date: exams.date,
          totalMarks: exams.totalMarks,
          passingMarks: exams.passingMarks,
        },
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
        gradedByUser: {
          id: gradedByUsers.id,
          email: gradedByUsers.email,
          image: gradedByUsers.image,
        },
      })
      .from(grades)
      .leftJoin(students, eq(grades.studentId, students.id))
      .leftJoin(studentUsers, eq(students.userId, studentUsers.id))
      .leftJoin(assessments, eq(grades.assessmentId, assessments.id))
      .leftJoin(exams, eq(grades.examId, exams.id))
      .leftJoin(
        teacherAssignments,
        sql`${teacherAssignments.id} = coalesce(${assessments.teacherAssignmentId}, ${exams.teacherAssignmentId})`
      )
      .leftJoin(subjects, eq(teacherAssignments.subjectId, subjects.id))
      .leftJoin(teachers, eq(teacherAssignments.teacherId, teachers.id))
      .leftJoin(staff, eq(teachers.staffId, staff.id))
      .leftJoin(teacherUsers, eq(staff.userId, teacherUsers.id))
      .leftJoin(sections, eq(teacherAssignments.sectionId, sections.id))
      .leftJoin(classes, eq(sections.classId, classes.id))
      .leftJoin(gradedByUsers, eq(grades.gradedBy, gradedByUsers.id));
  }

  async getAll() {
    return await this.scope(this.buildGradeQuery())
      .orderBy(desc(grades.createdAt));
  }

  async getById(id) {
    const [result] = await this.scope(this.buildGradeQuery())
      .where(eq(grades.id, id))
      .limit(1);

    return result;
  }

  async getByAssessment(assessmentId) {
    return await this.buildGradeQuery()
      .where(eq(grades.assessmentId, assessmentId))
      .orderBy(asc(students.name));
  }

  async getByExam(examId) {
    return await this.buildGradeQuery()
      .where(eq(grades.examId, examId))
      .orderBy(asc(students.name));
  }

  async getByStudent(studentId) {
    return await this.buildGradeQuery()
      .where(eq(grades.studentId, studentId))
      .orderBy(desc(sql`coalesce(${assessments.date}, ${exams.date})`));
  }

  async getBySection(sectionId) {
    return await this.buildGradeQuery()
      .where(eq(teacherAssignments.sectionId, sectionId))
      .orderBy(desc(sql`coalesce(${assessments.date}, ${exams.date})`), asc(students.name));
  }

  async getByTeacherAssignment(teacherAssignmentId) {
    return await this.buildGradeQuery()
      .where(eq(teacherAssignments.id, teacherAssignmentId))
      .orderBy(desc(sql`coalesce(${assessments.date}, ${exams.date})`), asc(students.name));
  }

  async getBySubject(subjectId) {
    return await this.buildGradeQuery()
      .where(eq(teacherAssignments.subjectId, subjectId))
      .orderBy(desc(sql`coalesce(${assessments.date}, ${exams.date})`), asc(students.name));
  }

  async getByTeacher(teacherId) {
    return await this.buildGradeQuery()
      .where(eq(teacherAssignments.teacherId, teacherId))
      .orderBy(desc(sql`coalesce(${assessments.date}, ${exams.date})`), asc(students.name));
  }

  async getCount() {
    const [result] = await this.db
      .select({ count: count() })
      .from(grades);

    return result;
  }

  async create(gradeData) {
    const [newGrade] = await this.db
      .insert(grades)
      .values(gradeData)
      .returning();
    return newGrade;
  }

  async update(id, gradeData) {
    const [updatedGrade] = await this.db
      .update(grades)
      .set(gradeData)
      .where(eq(grades.id, id))
      .returning();

    return updatedGrade;
  }

  async delete(id) {
    const [deletedGrade] = await this.db
      .delete(grades)
      .where(eq(grades.id, id))
      .returning();

    return deletedGrade;
  }

  async deleteAll() {
    const deletedGrades = await this.db
      .delete(grades)
      .returning();

    return {
      deletedCount: deletedGrades.length,
      deletedGrades: deletedGrades
    };
  }

  async deleteBulk(ids: string[]) {
    const deletedGrades = await this.db
      .delete(grades)
      .where(inArray(grades.id, ids))
      .returning();

    return {
      deletedCount: deletedGrades.length,
      deletedGrades: deletedGrades,
    };
  }

  async checkGradeExists(studentId, source: { assessmentId?: string | null; examId?: string | null }) {
    const sourceCondition = source.assessmentId
      ? eq(grades.assessmentId, source.assessmentId)
      : eq(grades.examId, source.examId ?? '');

    const [existing] = await this.db
      .select()
      .from(grades)
      .where(and(
        eq(grades.studentId, studentId),
        sourceCondition
      ))
      .limit(1);

    return existing;
  }

}
