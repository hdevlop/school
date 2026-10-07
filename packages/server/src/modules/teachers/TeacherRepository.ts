import { DB } from '../../database/db';
import { teachers, users, teacherAssignments, sections, subjects, students, classes, staff, studentEnrollments, studentEnrollmentPlacements } from '../../database/schema';
import { Repository } from '../../najm';
import { Owned, type OwnedWhere } from '../../auth';
import { count, eq, desc, sql, and, inArray, gt, isNull, lte, or } from 'drizzle-orm';
import { Teacher } from './TeacherGuards';
import { Year } from '../academicYears/requestYear';
import type { ResolvedAcademicYear } from '../academicYears/AcademicYearValidator';

export const teacherSelect = {
  id: teachers.id,
  staffId: teachers.staffId,
  userId: staff.userId,
  cin: staff.cin,
  name: staff.name,
  email: users.email,
  phone: staff.phone,
  address: staff.address,
  gender: staff.gender,
  specialization: teachers.specialization,
  salary: staff.salary,
  compensationMode: staff.compensationMode,
  hourlyRate: staff.hourlyRate,
  hireDate: staff.hireDate,
  yearsOfExperience: teachers.yearsOfExperience,
  bankAccount: staff.bankAccount,
  emergencyContact: staff.emergencyContact,
  emergencyPhone: staff.emergencyPhone,
  status: staff.status,
  employmentType: staff.employmentType,
  workloadHours: staff.workloadHours,
  academicDegrees: teachers.academicDegrees,
  image: users.image,
  createdAt: teachers.createdAt,
  updatedAt: teachers.updatedAt,
};

export const studentSelect = {
  id: students.id,
  userId: students.userId,
  studentCode: students.studentCode,
  name: students.name,
  email: users.email,
  phone: students.phone,
  address: students.address,
  dateOfBirth: students.dateOfBirth,
  age: students.age,
  gender: students.gender,
  classId: students.classId,
  sectionId: students.sectionId,
  enrollmentDate: students.enrollmentDate,
  medicalConditions: students.medicalConditions,
  status: students.status,
  image: users.image,
  createdAt: students.createdAt,
  updatedAt: students.updatedAt,
};

export const classSelect = {
  id: classes.id,
  name: classes.name,
  description: classes.description,
  academicYear: classes.academicYear,
  level: classes.level,
  createdAt: classes.createdAt,
  updatedAt: classes.updatedAt,
};

export const sectionSelect = {
  id: sections.id,
  name: sections.name,
  classId: sections.classId,
  maxStudents: sections.maxStudents,
  roomNumber: sections.roomNumber,
  status: sections.status,
  createdAt: sections.createdAt,
  updatedAt: sections.updatedAt,
};

export const subjectSelect = {
  id: subjects.id,
  name: subjects.name,
  code: subjects.code,
  description: subjects.description,
  createdAt: subjects.createdAt,
  updatedAt: subjects.updatedAt,
};

@Repository()
export class TeacherRepository {

  declare db: DB;
  @Owned(Teacher)
  private ownedWhere!: OwnedWhere;
  @Year() private readonly year!: ResolvedAcademicYear;

  // ========================================
  // QUERY_BUILDERS (Reusable)
  // ========================================

  private buildTeacherQuery() {
    return this.db
      .select({
        ...teacherSelect,
        assignments: sql<Array<{
          classId: string;
          sectionIds: string[];
          subjectIds: string[];
        }>>`
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'classId', class_id,
                'sectionIds', section_ids,
                'subjectIds', subject_ids
              )
            )
            FROM (
              SELECT 
                ${classes.id} as class_id,
                array_agg(DISTINCT ${sections.id}) as section_ids,
                array_agg(DISTINCT ${subjects.id}) as subject_ids
              FROM ${teacherAssignments}
              INNER JOIN ${sections} ON ${teacherAssignments.sectionId} = ${sections.id}
              INNER JOIN ${classes} ON ${sections.classId} = ${classes.id}
              INNER JOIN ${subjects} ON ${teacherAssignments.subjectId} = ${subjects.id}
              WHERE ${teacherAssignments.teacherId} = ${teachers.id}
                AND ${classes.academicYear} = ${this.year.label}
              GROUP BY ${classes.id}
            ) grouped
          ),
          '[]'::json
        )
      `.as('assignments')
      })
      .from(teachers)
      .innerJoin(staff, eq(teachers.staffId, staff.id))
      .leftJoin(users, eq(staff.userId, users.id));
  }

  // ========================================
  // GET / READ METHODS
  // ========================================

  async getCount() {
    const [teachersCount] = await this.db
      .select({ count: count() })
      .from(teachers);
    return teachersCount;
  }

  // The rows getAll returns, counted. getCount above is the dashboards'
  // school-wide total.
  async getOwnedCount() {
    const [row] = await this.db
      .select({ count: count() })
      .from(teachers)
      .where(this.ownedWhere());
    return row;
  }

  async getAll() {
    return await this.buildTeacherQuery()
      .where(this.ownedWhere())
      .orderBy(desc(teachers.createdAt));
  }

  async getById(id: string) {
    const [teacher] = await this.buildTeacherQuery()
      .where(and(this.ownedWhere(), eq(teachers.id, id)))
      .limit(1);
    if (!teacher) return null;
    return teacher
  }

  async getByStatus(status) {
    return await this.buildTeacherQuery()
      .where(eq(staff.status, status))
      .orderBy(desc(teachers.createdAt));
  }

  async getBySpecialization(specialization) {
    return await this.buildTeacherQuery()
      .where(eq(teachers.specialization, specialization))
      .orderBy(staff.name);
  }

  async getByCin(cin) {
    const [existingTeacher] = await this.buildTeacherQuery()
      .where(eq(staff.cin, cin))
      .limit(1);
    return existingTeacher;
  }

  async getByEmail(email) {
    const [existingTeacher] = await this.buildTeacherQuery()
      .where(eq(users.email, email))
      .limit(1);
    return existingTeacher;
  }

  async getByPhone(phone) {
    const [teacher] = await this.buildTeacherQuery()
      .where(eq(staff.phone, phone))
      .limit(1);
    return teacher;
  }

  async getByUserId(userId: string) {
    const [teacher] = await this.db.select(teacherSelect).from(teachers)
      .innerJoin(staff, eq(teachers.staffId, staff.id))
      .leftJoin(users, eq(staff.userId, users.id))
      .where(and(this.ownedWhere(), eq(staff.userId, userId)))
      .limit(1);
    return teacher;
  }

  // The record without the year's assignments, for reads outside the year
  // scope such as the teacher dashboard.
  async getOwnedRecord(id: string) {
    const [teacher] = await this.db.select(teacherSelect).from(teachers)
      .innerJoin(staff, eq(teachers.staffId, staff.id))
      .leftJoin(users, eq(staff.userId, users.id))
      .where(and(this.ownedWhere(), eq(teachers.id, id)))
      .limit(1);
    return teacher;
  }

  // The students placed that year in the teacher's assigned sections of that
  // year's classes; with `onDate`, those enrolled and placed there that day.
  // The assignment's class and the student's placement must both belong to
  // the year: a student's current section never authorizes history.
  async getStudents(teacherId: string, onDate?: string) {
    return this.db.selectDistinctOn([students.name, students.id], {
      ...studentSelect,
      classId: studentEnrollmentPlacements.classId,
      sectionId: studentEnrollmentPlacements.sectionId,
      status: studentEnrollments.status,
      enrollmentId: studentEnrollments.id,
      placementId: studentEnrollmentPlacements.id,
      academicYear: classes.academicYear,
      ...(onDate ? { onDate: sql<string>`${onDate}` } : {}),
    }).from(teacherAssignments)
      .innerJoin(sections, eq(teacherAssignments.sectionId, sections.id))
      .innerJoin(classes, and(
        eq(sections.classId, classes.id),
        eq(teacherAssignments.classId, classes.id),
      ))
      .innerJoin(studentEnrollmentPlacements, and(
        eq(studentEnrollmentPlacements.sectionId, sections.id),
        eq(studentEnrollmentPlacements.classId, classes.id),
      ))
      .innerJoin(studentEnrollments, eq(studentEnrollmentPlacements.enrollmentId, studentEnrollments.id))
      .innerJoin(students, eq(studentEnrollments.studentId, students.id))
      .leftJoin(users, eq(students.userId, users.id))
      .where(and(
        eq(teacherAssignments.teacherId, teacherId),
        eq(classes.academicYear, this.year.label),
        eq(studentEnrollments.academicYearId, this.year.id),
        ...(onDate ? [
          lte(studentEnrollments.enrolledOn, onDate),
          or(isNull(studentEnrollments.leftOn), gt(studentEnrollments.leftOn, onDate)),
          lte(studentEnrollmentPlacements.validFrom, onDate),
          or(isNull(studentEnrollmentPlacements.validTo), gt(studentEnrollmentPlacements.validTo, onDate)),
        ] : []),
      ))
      .orderBy(students.name, students.id, desc(studentEnrollmentPlacements.validFrom));
  }

  async getClasses(teacherId) {
    return await this.db
      .select({
        ...classSelect,
        section: sectionSelect,
        subject: subjectSelect,
      })
      .from(teacherAssignments)
      .innerJoin(sections, eq(teacherAssignments.sectionId, sections.id))
      .innerJoin(classes, eq(sections.classId, classes.id))
      .innerJoin(subjects, eq(teacherAssignments.subjectId, subjects.id))
      .where(and(eq(teacherAssignments.teacherId, teacherId), eq(classes.academicYear, this.year.label)))
      .orderBy(classes.name, sections.name, subjects.name);
  }

  async getClassSections(classId: string) {
    return await this.db
      .select(sectionSelect)
      .from(sections)
      .innerJoin(classes, eq(sections.classId, classes.id))
      .where(and(eq(sections.classId, classId), eq(classes.academicYear, this.year.label)))
      .orderBy(sections.name);
  }

  async getTeacherAssignment(teacherId, subjectId, sectionId) {
    const [assignment] = await this.db
      .select()
      .from(teacherAssignments)
      .where(
        and(
          eq(teacherAssignments.teacherId, teacherId),
          eq(teacherAssignments.subjectId, subjectId),
          eq(teacherAssignments.sectionId, sectionId),
          inArray(teacherAssignments.classId, this.classesInSelectedYear()),
        )
      )
      .limit(1);

    return assignment;
  }

  async getTeacherAssignmentById(assignmentId) {
    const [assignment] = await this.db
      .select()
      .from(teacherAssignments)
      .where(and(eq(teacherAssignments.id, assignmentId), inArray(teacherAssignments.classId, this.classesInSelectedYear())))
      .limit(1);

    return assignment;
  }

  // ========================================
  // CREATE_METHODS
  // ========================================

  async create(data) {
    const [newTeacher] = await this.db
      .insert(teachers)
      .values(data)
      .returning();
    return newTeacher;
  }

  async createAssignment(data) {
    const [assignment] = await this.db
      .insert(teacherAssignments)
      .values(data)
      .returning();
    return assignment;
  }

  async findAssignment(teacherId, sectionId, subjectId) {
    const [assignment] = await this.db
      .select()
      .from(teacherAssignments)
      .where(
        and(
          eq(teacherAssignments.teacherId, teacherId),
          eq(teacherAssignments.sectionId, sectionId),
          eq(teacherAssignments.subjectId, subjectId),
          inArray(teacherAssignments.classId, this.classesInSelectedYear()),
        )
      )
      .limit(1);
    return assignment;
  }

  async deleteAssignment(teacherId, sectionId, subjectId) {
    const [deleted] = await this.db
      .delete(teacherAssignments)
      .where(
        and(
          eq(teacherAssignments.teacherId, teacherId),
          eq(teacherAssignments.sectionId, sectionId),
          eq(teacherAssignments.subjectId, subjectId),
          inArray(teacherAssignments.classId, this.classesInSelectedYear()),
        )
      )
      .returning();
    return deleted;
  }

  async deleteAssignmentsForClass(teacherId: string, classId: string, subjectId?: string) {
    const sectionRows = await this.getClassSections(classId);
    const sectionIds = sectionRows.map((section) => section.id);
    if (sectionIds.length === 0) return [];

    const filters = [
      eq(teacherAssignments.teacherId, teacherId),
      eq(teacherAssignments.classId, classId),
      inArray(teacherAssignments.classId, this.classesInSelectedYear()),
      inArray(teacherAssignments.sectionId, sectionIds),
    ];

    if (subjectId) {
      filters.push(eq(teacherAssignments.subjectId, subjectId));
    }

    return await this.db
      .delete(teacherAssignments)
      .where(and(...filters))
      .returning();
  }

  // ========================================
  // UPDATE_METHODS
  // ========================================

  async update(id, data) {
    const [updatedTeacher] = await this.db
      .update(teachers)
      .set(data)
      .where(eq(teachers.id, id))
      .returning();
    return updatedTeacher;
  }

  // ========================================
  // DELETE_METHODS
  // ========================================

  async delete(id) {
    const [deletedTeacher] = await this.db
      .delete(teachers)
      .where(eq(teachers.id, id))
      .returning();
    return deletedTeacher;
  }

  async deleteAll() {
    // Shared teacher identities are cleared across all years during a seed reset.
    // Only linked accounts are needed; assignment reads require a selected year.
    const allTeachers = await this.db
      .select({ userId: staff.userId })
      .from(teachers)
      .innerJoin(staff, eq(teachers.staffId, staff.id));

    const userIds = allTeachers
      .map(teacher => teacher.userId)
      .filter(userId => userId !== null);

    const deletedTeachers = await this.db
      .delete(teachers)
      .returning();

    if (userIds.length > 0) {
      await this.db
        .delete(users)
        .where(inArray(users.id, userIds))
        .returning();
    }

    return {
      deletedCount: deletedTeachers.length,
      deletedTeachers: deletedTeachers
    };
  }

  async hasAnyAssignments(id?: string) {
    const [row] = await this.db.select({ id: teacherAssignments.id }).from(teacherAssignments)
      .where(id ? eq(teacherAssignments.teacherId, id) : undefined).limit(1);
    return !!row;
  }

  // ========================================
  // VALIDATION_HELPERS
  // ========================================
  async checkInSection(teacherId, sectionId) {
    const [result] = await this.db
      .select({ id: teacherAssignments.id })
      .from(teacherAssignments)
      .where(
        and(
          eq(teacherAssignments.teacherId, teacherId),
          eq(teacherAssignments.sectionId, sectionId),
          inArray(teacherAssignments.classId, this.classesInSelectedYear()),
        )
      )
      .limit(1);

    return !!result;
  }

  private classesInSelectedYear() {
    return this.db.select({ id: classes.id }).from(classes)
      .where(eq(classes.academicYear, this.year.label));
  }
}
