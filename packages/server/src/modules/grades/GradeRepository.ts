import { Repository } from '../../najm';
import { Owned } from '../../auth';
import { and, desc, eq, sql, asc, count, inArray, type SQL, isNotNull, isNull, or } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { grades, students, assessments, exams, teacherAssignments, subjects, teachers, staff, classes, sections, users } from '../../database/schema';
import { inReportingInterval, type ReportingYear } from '../academicYears/academicRecordYear';
import { DB } from '../../database/db';
import { Grade } from './GradeGuards';

/**
 * A legacy grade takes its date from exactly one joined source. A grade with
 * no source, two, or an orphaned link stays out of every year and in the
 * administrator unassigned-source review. The query must left join
 * assessments and exams on the grade's source ids.
 */
export type GradeListFilters = {
  year: ReportingYear;
  studentId?: string;
  sectionId?: string;
  subjectId?: string;
  teacherId?: string;
};

export function gradeInReportingYear(year: ReportingYear): SQL {
  return or(
    eq(grades.academicYearId, year.id),
    and(
      isNull(grades.academicYearId),
      or(
        and(isNotNull(grades.assessmentId), isNull(grades.examId), inReportingInterval(assessments.date, year)),
        and(isNotNull(grades.examId), isNull(grades.assessmentId), inReportingInterval(exams.date, year)),
      ),
    ),
  )!;
}

export const gradeSelect = {
  id: grades.id,
  academicYearId: grades.academicYearId,
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
  declare ownershipCondition: () => SQL | undefined;

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

  // The year's grades the user may read, optionally for one student, section,
  // subject or teacher. Year, filters and ownership are one WHERE. A filtered
  // list reads newest source first; the whole year, newest grade first.
  async getAll({ year, studentId, sectionId, subjectId, teacherId }: GradeListFilters) {
    const filtered = Boolean(studentId || sectionId || subjectId || teacherId);
    return await this.buildGradeQuery()
      .where(and(
        this.ownershipCondition(),
        gradeInReportingYear(year),
        studentId ? eq(grades.studentId, studentId) : undefined,
        sectionId ? eq(teacherAssignments.sectionId, sectionId) : undefined,
        subjectId ? eq(teacherAssignments.subjectId, subjectId) : undefined,
        teacherId ? eq(teacherAssignments.teacherId, teacherId) : undefined,
      ))
      .orderBy(...(filtered
        ? [desc(sql`coalesce(${assessments.date}, ${exams.date})`), asc(students.name)]
        : [desc(grades.createdAt)]));
  }

  async getById(id) {
    const [result] = await this.buildGradeQuery()
      .where(and(this.ownershipCondition(), eq(grades.id, id)))
      .limit(1);

    return result;
  }

  // Every grade of one source; the source's own year decides access.
  async getByAssessment(assessmentId: string) {
    return await this.buildGradeQuery()
      .where(and(this.ownershipCondition(), eq(grades.assessmentId, assessmentId)))
      .orderBy(asc(students.name));
  }

  // Every grade of one source; the source's own year decides access.
  async getByExam(examId: string) {
    return await this.buildGradeQuery()
      .where(and(this.ownershipCondition(), eq(grades.examId, examId)))
      .orderBy(asc(students.name));
  }

  async getCount() {
    const [result] = await this.db
      .select({ count: count() })
      .from(grades);

    return result;
  }

  async teacherIdForUser(userId: string) {
    const [row] = await this.db.select({ id: teachers.id })
      .from(teachers)
      .innerJoin(staff, eq(teachers.staffId, staff.id))
      .where(eq(staff.userId, userId))
      .limit(1);
    return row?.id ?? null;
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

  // These grades have no unique source date, so they cannot be attributed to a
  // school year. Keep them in a global administrator review queue.
  async listUnassignedSources() {
    return this.db.select({
      id: grades.id,
      studentId: grades.studentId,
      assessmentId: grades.assessmentId,
      examId: grades.examId,
      createdAt: grades.createdAt,
    }).from(grades)
      .leftJoin(assessments, eq(grades.assessmentId, assessments.id))
      .leftJoin(exams, eq(grades.examId, exams.id))
      .where(or(
        and(isNull(grades.assessmentId), isNull(grades.examId)),
        and(isNotNull(grades.assessmentId), isNotNull(grades.examId)),
        and(isNotNull(grades.assessmentId), isNull(assessments.id)),
        and(isNotNull(grades.examId), isNull(exams.id)),
      ))
      .orderBy(grades.id);
  }

  async hasRegisteredYear(id: string) {
    const [row] = await this.db.select({ id: grades.id }).from(grades)
      .where(and(eq(grades.id, id), isNotNull(grades.academicYearId)))
      .limit(1);
    return Boolean(row);
  }

}
