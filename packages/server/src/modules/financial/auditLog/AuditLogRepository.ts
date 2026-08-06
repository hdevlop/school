import { Repository } from '@server/najm';
import { and, desc, eq, sql } from 'drizzle-orm';
import { financialAuditLogs } from './auditLogSchema';
import { DB } from '@server/database/db';

@Repository()
export class AuditLogRepository {
  declare db: DB;

  async create(data: {
    entityType: string;
    entityId: string;
    action: string;
    actorId?: string | null;
    before?: any;
    after?: any;
    metadata?: any;
  }) {
    const [row] = await this.db
      .insert(financialAuditLogs)
      .values({
        entityType: data.entityType,
        entityId: data.entityId,
        action: data.action,
        actorId: data.actorId ?? null,
        before: data.before ?? null,
        after: data.after ?? null,
        metadata: data.metadata ?? null,
      })
      .returning();
    return row;
  }

  async list(filters: {
    entityType?: string;
    entityId?: string;
    action?: string;
    actorId?: string;
    limit?: number;
    offset?: number;
  }) {
    const conditions = [] as any[];
    if (filters.entityType) conditions.push(eq(financialAuditLogs.entityType, filters.entityType));
    if (filters.entityId) conditions.push(eq(financialAuditLogs.entityId, filters.entityId));
    if (filters.action) conditions.push(eq(financialAuditLogs.action, filters.action));
    if (filters.actorId) conditions.push(eq(financialAuditLogs.actorId, filters.actorId));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const limit = filters.limit ?? 100;
    const offset = filters.offset ?? 0;

    return await this.db
      .select()
      .from(financialAuditLogs)
      .where(where as any)
      .orderBy(desc(financialAuditLogs.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async getById(id: string) {
    const [row] = await this.db
      .select()
      .from(financialAuditLogs)
      .where(eq(financialAuditLogs.id, id))
      .limit(1);
    return row || null;
  }

  async count(filters: { entityType?: string; entityId?: string; action?: string; actorId?: string }) {
    const conditions = [] as any[];
    if (filters.entityType) conditions.push(eq(financialAuditLogs.entityType, filters.entityType));
    if (filters.entityId) conditions.push(eq(financialAuditLogs.entityId, filters.entityId));
    if (filters.action) conditions.push(eq(financialAuditLogs.action, filters.action));
    if (filters.actorId) conditions.push(eq(financialAuditLogs.actorId, filters.actorId));
    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const [row] = await this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(financialAuditLogs)
      .where(where as any);
    return Number(row?.count ?? 0);
  }
}
