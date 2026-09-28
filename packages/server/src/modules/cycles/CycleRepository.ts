import { and, eq, exists, or } from 'drizzle-orm';
import { DB } from '../../database/db';
import { accountantAssignments, classes, cycles } from '../../database/schema';
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

  // A cycle is shared by every year. A class of any year, or an accountant's
  // assignment, that names it keeps it; deleting it would quietly unlink past
  // years' classes, or fail on the assignment.
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
}
