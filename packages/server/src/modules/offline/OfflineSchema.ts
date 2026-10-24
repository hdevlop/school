import { bigserial, index, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import type { ReplicaRecord, SyncContext } from 'najm-database/sync/contracts';

/** Immutable, short-lived downloads; the sequence is a durable read baseline, not a write revision. */
export const offlineSnapshots = pgTable('offline_read_snapshots', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  accountId: text('account_id').notNull(),
  context: jsonb('context').$type<SyncContext>().notNull(),
  pages: jsonb('pages').$type<ReplicaRecord[][]>().notNull(),
  expiresAt: timestamp('expires_at', { mode: 'string', withTimezone: true }).notNull(),
}, table => [index('offline_read_snapshots_account_idx').on(table.accountId)]);
