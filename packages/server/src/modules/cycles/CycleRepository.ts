import { eq } from 'drizzle-orm';
import { DB } from '@server/database/db';
import { cycles } from '@server/database/schema';
import { Repository } from '@server/najm';

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
