import { Repository } from '../../najm';
import { DB } from '../../database/db';
import { sections, classes, students, teacherAssignments, teachers, staff, subjects, users, studentParents, parents, studentEnrollments, studentEnrollmentPlacements } from '../../database/schema';
import { eq, count, countDistinct, and, desc, ne, type SQL, inArray } from 'drizzle-orm';
import { Owned } from '../../auth';
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
  declare ownershipCondition: () => SQL | undefined;
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

  // The sections the user may read, limited to one registered year's label
  // (through their class) when one is given.
  // The sections of one registered year's classes the user may read.
  async getAll(academicYear: string) {
    return await this.buildSectionQuery()
      .where(and(this.ownershipCondition(), eq(classes.academicYear, academicYear)))
      .orderBy(classes.createdAt, classes.name, sections.name);
  }

  async getById(id) {
    const [result] = await this.buildSectionQuery()
      .where(and(this.ownershipCondition(), eq(sections.id, id)))
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

  async getByAcademicYear(academicYear: string) {
    return this.db.select({ ...sectionSelect, class: classSelect })
      .from(sections)
      .innerJoin(classes, eq(sections.classId, classes.id))
      .where(eq(classes.academicYear, academicYear))
      .orderBy(classes.name, sections.name);
  }

  async getByTeacherId(teacherId) {
    return await this.buildSectionQuery()
      .innerJoin(teacherAssignments, eq(sections.id, teacherAssignments.sectionId))
      .where(eq(teacherAssignments.teacherId, teacherId))
      .orderBy(classes.academicYear, classes.name, sections.name);
  }

  // The students placed in the section during its class's year, from their
  // enrollment placements rather than the current projection.
  async getStudents(sectionId: string, academicYearId: string) {
    return await this.db
      .selectDistinctOn([students.name, students.id], {
        id: students.id,
        studentCode: students.studentCode,
        name: students.name,
        email: users.email,
        status: students.status,
        enrollmentDate: students.enrollmentDate,
      })
      .from(studentEnrollmentPlacements)
      .innerJoin(studentEnrollments, eq(studentEnrollmentPlacements.enrollmentId, studentEnrollments.id))
      .innerJoin(students, eq(studentEnrollments.studentId, students.id))
      .innerJoin(users, eq(students.userId, users.id))
      .where(this.placedInSection(sectionId, academicYearId))
      .orderBy(students.name, students.id, desc(studentEnrollmentPlacements.validFrom));
  }

  private placedInSection(sectionId: string, academicYearId: string) {
    return and(
      eq(studentEnrollments.academicYearId, academicYearId),
      eq(studentEnrollmentPlacements.sectionId, sectionId),
    );
  }

  async getAnalytics(sectionId: string, academicYearId: string) {
    // Students placed in the section that year, and those whose enrollment
    // is still active.
    const [studentsCount] = await this.db
      .select({ count: countDistinct(studentEnrollments.studentId) })
      .from(studentEnrollmentPlacements)
      .innerJoin(studentEnrollments, eq(studentEnrollmentPlacements.enrollmentId, studentEnrollments.id))
      .where(this.placedInSection(sectionId, academicYearId));

    const [activeStudentsCount] = await this.db
      .select({ count: countDistinct(studentEnrollments.studentId) })
      .from(studentEnrollmentPlacements)
      .innerJoin(studentEnrollments, eq(studentEnrollmentPlacements.enrollmentId, studentEnrollments.id))
      .where(and(this.placedInSection(sectionId, academicYearId), eq(studentEnrollments.status, 'active')));

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

  // One row per parent and child placed in the section during its year.
  async getParents(sectionId: string, academicYearId: string) {
    const placed = this.db
      .select({ studentId: studentEnrollments.studentId })
      .from(studentEnrollmentPlacements)
      .innerJoin(studentEnrollments, eq(studentEnrollmentPlacements.enrollmentId, studentEnrollments.id))
      .where(this.placedInSection(sectionId, academicYearId));
    return await this.db
      .select({
        ...parentSelect,
        studentId: studentParents.studentId,
      })
      .from(parents)
      .leftJoin(users, eq(parents.userId, users.id))
      .innerJoin(studentParents, eq(parents.id, studentParents.parentId))
      .where(inArray(studentParents.studentId, placed))
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

  // School-wide context read for validating a section's year during writes.

  async listYearContexts(ids: string[]) {
    if (!ids.length) return [];
    return this.db.select({
      id: sections.id,
      classId: sections.classId,
      academicYear: classes.academicYear,
    }).from(sections)
      .innerJoin(classes, eq(sections.classId, classes.id))
      .where(inArray(sections.id, ids));
  }

}
