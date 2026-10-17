import 'reflect-metadata';
import { describe, expect, it } from 'bun:test';

const rawUrl = process.env.SCHOOL_HISTORY_TEST_DB_URL;
if (!rawUrl) throw new Error('SCHOOL_HISTORY_TEST_DB_URL is required');
const target = new URL(rawUrl);
if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)
  || target.pathname !== '/school_history_test') throw new Error('Expected local school_history_test');
process.env.DB_URL = rawUrl;

const { db } = await import('../../src/database/db');
const { PersonalNotificationRepository } = await import('../../src/modules/notifications/NotificationRepository');
const { notifications } = await import('../../src/modules/notifications/notificationSchema');
const { usersTable } = await import('../../src/auth');
const { eq, inArray, sql } = await import('drizzle-orm');
const rollback = Symbol('notification-clock-rollback');

async function withFreshNotifications(
  run: (repo: InstanceType<typeof PersonalNotificationRepository>, fixture: {
    recipient: string; otherRecipient: string; ownIds: string[]; otherId: string;
  }) => Promise<void>,
) {
  try {
    await db.transaction(async (tx) => {
      // The timestamp columns have no zone. Default creation and read updates
      // must use the same clock even when the database session is ahead of UTC.
      // Fixed UTC+1 keeps this regression effective when Casablanca switches to UTC.
      await tx.execute(sql`SET LOCAL TIME ZONE 'Etc/GMT-1'`);
      const [recipient] = await tx.select({ id: usersTable.id }).from(usersTable)
        .where(eq(usersTable.email, 'admin@history.example.test')).limit(1);
      const [other] = await tx.select({ id: usersTable.id }).from(usersTable)
        .where(eq(usersTable.email, 'principal@history.example.test')).limit(1);
      if (!recipient || !other) throw new Error('History recipient fixtures are required');
      const namespace = `notification-clock-${crypto.randomUUID()}`;
      const ownIds = [crypto.randomUUID(), crypto.randomUUID()];
      const otherId = crypto.randomUUID();
      await tx.insert(notifications).values([
        ...ownIds.map((id) => ({ id, recipientUserId: recipient.id, sourceKey: `${namespace}:${id}`,
          topic: 'acceptance.clock', title: 'Fresh notification', body: 'Recipient clock regression' })),
        { id: otherId, recipientUserId: other.id, sourceKey: `${namespace}:other`,
          topic: 'acceptance.clock', title: 'Other recipient', body: 'Must remain unread' },
      ]);
      const repo = new PersonalNotificationRepository();
      repo.db = tx as unknown as typeof db;
      await run(repo, { recipient: recipient.id, otherRecipient: other.id, ownIds, otherId });
      throw rollback;
    });
  } catch (error) {
    if (error !== rollback) throw error;
  }
}

describe('notification read clock on the marked PostgreSQL fixture', () => {
  it('reads a fresh default-created notification without violating its timestamp constraint', async () => {
    await withFreshNotifications(async (repo, fixture) => {
      const read = await repo.markRead(fixture.recipient, fixture.ownIds[0]);
      expect(read?.readAt).toBeTruthy();
      expect(read!.readAt! >= read!.createdAt!).toBe(true);
      const replay = await repo.markRead(fixture.recipient, fixture.ownIds[0]);
      expect(replay?.readAt).toBe(read?.readAt);
      expect(await repo.markRead(fixture.otherRecipient, fixture.ownIds[1])).toBeUndefined();
      const remaining = await repo.listMine(fixture.recipient, { limit: 100, unread: true });
      expect(remaining.some((row) => row.id === fixture.ownIds[1])).toBe(true);
      expect(remaining.some((row) => row.id === fixture.ownIds[0])).toBe(false);
    });
  });

  it('marks fresh notifications read once while preserving the other recipient', async () => {
    await withFreshNotifications(async (repo, fixture) => {
      const changed = await repo.markAllRead(fixture.recipient);
      expect(changed.map((row) => row.id)).toEqual(expect.arrayContaining(fixture.ownIds));
      expect(changed.some((row) => row.id === fixture.otherId)).toBe(false);
      expect(await repo.markAllRead(fixture.recipient)).toEqual([]);
      const stored = await repo.db.select().from(notifications).where(inArray(notifications.id, fixture.ownIds));
      expect(stored).toHaveLength(2);
      expect(stored.every((row) => row.readAt && row.readAt >= row.createdAt!)).toBe(true);
      const [other] = await repo.db.select().from(notifications).where(eq(notifications.id, fixture.otherId));
      expect(other.readAt).toBeNull();
    });
  });
});
