import { describe, expect, it } from 'bun:test';
import { drizzle } from 'drizzle-orm/pg-proxy';
import { PersonalNotificationRepository } from '../../src/modules/notifications/NotificationRepository';

// Two active staff accounts may read visit requests; only the first has turned
// push on, on one device. A third holds another permission.
const NOTIFICATION_COLUMNS = 10; // id … href, read_at, created_at, updated_at
const notificationRow = (id: string, recipient: string) => {
  const row: unknown[] = Array(NOTIFICATION_COLUMNS).fill(null);
  row[0] = id; row[1] = recipient;
  return row;
};

function capture() {
  const statements: Array<{ sql: string; params: unknown[] }> = [];
  const repo = new PersonalNotificationRepository();
  repo.db = drizzle(async (sql, params) => {
    statements.push({ sql, params });
    if (sql.startsWith('select') && sql.includes('"role_permissions"')) {
      return { rows: [['admin', 'read:visit-requests'], ['secretary', 'read:visit-requests'], ['driver', 'read:transport']] };
    }
    if (sql.startsWith('insert into "notifications"')) return { rows: [notificationRow('n-admin', 'admin'), notificationRow('n-secretary', 'secretary')] };
    if (sql.startsWith('select') && sql.includes('"push_subscriptions"')) return { rows: [['sub-1', 'admin']] };
    return { rows: [] };
  }) as any;
  return { repo, statements };
}

describe('a notification sent by permission', () => {
  it('queues a push for each device its recipients enabled, so the worker sends it', async () => {
    const { repo, statements } = capture();
    const created = await repo.createForVisitRequest({ id: 'vr-1', title: 'New visit request', body: 'A parent asked to visit' });
    expect(created.map((row) => row.recipientUserId)).toEqual(['admin', 'secretary']);

    const queued = statements.find((statement) => statement.sql.startsWith('insert into "notification_deliveries"'));
    expect(queued).toBeDefined();
    expect(queued!.params).toEqual(expect.arrayContaining(['n-admin', 'sub-1']));
    expect(queued!.params).not.toContain('n-secretary');
  });

  it('queues nothing when no recipient has push on', async () => {
    const { repo, statements } = capture();
    repo.db = drizzle(async (sql, params) => {
      statements.push({ sql, params });
      if (sql.startsWith('select') && sql.includes('"role_permissions"')) return { rows: [['admin', 'read:visit-requests']] };
      if (sql.startsWith('insert into "notifications"')) return { rows: [notificationRow('n-admin', 'admin')] };
      return { rows: [] };
    }) as any;
    await repo.createForVisitRequest({ id: 'vr-2', title: 'New visit request', body: 'A parent asked to visit' });
    expect(statements.some((statement) => statement.sql.startsWith('insert into "notification_deliveries"'))).toBe(false);
  });
});
