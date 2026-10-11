import { and, desc, eq } from 'drizzle-orm';
import { Repository } from '../../najm';
import type { DB } from '../../database/db';
import { cycles } from '../cycles/cycleSchema';
import { visitRequests } from './VisitRequestSchema';
import type { VisitRequestStatus } from '@sms/contracts';

@Repository()
export class VisitRequestRepository {
  declare db: DB;
  list(status?: VisitRequestStatus) { return this.db.select().from(visitRequests).where(status ? eq(visitRequests.status, status) : undefined).orderBy(desc(visitRequests.createdAt)); }
  async find(id: string) { const [row] = await this.db.select().from(visitRequests).where(eq(visitRequests.id, id)); return row; }
  async activeCycle(id: string) { const [row] = await this.db.select({ id: cycles.id }).from(cycles).where(and(eq(cycles.id, id), eq(cycles.active, true))); return row; }
  async create(input: typeof visitRequests.$inferInsert) { const [row] = await this.db.insert(visitRequests).values(input).returning(); return row; }
  async update(id: string, input: Partial<typeof visitRequests.$inferInsert>) { const [row] = await this.db.update(visitRequests).set(input).where(eq(visitRequests.id, id)).returning(); return row; }
}
