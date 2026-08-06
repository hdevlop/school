import { jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

import { idField, userRef } from '@server/database/shared';

export const auditLogs = pgTable('audit_logs', {
  id: idField(),
  userId: userRef('no action'),
  userRole: text('user_role').notNull(),
  action: text('action').notNull(),
  resource: text('resource').notNull(),
  resourceId: text('resource_id'),
  status: text('status').notNull(),
  ipAddress: text('ip_address'),
  metadata: jsonb('metadata'),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
});
