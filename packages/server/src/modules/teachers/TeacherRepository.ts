import { DB } from '@server/database/db';
import { teachers, users, teacherAssignments, sections, subjects, students, classes, staff } from '@server/database/schema';
import { Repository } from '@server/najm';
import { Owned } from '@server/auth';
import { count, eq, desc, sql, and, inArray } from 'drizzle-orm';
import { Teacher } from './TeacherGuards';

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

@Owned(Teacher)
@Repository()
export class TeacherRepository {

  declare db: DB;
  declare scope: (query: any) => any;

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

  async getAll() {
    return await this.scope(this.buildTeacherQuery())
      .orderBy(desc(teachers.createdAt));
  }

  async getById(id: string) {
    const [teacher] = await this.scope(this.buildTeacherQuery())
      .where(eq(teachers.id, id))
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
    const [teacher] = await this.scope(this.buildTeacherQuery())
      .where(eq(staff.userId, userId))
      .limit(1);
    return teacher;
  }

  async getStudents(teacherId) {
    return await this.db
      .select(studentSelect)
      .from(teacherAssignments)
      .innerJoin(sections, eq(teacherAssignments.sectionId, sections.id))
      .innerJoin(students, eq(sections.id, students.sectionId))
      .leftJoin(users, eq(students.userId, users.id))
      .where(
        and(
          eq(teacherAssignments.teacherId, teacherId),
          eq(students.status, 'active')
        )
      )
      .orderBy(students.name);
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
      .where(eq(teacherAssignments.teacherId, teacherId))
      .orderBy(classes.name, sections.name, subjects.name);
  }

  async getClassSections(classId: string) {
    return await this.db
      .select(sectionSelect)
      .from(sections)
      .where(eq(sections.classId, classId))
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
          eq(teacherAssignments.sectionId, sectionId)
        )
      )
      .limit(1);

    return assignment;
  }

  async getTeacherAssignmentById(assignmentId) {
    const [assignment] = await this.db
      .select()
      .from(teacherAssignments)
      .where(eq(teacherAssignments.id, assignmentId))
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
    const allTeachers = await this.buildTeacherQuery()
      .orderBy(desc(teachers.createdAt));

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
          eq(teacherAssignments.sectionId, sectionId)
        )
      )
      .limit(1);

    return !!result;
  }
}
