import { DB } from '../../database/db';
import { students, classes, sections, users, parents, studentParents, studentEnrollments, studentEnrollmentPlacements } from '../../database/schema';
import { Repository, t } from '../../najm';
import { Owned, type OwnedWhere } from '../../auth';
import { count, eq, desc, inArray, and, or, gt, lte, isNull, sql } from 'drizzle-orm';
import { Student, studentTeacherInYear } from './StudentGuards';
import { ScopeContext } from '../../auth';
import { Year } from '../academicYears/requestYear';
import type { ResolvedAcademicYear } from '../academicYears/AcademicYearValidator';
import { parentSelect } from '../parents/ParentRepository';

export type StudentListFilters = {
  studentId?: string;
  onDate?: string;
};

export const studentSelect = {
  id: students.id,
  userId: students.userId,
  studentCode: students.studentCode,
  name: students.name,
  email: users.email,
  phone: students.phone,
  address: students.address,
  addressPlaceId: students.addressPlaceId,
  addressLatitude: students.addressLatitude,
  addressLongitude: students.addressLongitude,
  dateOfBirth: students.dateOfBirth,
  age: students.age,
  gender: students.gender,
  classId: students.classId,
  sectionId: students.sectionId,
  enrollmentDate: students.enrollmentDate,
  medicalConditions: students.medicalConditions,
  previousSchool: students.previousSchool,
  status: students.status,
  image: users.image,
  createdAt: students.createdAt,
  updatedAt: students.updatedAt,
};

@Repository()
export class StudentRepository {
  @Year() private readonly year!: ResolvedAcademicYear;
  declare _scopeCtx: ScopeContext;

  declare db: DB;
  @Owned(Student)
  private ownedWhere!: OwnedWhere;

  // ========================================
  // QUERY_BUILDERS (Reusable)
  // ========================================

  private buildStudentQuery() {
    return this.db
      .select({
        ...studentSelect,
        class: {
          id: classes.id,
          name: classes.name,
        },
        section: {
          id: sections.id,
          name: sections.name,
        }
      })
      .from(students)
      .leftJoin(users, eq(students.userId, users.id))
      .leftJoin(classes, eq(students.classId, classes.id))
      .leftJoin(sections, eq(students.sectionId, sections.id));
  }

  // ========================================
  // ALL_METHODS
  // ========================================

  /**
   * One row per enrollment in the year, class and section from its latest
   * placement in that year, never from the current projection; without a
   * placement they stay null. With `onDate`, only the enrollments and
   * placements covering that day (half-open, so a same-day transfer gives the
   * new section): the roster a register marks. Year, filters and ownership
   * are one WHERE.
   */
  async getAll({ studentId, onDate }: StudentListFilters = {}) {
    return this.db
      .selectDistinctOn([students.createdAt, studentEnrollments.id], {
        ...studentSelect,
        status: studentEnrollments.status,
        classId: studentEnrollmentPlacements.classId,
        sectionId: studentEnrollmentPlacements.sectionId,
        class: {
          id: classes.id,
          name: classes.name,
        },
        section: {
          id: sections.id,
          name: sections.name,
        },
        enrollment: {
          id: studentEnrollments.id,
          status: studentEnrollments.status,
          enrolledOn: studentEnrollments.enrolledOn,
          leftOn: studentEnrollments.leftOn,
        },
        placement: {
          id: studentEnrollmentPlacements.id,
          validFrom: studentEnrollmentPlacements.validFrom,
          validTo: studentEnrollmentPlacements.validTo,
        },
      })
      .from(studentEnrollments)
      .innerJoin(students, eq(studentEnrollments.studentId, students.id))
      .leftJoin(users, eq(students.userId, users.id))
      .leftJoin(studentEnrollmentPlacements, eq(studentEnrollmentPlacements.enrollmentId, studentEnrollments.id))
      .leftJoin(classes, eq(studentEnrollmentPlacements.classId, classes.id))
      .leftJoin(sections, eq(studentEnrollmentPlacements.sectionId, sections.id))
      .where(and(
        eq(studentEnrollments.academicYearId, this.year.id),
        studentId ? eq(students.id, studentId) : undefined,
        ...(onDate ? [
          lte(studentEnrollments.enrolledOn, onDate),
          or(isNull(studentEnrollments.leftOn), gt(studentEnrollments.leftOn, onDate)),
          lte(studentEnrollmentPlacements.validFrom, onDate),
          or(isNull(studentEnrollmentPlacements.validTo), gt(studentEnrollmentPlacements.validTo, onDate)),
        ] : []),
        this.ownedWhere(),
        studentTeacherInYear(this.year.id, this._scopeCtx, studentEnrollmentPlacements.id),
        onDate ? undefined : sql`NOT EXISTS (SELECT 1 FROM student_enrollment_placements later
          WHERE later.enrollment_id = ${studentEnrollments.id}
            AND later.valid_from > ${studentEnrollmentPlacements.validFrom})`,
      ))
      .orderBy(desc(students.createdAt), studentEnrollments.id, desc(studentEnrollmentPlacements.validFrom));
  }

  /** The student's identity and current class, through ownership; no year. */
  async getById(id) {
    const [existingStudent] = await this.buildStudentQuery()
      .where(and(this.ownedWhere(), eq(students.id, id)))
      .limit(1);

    if (!existingStudent) return null;
    return existingStudent;
  }

  async getByEmail(email) {
    const [existingStudent] = await this.buildStudentQuery()
      .where(eq(users.email, email))
      .limit(1);
    return existingStudent;
  }

  async getByPhone(phone) {
    const [existingStudent] = await this.buildStudentQuery()
      .where(eq(students.phone, phone))
      .limit(1);
    return existingStudent;
  }

  async getByStudentCode(studentCode) {
    const [existingStudent] = await this.buildStudentQuery()
      .where(eq(students.studentCode, studentCode))
      .limit(1);
    return existingStudent;
  }

  async getByUserId(userId: string) {
    const [existingStudent] = await this.buildStudentQuery()
      .where(and(this.ownedWhere(), eq(students.userId, userId)))
      .limit(1);
    return existingStudent;
  }

  async create(data) {
    const [newStudent] = await this.db
      .insert(students)
      .values(data)
      .returning();
    return newStudent;
  }

  async update(id, data) {
    const [updatedStudent] = await this.db
      .update(students)
      .set(data)
      .where(eq(students.id, id))
      .returning();
    return updatedStudent;
  }

  async delete(id) {
    const [deletedStudent] = await this.db
      .delete(students)
      .where(eq(students.id, id))
      .returning();

    if (deletedStudent?.userId) {
      await this.db
        .delete(users)
        .where(eq(users.id, deletedStudent.userId));
    }
    return deletedStudent;
  }

  async deleteAll() {
    const allStudents = await this.db
      .select({
        id: students.id,
        userId: students.userId
      })
      .from(students);

    const userIds = allStudents
      .map(student => student.userId)
      .filter(userId => userId !== null);

    const deletedStudents = await this.db
      .delete(students)
      .returning();

    if (userIds.length > 0) {
      await this.db
        .delete(users)
        .where(inArray(users.id, userIds));
    }

    return {
      deletedCount: deletedStudents.length,
      deletedStudents: deletedStudents
    };
  }

  async getParentsByStudentId(studentId: string) {
    return this.db
      .select(parentSelect)
      .from(studentParents)
      .innerJoin(parents, eq(studentParents.parentId, parents.id))
      .leftJoin(users, eq(parents.userId, users.id))
      .where(eq(studentParents.studentId, studentId))
      .orderBy(parents.name);
  }

  // School-wide counts for one year over that year's enrollments (one per
  // student), so a year's figures match its student list, including students
  // who left during the year.
  async getCount() {
    const [row] = await this.db
      .select({ count: count() })
      .from(studentEnrollments)
      .innerJoin(students, eq(studentEnrollments.studentId, students.id))
      .where(and(eq(studentEnrollments.academicYearId, this.year.id), this.ownedWhere(), studentTeacherInYear(this.year.id, this._scopeCtx)));
    return row;
  }

  async getStudentsByGender() {
    const genderCounts = await this.db
      .select({
        gender: students.gender,
        count: count(studentEnrollments.id),
      })
      .from(studentEnrollments)
      .innerJoin(students, eq(studentEnrollments.studentId, students.id))
      .where(and(eq(studentEnrollments.academicYearId, this.year.id), this.ownedWhere(), studentTeacherInYear(this.year.id, this._scopeCtx)))
      .groupBy(students.gender);

    return genderCounts
      .filter(item => item.gender === 'M' || item.gender === 'F')
      .map(item => ({
        gender: item.gender,
        name: item.gender === 'M' ? t('common.male') : t('common.female'),
        value: Number(item.count) || 0,
      }));
  }

}
