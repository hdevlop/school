import { sql } from 'drizzle-orm';
import { check, index, integer, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

import { usersTable } from '../../auth';
import { idField, timestamps } from '../../database/shared';

export const notifications = pgTable('notifications', {
  id: idField(21),
  recipientUserId: text('recipient_user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  sourceKey: text('source_key').notNull(),
  topic: text('topic').notNull(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  href: text('href'),
  readAt: timestamp('read_at', { mode: 'string' }),
  ...timestamps,
}, (table) => ({
  sourceRecipientUnique: uniqueIndex('notifications_source_recipient_unique').on(table.sourceKey, table.recipientUserId),
  recipientUnreadCreatedIdx: index('notifications_recipient_unread_created_idx').on(table.recipientUserId, table.readAt, table.createdAt),
  readAfterCreate: check('notifications_read_after_create_check', sql`${table.readAt} IS NULL OR ${table.readAt} >= ${table.createdAt}`),
}));

export const pushSubscriptions = pgTable('push_subscriptions', {
  id: idField(21),
  userId: text('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  endpointHash: text('endpoint_hash').notNull(),
  endpointCiphertext: text('endpoint_ciphertext').notNull(),
  p256dhCiphertext: text('p256dh_ciphertext').notNull(),
  authCiphertext: text('auth_ciphertext').notNull(),
  endpointFingerprint: text('endpoint_fingerprint').notNull(),
  userAgentFamily: text('user_agent_family'),
  disabledAt: timestamp('disabled_at', { mode: 'string' }),
  lastSuccessAt: timestamp('last_success_at', { mode: 'string' }),
  lastFailureAt: timestamp('last_failure_at', { mode: 'string' }),
  ...timestamps,
}, (table) => ({
  endpointUnique: uniqueIndex('push_subscriptions_endpoint_hash_unique').on(table.endpointHash),
  userActiveIdx: index('push_subscriptions_user_disabled_idx').on(table.userId, table.disabledAt),
}));

export const notificationDeliveries = pgTable('notification_deliveries', {
  id: idField(21),
  notificationId: text('notification_id').notNull().references(() => notifications.id, { onDelete: 'cascade' }),
  pushSubscriptionId: text('push_subscription_id').references(() => pushSubscriptions.id, { onDelete: 'set null' }),
  status: text('status').notNull().default('pending'),
  attempts: integer('attempts').notNull().default(0),
  availableAt: timestamp('available_at', { mode: 'string' }).notNull().defaultNow(),
  leasedAt: timestamp('leased_at', { mode: 'string' }),
  processedAt: timestamp('processed_at', { mode: 'string' }),
  lastErrorCode: text('last_error_code'),
  ...timestamps,
}, (table) => ({
  notificationTargetUnique: uniqueIndex('notification_deliveries_notification_target_unique').on(table.notificationId, table.pushSubscriptionId),
  pendingIdx: index('notification_deliveries_status_available_idx').on(table.status, table.availableAt),
  statusCheck: check('notification_deliveries_status_check', sql`${table.status} IN ('pending','processing','sent','failed','skipped','dead')`),
  attemptsCheck: check('notification_deliveries_attempts_check', sql`${table.attempts} >= 0`),
}));

export type Notification = typeof notifications.$inferSelect;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type NotificationDelivery = typeof notificationDeliveries.$inferSelect;
