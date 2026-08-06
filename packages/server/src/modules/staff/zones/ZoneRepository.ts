import { eq } from 'drizzle-orm';
import { DB } from '@server/database/db';
import { zones } from '@server/database/schema';
import { Repository } from '@server/najm';

const zoneSelect = {
  id: zones.id,
  name: zones.name,
  building: zones.building,
  floor: zones.floor,
  description: zones.description,
  createdAt: zones.createdAt,
  updatedAt: zones.updatedAt,
};

@Repository()
export class ZoneRepository {
  declare db: DB;

  private buildQuery() {
    return this.db.select(zoneSelect).from(zones);
  }

  async getAll() {
    return this.buildQuery().orderBy(zones.name);
  }

  async getById(id: string) {
    const [row] = await this.buildQuery().where(eq(zones.id, id)).limit(1);
    return row || null;
  }

  async getByName(name: string) {
    const [row] = await this.buildQuery().where(eq(zones.name, name)).limit(1);
    return row || null;
  }

  async create(data: typeof zones.$inferInsert) {
    const [row] = await this.db.insert(zones).values(data).returning();
    return row;
  }

  async update(id: string, data: Partial<typeof zones.$inferInsert>) {
    const [row] = await this.db.update(zones).set(data).where(eq(zones.id, id)).returning();
    return row;
  }

  async delete(id: string) {
    const [row] = await this.db.delete(zones).where(eq(zones.id, id)).returning();
    return row;
  }
}
