import { Repository } from '../../najm';
import { DB } from '../../database/db';
import { alerts, classes, staff, subjectLevelLists, subjects, subSubjects, teacherAssignments, teachers } from '../../database/schema';
import { and, asc, count, eq, exists, inArray, isNull, notInArray, or, sql, type SQLWrapper } from 'drizzle-orm';

/** A level (class name) matched without case or outer spaces. */
const sameLevel = (column: SQLWrapper, level: string) => sql`lower(btrim(${column})) = lower(btrim(${level}))`;

export const subjectSelect = {
  id: subjects.id,
  name: subjects.name,
  nameAr: subjects.nameAr,
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

  /** Each subject's school list (the one levels without their own use). */
  private async withSubSubjects<T extends { id: string }>(rows: T[]) {
    if (!rows.length) return rows.map(row => ({ ...row, subSubjects: [] as Array<{ id: string; name: string }> }));
    const parts = await this.db.select({ id: subSubjects.id, subjectId: subSubjects.subjectId, name: subSubjects.name }).from(subSubjects)
      .where(and(inArray(subSubjects.subjectId, rows.map(row => row.id)), isNull(subSubjects.level))).orderBy(asc(subSubjects.position), asc(subSubjects.name));
    return rows.map(row => ({ ...row, subSubjects: parts.filter(part => part.subjectId === row.id).map(({ id, name }) => ({ id, name })) }));
  }

  /** Every subject name (and Arabic name) and every sub-subject name of every list: a name may name only one subject. */
  async allNames() {
    const parts = await this.db.select({ id: subSubjects.id, subjectId: subSubjects.subjectId, name: subSubjects.name, level: subSubjects.level }).from(subSubjects);
    const names = await this.db.select({ id: subjects.id, name: subjects.name, nameAr: subjects.nameAr }).from(subjects);
    return { subjects: names, subSubjects: parts };
  }

  // ========================================
  // A LEVEL'S OWN LIST
  // ========================================

  /** Every level's own list: which subject, which level, its names in order. */
  async levelLists() {
    const lists = await this.db.select({ subjectId: subjectLevelLists.subjectId, level: subjectLevelLists.level }).from(subjectLevelLists).orderBy(asc(subjectLevelLists.level));
    const parts = await this.db.select({ subjectId: subSubjects.subjectId, level: subSubjects.level, name: subSubjects.name }).from(subSubjects)
      .where(sql`${subSubjects.level} is not null`).orderBy(asc(subSubjects.position), asc(subSubjects.name));
    const same = (a: string | null, b: string) => (a ?? '').trim().toLowerCase() === b.trim().toLowerCase();
    return lists.map(list => ({ ...list, names: parts.filter(part => part.subjectId === list.subjectId && same(part.level, list.level)).map(part => part.name) }));
  }

  /** The list one level is taught: its own once saved, the subject's starting list before that. */
  async levelList(subjectId: string, level: string) {
    const [own] = await this.db.select({ id: subjectLevelLists.id }).from(subjectLevelLists)
      .where(and(eq(subjectLevelLists.subjectId, subjectId), sameLevel(subjectLevelLists.level, level))).limit(1);
    const parts = await this.db.select({ id: subSubjects.id, name: subSubjects.name }).from(subSubjects)
      .where(and(eq(subSubjects.subjectId, subjectId), own ? sameLevel(subSubjects.level, level) : isNull(subSubjects.level)))
      .orderBy(asc(subSubjects.position), asc(subSubjects.name));
    return { level: level.trim(), custom: !!own, subSubjects: parts };
  }

  /** Makes the level's list exactly these names, in order. */
  async saveLevelList(subjectId: string, level: string, names: string[]) {
    await this.db.delete(subSubjects).where(and(eq(subSubjects.subjectId, subjectId), sameLevel(subSubjects.level, level)));
    await this.db.delete(subjectLevelLists).where(and(eq(subjectLevelLists.subjectId, subjectId), sameLevel(subjectLevelLists.level, level)));
    await this.db.insert(subjectLevelLists).values({ subjectId, level: level.trim() });
    for (const [position, name] of names.entries()) await this.db.insert(subSubjects).values({ subjectId, name, level: level.trim(), position });
  }

  /** Whether this user teaches the subject in a class of that name, in any year. */
  async teachesInLevel(userId: string, subjectId: string, level: string) {
    const [row] = await this.db.select({ id: teacherAssignments.id }).from(teacherAssignments)
      .innerJoin(teachers, eq(teachers.id, teacherAssignments.teacherId))
      .innerJoin(staff, eq(staff.id, teachers.staffId))
      .innerJoin(classes, eq(classes.id, teacherAssignments.classId))
      .where(and(eq(staff.userId, userId), eq(teacherAssignments.subjectId, subjectId), sameLevel(classes.name, level)))
      .limit(1);
    return !!row;
  }

  /**
   * Makes the subject's school list exactly this list, in this order, keeping
   * the id of each one kept. Returns the renamed ones. Levels' own lists stay.
   */
  async saveSubSubjects(subjectId: string, list: Array<{ id?: string; name: string }>) {
    const school = and(eq(subSubjects.subjectId, subjectId), isNull(subSubjects.level));
    const existing = await this.db.select({ id: subSubjects.id, name: subSubjects.name }).from(subSubjects).where(school);
    const kept = list.filter(item => item.id && existing.some(row => row.id === item.id));
    await this.db.delete(subSubjects).where(kept.length
      ? and(school, notInArray(subSubjects.id, kept.map(item => item.id as string)))
      : school);
    const renamed = kept.flatMap(item => { const row = existing.find(old => old.id === item.id)!; return row.name !== item.name ? [{ id: row.id, from: row.name, to: item.name }] : []; });
    // Two names swapped would collide on the unique name for a moment: park them first.
    for (const item of renamed) await this.db.update(subSubjects).set({ name: `__renaming__${item.id}` }).where(eq(subSubjects.id, item.id));
    for (const [position, item] of list.entries()) {
      if (item.id && kept.includes(item)) await this.db.update(subSubjects).set({ name: item.name, position, updatedAt: sql`CURRENT_TIMESTAMP` }).where(eq(subSubjects.id, item.id));
      else await this.db.insert(subSubjects).values({ subjectId, name: item.name, position });
    }
    return renamed.map(({ from, to }) => ({ from, to }));
  }

  /** Adds sub-subjects after the last one of the subject's school list. */
  async addSubSubjects(items: Array<{ subjectId: string; name: string }>) {
    for (const item of items) {
      const [last] = await this.db.select({ position: sql<number>`coalesce(max(${subSubjects.position}), -1)` }).from(subSubjects).where(and(eq(subSubjects.subjectId, item.subjectId), isNull(subSubjects.level)));
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
