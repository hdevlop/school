import { Repository } from '@server/najm';
import { DB } from '@server/database/db';
import { subjects } from '@server/database/schema';
import { eq } from 'drizzle-orm';

export const subjectSelect = {
  id: subjects.id,
  name: subjects.name,
  code: subjects.code,
  description: subjects.description,
  createdAt: subjects.createdAt,
  updatedAt: subjects.updatedAt,
};

@Repository()
export class SubjectRepository {
  declare db: DB;

  // ========================================
  // QUERY_BUILDERS (Reusable)
  // ========================================

  private buildSubjectQuery() {
    return this.db
      .select(subjectSelect)
      .from(subjects);
  }

  // ========================================
  // GET / READ METHODS
  // ========================================

  async getAll() {
    return await this.getAllSubjects();
  }

  async getAllSubjects() {
    return await this.buildSubjectQuery()
      .orderBy(subjects.name);
  }

  async getById(id) {
    const [result] = await this.buildSubjectQuery()
      .where(eq(subjects.id, id))
      .limit(1);
    return result;
  }

  async getByName(name) {
    const [result] = await this.buildSubjectQuery()
      .where(eq(subjects.name, name))
      .limit(1);
    return result;
  }

  async getByCode(code) {
    const [result] = await this.buildSubjectQuery()
      .where(eq(subjects.code, code))
      .limit(1);
    return result;
  }

  // ========================================
  // CREATE_METHODS
  // ========================================

  async create(data) {
    const [newSubject] = await this.db
      .insert(subjects)
      .values(data)
      .returning();
    return newSubject;
  }

  // ========================================
  // UPDATE_METHODS
  // ========================================

  async update(id, data) {
    const [updatedSubject] = await this.db
      .update(subjects)
      .set(data)
      .where(eq(subjects.id, id))
      .returning();
    return updatedSubject;
  }

  // ========================================
  // DELETE_METHODS
  // ========================================

  async delete(id) {
    const [deletedSubject] = await this.db
      .delete(subjects)
      .where(eq(subjects.id, id))
      .returning();
    return deletedSubject;
  }

  async deleteAll() {
    const deletedSubjects = await this.db
      .delete(subjects)
      .returning();
    return {
      deletedCount: deletedSubjects.length,
      deletedSubjects: deletedSubjects
    };
  }
}