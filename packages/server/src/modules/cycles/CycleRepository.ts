import { and, eq, exists, inArray, or } from 'drizzle-orm';
import { DB } from '../../database/db';
import { accountantAssignments, classes, cycles, sections } from '../../database/schema';
import { Repository } from '../../najm';

const cycleSelect = {
  id: cycles.id,
  name: cycles.name,
  labels: cycles.labels,
  sortOrder: cycles.sortOrder,
  active: cycles.active,
  createdAt: cycles.createdAt,
  updatedAt: cycles.updatedAt,
};

@Repository()
export class CycleRepository {
  declare db: DB;

  private buildQuery() {
    return this.db.select(cycleSelect).from(cycles);
  }

  async getAll() {
    return this.buildQuery().orderBy(cycles.sortOrder, cycles.name);
  }

  async getActive() {
    return this.buildQuery().where(eq(cycles.active, true)).orderBy(cycles.sortOrder, cycles.name);
  }

  async getById(id: string) {
    const [row] = await this.buildQuery().where(eq(cycles.id, id)).limit(1);
    return row || null;
  }

  async getByName(name: string) {
    const [row] = await this.buildQuery().where(eq(cycles.name, name)).limit(1);
    return row || null;
  }

  async lockForMutation(id: string) {
    await this.db.select({ id: cycles.id }).from(cycles)
      .where(eq(cycles.id, id)).for('update');
  }

  // Cycle deletion is an explicit all-years operation on this shared catalog.
  // Lock parents before children so new classes/sections cannot join midway.
  async lockClassesForDeletion(cycleId: string) {
    return this.db.select({ id: classes.id }).from(classes)
      .where(eq(classes.cycleId, cycleId)).orderBy(classes.id).for('update');
  }

  async lockSectionsForDeletion(classIds: string[]) {
    if (!classIds.length) return [];
    return this.db.select({ id: sections.id }).from(sections)
      .where(inArray(sections.classId, classIds)).orderBy(sections.id).for('update');
  }

  async deleteClassSections(classIds: string[]) {
    if (!classIds.length) return;
    await this.db.delete(sections).where(inArray(sections.classId, classIds));
  }

  async deleteClasses(cycleId: string) {
    await this.db.delete(classes).where(eq(classes.cycleId, cycleId));
  }

  // Check after the class cascade: accountant assignments still protect the
  // cycle, and no class may be left behind and silently unlinked.
  async isInUse(id: string) {
    const [row] = await this.db.select({ id: cycles.id }).from(cycles).where(and(eq(cycles.id, id), or(
      exists(this.db.select({ id: classes.id }).from(classes).where(eq(classes.cycleId, id))),
      exists(this.db.select({ id: accountantAssignments.id }).from(accountantAssignments)
        .where(eq(accountantAssignments.cycleId, id))),
    ))).limit(1);
    return !!row;
  }

  async create(data: typeof cycles.$inferInsert) {
    const [row] = await this.db.insert(cycles).values(data).returning();
    return row;
  }

  async update(id: string, data: Partial<typeof cycles.$inferInsert>) {
    const [row] = await this.db.update(cycles).set(data).where(eq(cycles.id, id)).returning();
    return row;
  }

  async delete(id: string) {
    const [row] = await this.db.delete(cycles).where(eq(cycles.id, id)).returning();
    return row;
  }

  // Trusted all-years reset, after classes and staff assignments are cleared.
  async clearForSeedReset() {
    await this.db.delete(cycles);
  }
}
