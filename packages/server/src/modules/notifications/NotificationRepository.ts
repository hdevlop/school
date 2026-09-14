import { and, count, desc, eq, inArray, isNull, sql } from 'drizzle-orm';

import { Repository } from '@server/najm';
import { DB } from '@server/database/db';
import { parents, studentParents } from '@server/database/schema';
import { NOTIFICATION_BATCH_SIZE, NOTIFICATION_MAX_ATTEMPTS } from './notificationConfig';
import { notificationDeliveries, notifications, pushSubscriptions } from './notificationSchema';

@Repository()
export class PersonalNotificationRepository {
  declare db: DB;

  async listMine(userId: string, input: { limit: number; unread?: boolean }) {
    const conditions = [eq(notifications.recipientUserId, userId)];
    if (input.unread === true) conditions.push(isNull(notifications.readAt));
    if (input.unread === false) conditions.push(sql`${notifications.readAt} IS NOT NULL`);
    return this.db.select().from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt), desc(notifications.id))
      .limit(input.limit);
  }

  async unreadCount(userId: string) {
    const [row] = await this.db.select({ count: count() }).from(notifications)
      .where(and(eq(notifications.recipientUserId, userId), isNull(notifications.readAt)));
    return Number(row?.count ?? 0);
  }

  async markRead(userId: string, id: string) {
    const [row] = await this.db.update(notifications)
      .set({ readAt: new Date().toISOString() })
      .where(and(eq(notifications.id, id), eq(notifications.recipientUserId, userId), isNull(notifications.readAt)))
      .returning();
    if (row) return row;
    const [existing] = await this.db.select().from(notifications)
      .where(and(eq(notifications.id, id), eq(notifications.recipientUserId, userId))).limit(1);
    return existing;
  }

  async markAllRead(userId: string) {
    return this.db.update(notifications).set({ readAt: new Date().toISOString() })
      .where(and(eq(notifications.recipientUserId, userId), isNull(notifications.readAt))).returning({ id: notifications.id });
  }

  async upsertSubscription(input: {
    userId: string;
    endpointHash: string;
    endpointCiphertext: string;
    p256dhCiphertext: string;
    authCiphertext: string;
    endpointFingerprint: string;
    userAgentFamily: string | null;
  }) {
    const [row] = await this.db.insert(pushSubscriptions).values(input)
      .onConflictDoUpdate({
        target: pushSubscriptions.endpointHash,
        set: {
          userId: input.userId,
          endpointCiphertext: input.endpointCiphertext,
          p256dhCiphertext: input.p256dhCiphertext,
          authCiphertext: input.authCiphertext,
          endpointFingerprint: input.endpointFingerprint,
          userAgentFamily: input.userAgentFamily,
          disabledAt: null,
          updatedAt: new Date().toISOString(),
        },
      }).returning();
    return row;
  }

  async removeSubscription(userId: string, endpointHash: string) {
    const [row] = await this.db.delete(pushSubscriptions)
      .where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.endpointHash, endpointHash))).returning();
    return row;
  }

  async createForStudentParents(input: {
    studentId: string;
    sourceKey: string;
    topic: string;
    title: string;
    body: string;
    href: string;
  }) {
    const recipients = await this.db.select({ userId: parents.userId })
      .from(studentParents)
      .innerJoin(parents, eq(studentParents.parentId, parents.id))
      .where(and(eq(studentParents.studentId, input.studentId), sql`${parents.userId} IS NOT NULL`));
    const userIds = [...new Set(recipients.map((row) => row.userId).filter((id): id is string => Boolean(id)))];
    if (userIds.length === 0) return [];
    const created = await this.db.insert(notifications).values(userIds.map((recipientUserId) => ({
      recipientUserId,
      sourceKey: input.sourceKey,
      topic: input.topic,
      title: input.title.slice(0, 120),
      body: input.body.slice(0, 300),
      href: input.href,
    }))).onConflictDoNothing().returning();
    if (created.length === 0) return [];
    const subscriptions = await this.db.select().from(pushSubscriptions)
      .where(and(inArray(pushSubscriptions.userId, userIds), isNull(pushSubscriptions.disabledAt)));
    const deliveries = created.flatMap((notification) => subscriptions
      .filter((subscription) => subscription.userId === notification.recipientUserId)
      .map((subscription) => ({ notificationId: notification.id, pushSubscriptionId: subscription.id })));
    if (deliveries.length > 0) {
      await this.db.insert(notificationDeliveries).values(deliveries).onConflictDoNothing();
    }
    return created;
  }

  async claimDeliveries(limit = NOTIFICATION_BATCH_SIZE) {
    await this.db.execute(sql`
      UPDATE notification_deliveries SET status = 'dead', processed_at = now(),
        last_error_code = 'max_attempts_exceeded', updated_at = now()
      WHERE attempts >= ${NOTIFICATION_MAX_ATTEMPTS} AND status IN ('pending','failed','processing')
    `);
    const result = await this.db.execute(sql`
      UPDATE notification_deliveries AS delivery
      SET status = 'processing', leased_at = now(), attempts = delivery.attempts + 1, updated_at = now()
      WHERE delivery.id IN (
        SELECT id FROM notification_deliveries
        WHERE ((status = 'pending') OR (status = 'failed' AND available_at <= now())
          OR (status = 'processing' AND leased_at <= now() - interval '5 minutes'))
          AND available_at <= now() AND attempts < ${NOTIFICATION_MAX_ATTEMPTS}
        ORDER BY available_at, id LIMIT ${limit} FOR UPDATE SKIP LOCKED
      ) RETURNING delivery.*
    `);
    return result as unknown as Array<Record<string, unknown>>;
  }

  async loadDeliveryContext(notificationId: string, subscriptionId: string | null) {
    const [notification] = await this.db.select().from(notifications).where(eq(notifications.id, notificationId)).limit(1);
    const [subscription] = subscriptionId
      ? await this.db.select().from(pushSubscriptions).where(eq(pushSubscriptions.id, subscriptionId)).limit(1)
      : [];
    return { notification, subscription };
  }

  async markDelivery(id: string, status: 'sent' | 'skipped' | 'dead', code: string | null = null) {
    await this.db.update(notificationDeliveries).set({ status, processedAt: new Date().toISOString(), lastErrorCode: code }).where(eq(notificationDeliveries.id, id));
  }

  async markDeliveryFailed(id: string, attempts: number, code: string) {
    if (attempts >= NOTIFICATION_MAX_ATTEMPTS) return this.markDelivery(id, 'dead', code);
    const delays = [1, 5, 15, 60, 360];
    const delay = delays[Math.min(Math.max(attempts - 1, 0), delays.length - 1)];
    await this.db.execute(sql`
      UPDATE notification_deliveries SET status = 'failed',
        available_at = now() + (${delay} || ' minutes')::interval,
        last_error_code = ${code.slice(0, 120)}, updated_at = now() WHERE id = ${id}
    `);
  }

  async disableSubscription(id: string) {
    await this.db.update(pushSubscriptions).set({ disabledAt: new Date().toISOString() }).where(eq(pushSubscriptions.id, id));
  }

  async markSubscriptionResult(id: string, success: boolean) {
    await this.db.update(pushSubscriptions).set(success
      ? { lastSuccessAt: new Date().toISOString() }
      : { lastFailureAt: new Date().toISOString() }).where(eq(pushSubscriptions.id, id));
  }
}
