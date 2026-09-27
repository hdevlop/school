import { DB } from '../../database/db';
import { classes, sections, students, teacherAssignments, teachers, staff, parents, studentParents, users, subjects, studentEnrollments, studentEnrollmentPlacements } from '../../database/schema';
import { eq, count, countDistinct, and, desc, inArray, sql, type SQL } from 'drizzle-orm';
import { Repository } from '../../najm';
import { Owned } from '../../auth';
import { jsonAgg } from '../../shared';
import { Class } from './ClassGuards';

export const classSelect = {
  id: classes.id,
  name: classes.name,
  description: classes.description,
  academicYear: classes.academicYear,
  level: classes.level,
  cycleId: classes.cycleId,
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

@Owned(Class)
@Repository()
export class ClassRepository {
  declare db: DB;
  declare ownershipCondition: () => SQL | undefined;

  // ========================================
  // QUERY_BUILDERS (Reusable)
  // ========================================

  private buildClassQuery() {
    return this.db
      .select({
        ...classSelect,
        sections: jsonAgg({
          id: sections.id,
          name: sections.name,
        })
      })
      .from(classes)
      .leftJoin(sections, eq(sections.classId, classes.id))
      .groupBy(classes.id);
  }

  // ============ GET ALL METHODS ============ //

  // The classes of one registered year the user may read.
  async getAll(academicYear: string) {
    return await this.buildClassQuery()
      .where(and(this.ownershipCondition(), eq(classes.academicYear, academicYear)))
      .orderBy(classes.createdAt, classes.name);
  }

  async getCount() {
    const [result] = await this.db
      .select({ count: count() })
      .from(classes);
    return result;
  }

  async getById(id) {
    const [result] = await this.buildClassQuery()
      .where(and(this.ownershipCondition(), eq(classes.id, id)))
      .limit(1);
    return result;
  }

  async getByName(name: string, academicYear: string) {
    const [result] = await this.buildClassQuery()
      .where(and(eq(classes.name, name), eq(classes.academicYear, academicYear)))
      .limit(1);
    return result;
  }

  async getByAcademicYear(academicYear) {
    return await this.buildClassQuery()
      .where(eq(classes.academicYear, academicYear))
      .orderBy(classes.name);
  }

  async getClassSections(classId) {
    return await this.db
      .select(sectionSelect)
      .from(sections)
      .where(eq(sections.classId, classId))
      .orderBy(sections.name);
  }

  // The students placed in the class during its year, from their enrollment
  // placements, never the current projection: a past class lists who sat in
  // it then. Class and section are those of the latest placement in the class.
  async getClassStudents(classId: string, academicYearId: string) {
    return await this.db
      .selectDistinctOn([students.name, students.id], {
        ...studentSelect,
        classId: studentEnrollmentPlacements.classId,
        sectionId: studentEnrollmentPlacements.sectionId,
      })
      .from(studentEnrollmentPlacements)
      .innerJoin(studentEnrollments, eq(studentEnrollmentPlacements.enrollmentId, studentEnrollments.id))
      .innerJoin(students, eq(studentEnrollments.studentId, students.id))
      .leftJoin(users, eq(students.userId, users.id))
      .where(this.placedInClass(classId, academicYearId))
      .orderBy(students.name, students.id, desc(studentEnrollmentPlacements.validFrom));
  }

  private placedInClass(classId: string, academicYearId: string) {
    return and(
      eq(studentEnrollments.academicYearId, academicYearId),
      eq(studentEnrollmentPlacements.classId, classId),
    );
  }

  private studentsPlacedInClass(classId: string, academicYearId: string) {
    return this.db
      .select({ studentId: studentEnrollments.studentId })
      .from(studentEnrollmentPlacements)
      .innerJoin(studentEnrollments, eq(studentEnrollmentPlacements.enrollmentId, studentEnrollments.id))
      .where(this.placedInClass(classId, academicYearId));
  }

  async getTeachers(classId) {
    return await this.db
      .select(teacherSelect)
      .from(teacherAssignments)
      .innerJoin(sections, eq(teacherAssignments.sectionId, sections.id))
      .innerJoin(teachers, eq(teacherAssignments.teacherId, teachers.id))
      .innerJoin(staff, eq(teachers.staffId, staff.id))
      .leftJoin(users, eq(staff.userId, users.id))
      .where(eq(sections.classId, classId))
      .orderBy(staff.name);
  }

  async getClassSubjects(classId) {
    return await this.db
      .selectDistinct({
        id: subjects.id,
        name: subjects.name,
        code: subjects.code,
        description: subjects.description,
        createdAt: subjects.createdAt,
        updatedAt: subjects.updatedAt,
      })
      .from(teacherAssignments)
      .innerJoin(sections, eq(teacherAssignments.sectionId, sections.id))
      .innerJoin(subjects, eq(teacherAssignments.subjectId, subjects.id))
      .where(eq(sections.classId, classId))
      .orderBy(subjects.name);
  }

  // The parents of the students placed in the class during its year, once each.
  async getParents(classId: string, academicYearId: string) {
    return await this.db
      .selectDistinctOn([parents.name, parents.id], parentSelect)
      .from(studentParents)
      .innerJoin(parents, eq(studentParents.parentId, parents.id))
      .leftJoin(users, eq(parents.userId, users.id))
      .where(inArray(studentParents.studentId, this.studentsPlacedInClass(classId, academicYearId)))
      .orderBy(parents.name, parents.id);
  }

  async getAnalytics(classId: string, academicYearId: string) {
    const [sectionsCount] = await this.db
      .select({ count: count() })
      .from(sections)
      .where(eq(sections.classId, classId));

    const [studentsCount] = await this.db
      .select({ count: countDistinct(studentEnrollments.studentId) })
      .from(studentEnrollmentPlacements)
      .innerJoin(studentEnrollments, eq(studentEnrollmentPlacements.enrollmentId, studentEnrollments.id))
      .where(this.placedInClass(classId, academicYearId));

    return {
      totalSections: sectionsCount.count || 0,
      totalStudents: studentsCount.count || 0,
    };
  }

  async getByTeacherId(teacherId) {
    return await this.db
      .select({
        ...classSelect,
        sections: sectionSelect,
      })
      .from(classes)
      .innerJoin(sections, eq(classes.id, sections.classId))
      .innerJoin(sql`teacher_assignments ta`, eq(sections.id, sql`ta.section_id`))
      .where(eq(sql`ta.teacher_id`, teacherId))
      .orderBy(classes.academicYear, classes.name);
  }

  async getByStudentId(studentId) {
    const [result] = await this.db
      .select({
        ...classSelect,
        section: sectionSelect,
      })
      .from(classes)
      .innerJoin(sections, eq(classes.id, sections.classId))
      .innerJoin(students, eq(sections.id, students.sectionId))
      .where(eq(students.id, studentId))
      .limit(1);
    return result;
  }

  async getStudentsByClassName(className: string, sectionName: string | null, academicYear: string) {
    const whereConditions = [eq(classes.name, className), eq(classes.academicYear, academicYear)];

    if (sectionName) {
      whereConditions.push(eq(sections.name, sectionName));
    }

    return await this.db
      .select({
        ...studentSelect,
        sectionName: sections.name,
        className: classes.name,
      })
      .from(students)
      .innerJoin(sections, eq(students.sectionId, sections.id))
      .innerJoin(classes, eq(sections.classId, classes.id))
      .leftJoin(users, eq(students.userId, users.id))
      .where(and(...whereConditions))
      .orderBy(students.name);
  }

  async checkClassHasSections(classId) {
    const [result] = await this.db
      .select({ count: count() })
      .from(sections)
      .where(eq(sections.classId, classId));

    return (result.count || 0) > 0;
  }

  async create(data) {
    const [newClass] = await this.db
      .insert(classes)
      .values(data)
      .returning();
    return newClass;
  }

  async update(id, data) {
    const [updatedClass] = await this.db
      .update(classes)
      .set(data)
      .where(eq(classes.id, id))
      .returning();
    return updatedClass;
  }

  async delete(id) {
    const [deletedClass] = await this.db
      .delete(classes)
      .where(eq(classes.id, id))
      .returning();
    return deletedClass;
  }

  async deleteAll() {
    const deletedClasses = await this.db
      .delete(classes)
      .returning();
    return {
      deletedCount: deletedClasses.length,
      deletedClasses: deletedClasses
    };
  }

}
