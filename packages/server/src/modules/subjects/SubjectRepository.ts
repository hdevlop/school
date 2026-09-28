import { Repository } from '../../najm';
import { DB } from '../../database/db';
import { alerts, subjects, teacherAssignments } from '../../database/schema';
import { and, count, eq, exists, or, type SQLWrapper } from 'drizzle-orm';

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

  // A subject is shared by every year. Any year's teacher assignment or alert
  // that names it keeps it: deleting it would cascade the assignments away,
  // with the lessons, marks and attendance they explain, or fail on them.
  private usedBy(subjectId: string | SQLWrapper) {
    return or(
      exists(this.db.select({ id: teacherAssignments.id }).from(teacherAssignments)
        .where(eq(teacherAssignments.subjectId, subjectId))),
      exists(this.db.select({ id: alerts.id }).from(alerts)
        .where(eq(alerts.subjectId, subjectId))),
    );
  }

  async isInUse(id: string) {
    const [row] = await this.db.select({ id: subjects.id }).from(subjects)
      .where(and(eq(subjects.id, id), this.usedBy(id))).limit(1);
    return !!row;
  }

  async countInUse() {
    const [row] = await this.db.select({ count: count() }).from(subjects)
      .where(this.usedBy(subjects.id));
    return row.count;
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

  // The trusted seed reset, after teachers and their assignments are gone.
  async clearForSeedReset() {
    await this.db.delete(subjects);
  }
}