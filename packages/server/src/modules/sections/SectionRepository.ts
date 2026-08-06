import { Repository } from '@server/najm';
import { DB } from '@server/database/db';
import { sections, classes, students, teacherAssignments, teachers, staff, subjects, users, studentParents, parents } from '@server/database/schema';
import { eq, count, and, inArray, ne } from 'drizzle-orm';
import { Owned } from '@server/auth';
import { Section } from './SectionGuards';

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

export const classSelect = {
  id: classes.id,
  name: classes.name,
  description: classes.description,
  academicYear: classes.academicYear,
  level: classes.level,
  createdAt: classes.createdAt,
  updatedAt: classes.updatedAt,
};

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

export const parentSelect = {
  id: parents.id,
  userId: parents.userId,
  name: parents.name,
  email: users.email,
  cin: parents.cin,
  phone: parents.phone,
  gender: parents.gender,
  address: parents.address,
  dateOfBirth: parents.dateOfBirth,
  age: parents.age,
  occupation: parents.occupation,
  nationality: parents.nationality,
  maritalStatus: parents.maritalStatus,
  relationshipType: parents.relationshipType,
  isEmergencyContact: parents.isEmergencyContact,
  financialResponsibility: parents.financialResponsibility,
  image: users.image,
  createdAt: parents.createdAt,
  updatedAt: parents.updatedAt,
};

@Owned(Section)
@Repository()
export class SectionRepository {
  db: DB;
  declare scope: (query: any) => any;
  // ========================================
  // QUERY_BUILDERS (Reusable)
  // ========================================

  private buildSectionQuery() {
    return this.db
      .select({
        ...sectionSelect,
        class: classSelect,
      })
      .from(sections)
      .innerJoin(classes, eq(sections.classId, classes.id));
  }

  // ============ GET ALL METHODS ============ //

  async getAll() {
    return await this.scope(this.buildSectionQuery())
      .orderBy(classes.createdAt, classes.name, sections.name);
  }

  async getById(id) {
    const [result] = await this.scope(this.buildSectionQuery())
      .where(eq(sections.id, id))
      .limit(1);
    return result;
  }

  async getByClass(classId) {
    return await this.db
      .select(sectionSelect)
      .from(sections)
      .where(eq(sections.classId, classId))
      .orderBy(sections.name);
  }

  async getByTeacherId(teacherId) {
    return await this.buildSectionQuery()
      .innerJoin(teacherAssignments, eq(sections.id, teacherAssignments.sectionId))
      .where(eq(teacherAssignments.teacherId, teacherId))
      .orderBy(classes.academicYear, classes.name, sections.name);
  }

  async getStudents(sectionId) {
    return await this.db
      .select({
        id: students.id,
        studentCode: students.studentCode,
        name: students.name,
        email: users.email,
        status: students.status,
        enrollmentDate: students.enrollmentDate,
      })
      .from(students)
      .where(eq(students.sectionId, sectionId))
      .innerJoin(users, eq(students.userId, users.id))
      .orderBy(students.name);
  }

  async getAnalytics(sectionId) {
    // Get total students count
    const [studentsCount] = await this.db
      .select({ count: count() })
      .from(students)
      .where(eq(students.sectionId, sectionId));

    // Get active students count
    const [activeStudentsCount] = await this.db
      .select({ count: count() })
      .from(students)
      .where(and(
        eq(students.sectionId, sectionId),
        eq(students.status, 'active')
      ));

    // Get section capacity
    const [sectionInfo] = await this.db
      .select({
        maxStudents: sections.maxStudents,
      })
      .from(sections)
      .where(eq(sections.id, sectionId))
      .limit(1);

    const utilizationRate = sectionInfo?.maxStudents > 0
      ? (studentsCount.count / sectionInfo.maxStudents) * 100
      : 0;

    return {
      totalStudents: studentsCount.count || 0,
      activeStudents: activeStudentsCount.count || 0,
      maxStudents: sectionInfo?.maxStudents || 0,
      utilizationRate: Math.round(utilizationRate * 100) / 100,
    };
  }

  async getClasses(sectionId) {
    const [result] = await this.db
      .select(classSelect)
      .from(classes)
      .innerJoin(sections, eq(sections.classId, classes.id))
      .where(eq(sections.id, sectionId))
      .limit(1);
    return result;
  }

  async getTeachers(sectionId) {
    return await this.db
      .select({
        ...teacherSelect,
        teacherAssignmentId: teacherAssignments.id,
        subjectId: teacherAssignments.subjectId,
        subjectName: subjects.name,
        subjectCode: subjects.code,
      })
      .from(teachers)
      .innerJoin(staff, eq(teachers.staffId, staff.id))
      .innerJoin(users, eq(staff.userId, users.id))
      .innerJoin(teacherAssignments, eq(teachers.id, teacherAssignments.teacherId))
      .innerJoin(subjects, eq(teacherAssignments.subjectId, subjects.id))
      .where(eq(teacherAssignments.sectionId, sectionId))
      .orderBy(staff.name, subjects.name);
  }

  async getParents(sectionId) {
    return await this.db
      .select({
        ...parentSelect,
        studentId: studentParents.studentId,
      })
      .from(parents)
      .leftJoin(users, eq(parents.userId, users.id))
      .innerJoin(studentParents, eq(parents.id, studentParents.parentId))
      .innerJoin(students, eq(studentParents.studentId, students.id))
      .where(eq(students.sectionId, sectionId))
      .orderBy(parents.name);
  }

  async create(data) {
    const [newSection] = await this.db
      .insert(sections)
      .values(data)
      .returning();
    return newSection;
  }

  async update(id, data) {
    const [updatedSection] = await this.db
      .update(sections)
      .set(data)
      .where(eq(sections.id, id))
      .returning();
    return updatedSection;
  }

  async delete(id) {
    const [deletedSection] = await this.db
      .delete(sections)
      .where(eq(sections.id, id))
      .returning();
    return deletedSection;
  }

  async deleteAll() {
    const deletedSections = await this.db
      .delete(sections)
      .returning();
    return {
      deletedCount: deletedSections.length,
      deletedSections: deletedSections
    };
  }

  async checkHasStudents(sectionId) {
    const [result] = await this.db
      .select({ count: count() })
      .from(students)
      .where(eq(students.sectionId, sectionId))
      .limit(1);
    return result.count > 0;
  }

  async checkNameExistsInClass(classId, name, excludeId?) {
    const conditions = [
      eq(sections.classId, classId),
      eq(sections.name, name),
    ];

    if (excludeId) {
      conditions.push(ne(sections.id, excludeId));
    }

    const [result] = await this.db
      .select({ id: sections.id })
      .from(sections)
      .where(and(...conditions))
      .limit(1);

    return result;
  }
}
