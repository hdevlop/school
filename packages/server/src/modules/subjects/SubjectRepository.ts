import { Repository } from '../../najm';
import { DB } from '../../database/db';
import { alerts, subjects, subSubjects, teacherAssignments } from '../../database/schema';
import { and, asc, count, eq, exists, inArray, notInArray, or, sql, type SQLWrapper } from 'drizzle-orm';

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
    return this.withSubSubjects(await this.buildSubjectQuery()
      .orderBy(subjects.name));
  }

  async getById(id) {
    const [result] = await this.buildSubjectQuery()
      .where(eq(subjects.id, id))
      .limit(1);
    return result ? (await this.withSubSubjects([result]))[0] : undefined;
  }

  // ========================================
  // SUB-SUBJECTS
  // ========================================

  private async withSubSubjects<T extends { id: string }>(rows: T[]) {
    if (!rows.length) return rows.map(row => ({ ...row, subSubjects: [] as Array<{ id: string; name: string }> }));
    const parts = await this.db.select({ id: subSubjects.id, subjectId: subSubjects.subjectId, name: subSubjects.name }).from(subSubjects)
      .where(inArray(subSubjects.subjectId, rows.map(row => row.id))).orderBy(asc(subSubjects.position), asc(subSubjects.name));
    return rows.map(row => ({ ...row, subSubjects: parts.filter(part => part.subjectId === row.id).map(({ id, name }) => ({ id, name })) }));
  }

  /** Every subject and sub-subject name in the school: a name may name only one. */
  async allNames() {
    const parts = await this.db.select({ id: subSubjects.id, subjectId: subSubjects.subjectId, name: subSubjects.name }).from(subSubjects);
    const names = await this.db.select({ id: subjects.id, name: subjects.name }).from(subjects);
    return { subjects: names, subSubjects: parts };
  }

  /**
   * Makes the subject's sub-subjects exactly this list, in this order, keeping
   * the id of each one kept. Returns the renamed ones.
   */
  async saveSubSubjects(subjectId: string, list: Array<{ id?: string; name: string }>) {
    const existing = await this.db.select({ id: subSubjects.id, name: subSubjects.name }).from(subSubjects).where(eq(subSubjects.subjectId, subjectId));
    const kept = list.filter(item => item.id && existing.some(row => row.id === item.id));
    await this.db.delete(subSubjects).where(kept.length
      ? and(eq(subSubjects.subjectId, subjectId), notInArray(subSubjects.id, kept.map(item => item.id as string)))
      : eq(subSubjects.subjectId, subjectId));
    const renamed = kept.flatMap(item => { const row = existing.find(old => old.id === item.id)!; return row.name !== item.name ? [{ id: row.id, from: row.name, to: item.name }] : []; });
    // Two names swapped would collide on the unique name for a moment: park them first.
    for (const item of renamed) await this.db.update(subSubjects).set({ name: `__renaming__${item.id}` }).where(eq(subSubjects.id, item.id));
    for (const [position, item] of list.entries()) {
      if (item.id && kept.includes(item)) await this.db.update(subSubjects).set({ name: item.name, position, updatedAt: sql`CURRENT_TIMESTAMP` }).where(eq(subSubjects.id, item.id));
      else await this.db.insert(subSubjects).values({ subjectId, name: item.name, position });
    }
    return renamed.map(({ from, to }) => ({ from, to }));
  }

  /** Adds sub-subjects after the subject's last one. */
  async addSubSubjects(items: Array<{ subjectId: string; name: string }>) {
    for (const item of items) {
      const [last] = await this.db.select({ position: sql<number>`coalesce(max(${subSubjects.position}), -1)` }).from(subSubjects).where(eq(subSubjects.subjectId, item.subjectId));
      await this.db.insert(subSubjects).values({ subjectId: item.subjectId, name: item.name, position: Number(last?.position ?? -1) + 1 });
    }
  }

  async getByName(name) {
    const [result] = await this.buildSubjectQuery()
      .where(eq(subjects.name, name))
      .limit(1);
    return result;
  }

  async getByCode(code) {
    const [result] = await this.buildSubjectQuery()
      .where(sql`upper(btrim(${subjects.code})) = ${code.trim().toUpperCase()}`)
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
