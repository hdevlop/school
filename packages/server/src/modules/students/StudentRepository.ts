import { DB } from '@server/database/db';
import { students, classes, sections, users, parents, studentParents } from '@server/database/schema';
import { Repository, t } from '@server/najm';
import { Owned } from '@server/auth';
import { count, eq, desc,inArray } from 'drizzle-orm';
import { Student } from './StudentGuards';
import { parentSelect } from '../parents/ParentRepository';

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

@Owned(Student)
@Repository()
export class StudentRepository {

  declare db: DB;
  declare scope: (query: any) => any;

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

  async getAll() {
    return this.scope(this.buildStudentQuery()).orderBy(desc(students.createdAt));
  }

  async getById(id) {
    const [existingStudent] = await this.scope(this.buildStudentQuery())
      .where(eq(students.id, id))
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
    const [existingStudent] = await this.scope(this.buildStudentQuery())
      .where(eq(students.userId, userId))
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

  async getCount() {
    const [studentsCount] = await this.db
      .select({ count: count() })
      .from(students);
    return studentsCount;
  }

  async getStudentsByGender() {
    const genderCounts = await this.db
      .select({
        gender: students.gender,
        count: count(students.id),
      })
      .from(students)
      .where(eq(students.status, 'active'))
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
