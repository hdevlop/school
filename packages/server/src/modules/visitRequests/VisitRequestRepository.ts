import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import { Repository } from '../../najm';
import type { DB } from '../../database/db';
import { cycles } from '../cycles/cycleSchema';
import { visitRequests } from './VisitRequestSchema';
import type { VisitRequestStatus } from '@sms/contracts';

@Repository()
export class VisitRequestRepository {
  declare db: DB;

  /** Current office follow-up, shared across academic years. New enquiries come first, oldest first. */
  async getDashboardSummary() {
    const [counts, queue] = await Promise.all([
      this.db.select({
        newRequests: sql<number>`COUNT(*) FILTER (WHERE ${visitRequests.status} = 'new')`.mapWith(Number),
        contactedRequests: sql<number>`COUNT(*) FILTER (WHERE ${visitRequests.status} = 'contacted')`.mapWith(Number),
      }).from(visitRequests),
      this.db.select({
        id: visitRequests.id,
        parentName: visitRequests.parentName,
        phone: visitRequests.phone,
        status: visitRequests.status,
        createdAt: visitRequests.createdAt,
      }).from(visitRequests)
        .where(inArray(visitRequests.status, ['new', 'contacted']))
        .orderBy(sql`CASE WHEN ${visitRequests.status} = 'new' THEN 0 ELSE 1 END`, asc(visitRequests.createdAt), asc(visitRequests.id))
        .limit(5),
    ]);
    return { newRequests: counts[0]?.newRequests ?? 0, contactedRequests: counts[0]?.contactedRequests ?? 0, queue };
  }

  list(status?: VisitRequestStatus) { return this.db.select().from(visitRequests).where(status ? eq(visitRequests.status, status) : undefined).orderBy(desc(visitRequests.createdAt)); }
  async find(id: string) { const [row] = await this.db.select().from(visitRequests).where(eq(visitRequests.id, id)); return row; }
  async activeCycle(id: string) { const [row] = await this.db.select({ id: cycles.id }).from(cycles).where(and(eq(cycles.id, id), eq(cycles.active, true))); return row; }
  async create(input: typeof visitRequests.$inferInsert) { const [row] = await this.db.insert(visitRequests).values(input).returning(); return row; }
  async update(id: string, input: Partial<typeof visitRequests.$inferInsert>) { const [row] = await this.db.update(visitRequests).set(input).where(eq(visitRequests.id, id)).returning(); return row; }
}
