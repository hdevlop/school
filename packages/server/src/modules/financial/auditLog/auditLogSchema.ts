import { jsonb, pgTable, text, timestamp, index } from 'drizzle-orm/pg-core';

import { actionByRef, idField, timestamps } from '@server/database/shared';

export const financialAuditLogs = pgTable('financial_audit_logs', {
  id: idField(10),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  action: text('action').notNull(),
  actorId: actionByRef('actor_id'),
  before: jsonb('before'),
  after: jsonb('after'),
  metadata: jsonb('metadata'),
  ...timestamps,
}, (table) => ({
  entityCreatedIdx: index('financial_audit_entity_created_idx')
    .on(table.entityType, table.entityId, table.createdAt),
  actorCreatedIdx: index('financial_audit_actor_created_idx')
    .on(table.actorId, table.createdAt),
  actionCreatedIdx: index('financial_audit_action_created_idx')
    .on(table.action, table.createdAt),
}));

export type FinancialAuditLog = typeof financialAuditLogs.$inferSelect;
export type NewFinancialAuditLog = typeof financialAuditLogs.$inferInsert;
