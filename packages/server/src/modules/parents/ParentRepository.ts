import { DB } from '@server/database/db';
import { parents, users, students, studentParents } from '@server/database/schema';
import { count, eq, desc, and, inArray, ilike, or, sql } from 'drizzle-orm';
import { Repository } from '@server/najm';
import { Owned } from '@server/auth';
import { Parent } from './ParentGuards';

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

@Owned(Parent)
@Repository()
export class ParentRepository {

  db: DB;
  declare scope: (query: any) => any;

  // ========================================
  // QUERY_BUILDERS (Reusable)
  // ========================================


  private buildParentQuery() {
    const childrenCounts = this.db
      .select({
        parentId: studentParents.parentId,
        totalChildren: sql<number>`COUNT(${studentParents.studentId})::int`.as('totalChildren'),
      })
      .from(studentParents)
      .groupBy(studentParents.parentId)
      .as('childrenCounts');

    return this.db
      .select({
        ...parentSelect,
        totalChildren: sql<number>`COALESCE(${childrenCounts.totalChildren}, 0)::int`,
        isOrphaned: sql<boolean>`COALESCE(${childrenCounts.totalChildren}, 0) = 0`,
      })
      .from(parents)
      .leftJoin(users, eq(parents.userId, users.id))
      .leftJoin(childrenCounts, eq(childrenCounts.parentId, parents.id));
  }

  private buildChildrenQuery() {
    return this.db
      .select({
        ...studentSelect,
        isEmergencyContact: parents.isEmergencyContact,
        financialResponsibility: parents.financialResponsibility,
        relationshipType: parents.relationshipType,
      })
      .from(studentParents)
      .innerJoin(students, eq(studentParents.studentId, students.id))
      .innerJoin(parents, eq(studentParents.parentId, parents.id))
      .leftJoin(users, eq(students.userId, users.id));
  }

  // ========================================
  // GET_READ_METHODS
  // ========================================

  async getCount() {
    const [parentsCount] = await this.db
      .select({ count: count() })
      .from(parents);
    return parentsCount;
  }

  async getAll() {
    return await this.scope(this.buildParentQuery())
      .orderBy(desc(parents.createdAt));
  }

  async search(query: string, limit = 20) {
    const pattern = `%${query}%`;
    return await this.scope(this.buildParentQuery())
      .where(
        or(
          ilike(parents.name, pattern),
          ilike(parents.cin, pattern),
          ilike(parents.phone, pattern),
          ilike(users.email, pattern)
        )
      )
      .orderBy(parents.name)
      .limit(limit);
  }

  async getById(id) {
    const [existingParent] = await this.scope(this.buildParentQuery())
      .where(eq(parents.id, id))
      .limit(1);

    return existingParent;
  }

  async getByEmail(email) {
    const [existingParent] = await this.buildParentQuery()
      .where(eq(users.email, email))
      .limit(1);
    return existingParent;
  }

  async getByCin(cin) {
    const [existingParent] = await this.buildParentQuery()
      .where(eq(parents.cin, cin))
      .limit(1);
    return existingParent;
  }

  async getByPhone(phone) {
    const [existingParent] = await this.buildParentQuery()
      .where(eq(parents.phone, phone))
      .limit(1);
    return existingParent;
  }

  async getByUserId(userId: string) {
    const [existingParent] = await this.scope(this.buildParentQuery())
      .where(eq(parents.userId, userId))
      .limit(1);
    return existingParent;
  }

  async getByRelationshipType(relationshipType) {
    return await this.buildParentQuery()
      .where(eq(parents.relationshipType, relationshipType))
      .orderBy(parents.name);
  }

  async getEmergencyContacts() {
    return await this.buildParentQuery()
      .where(eq(parents.isEmergencyContact, true))
      .orderBy(parents.name);
  }

  async getChildren(parentId) {
    return await this.buildChildrenQuery()
      .where(eq(studentParents.parentId, parentId))
      .orderBy(students.name);
  }

  async checkStudentExists(studentId) {
    const [student] = await this.db
      .select({ id: students.id })
      .from(students)
      .where(eq(students.id, studentId))
      .limit(1);

    return !!student;
  }

  async checkStudentLinked(parentId, studentId) {
    const [link] = await this.db
      .select({ id: studentParents.id })
      .from(studentParents)
      .where(
        and(
          eq(studentParents.parentId, parentId),
          eq(studentParents.studentId, studentId)
        )
      )
      .limit(1);

    return !!link;
  }

  async checkLinkedToStudents(parentId) {
    const [link] = await this.db
      .select({ count: count() })
      .from(studentParents)
      .where(eq(studentParents.parentId, parentId))
      .limit(1);

    return link.count > 0;
  }

  async getChildrenCount(parentId) {
    const [childrenData] = await this.db
      .select({
        totalChildren: count(studentParents.studentId),
      })
      .from(studentParents)
      .where(eq(studentParents.parentId, parentId));

    return {
      totalChildren: Number(childrenData.totalChildren) || 0,
    };
  }

  // ========================================
  // CREATE_METHODS
  // ========================================

  async create(data) {
    const [newParent] = await this.db
      .insert(parents)
      .values(data)
      .returning();
    return newParent;
  }

  async linkStudent(linkData) {
    const [link] = await this.db
      .insert(studentParents)
      .values(linkData)
      .returning();
    return link;
  }

  // ========================================
  // UPDATE_METHODS
  // ========================================

  async update(id, data) {
    const [updatedParent] = await this.db
      .update(parents)
      .set(data)
      .where(eq(parents.id, id))
      .returning();
    return updatedParent;
  }

  // ========================================
  // DELETE_METHODS
  // ========================================

  async delete(id) {
    const [deletedParent] = await this.db
      .delete(parents)
      .where(eq(parents.id, id))
      .returning();

    if (deletedParent?.userId) {
      await this.db
        .delete(users)
        .where(eq(users.id, deletedParent.userId));
    }
    return deletedParent;
  }

  async unlinkStudent(parentId, studentId) {
    const [unlink] = await this.db
      .delete(studentParents)
      .where(
        and(
          eq(studentParents.parentId, parentId),
          eq(studentParents.studentId, studentId)
        )
      )
      .returning();
    return unlink;
  }

  async deleteAll() {
    const allParents = await this.buildParentQuery()
      .orderBy(desc(parents.createdAt));

    const userIds = allParents
      .map(parent => parent.userId)
      .filter(userId => userId !== null);

    const deletedParents = await this.db
      .delete(parents)
      .returning();

    if (userIds.length > 0) {
      await this.db
        .delete(users)
        .where(inArray(users.id, userIds))
        .returning();
    }

    return {
      deletedCount: deletedParents.length,
      deletedParents: deletedParents,
    };
  }

}
