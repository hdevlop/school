import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'bun:test';

const rawUrl = process.env.SCHOOL_HISTORY_TEST_DB_URL;
const adminPassword = process.env.SCHOOL_HISTORY_ADMIN_PASSWORD;
const principalPassword = process.env.SCHOOL_HISTORY_PRINCIPAL_PASSWORD;
if (!rawUrl || !adminPassword || !principalPassword) throw new Error('History fixture env is required');
const target = new URL(rawUrl);
if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)
  || target.pathname !== '/school_history_test') throw new Error('Expected local school_history_test');
process.env.DB_URL = rawUrl;

const { server } = await import('../../src/index');
const { db } = await import('../../src/database/db');
const { notifications } = await import('../../src/modules/notifications/notificationSchema');
const { usersTable } = await import('../../src/auth');
const { eq, inArray } = await import('drizzle-orm');
const base = 'http://school.local/api';
let adminToken: string;
let principalToken: string;
const ids = { admin: 'history-notification-admin', principal: 'history-notification-principal' };

async function request(path: string, token: string, year?: string, method = 'GET') {
  const response = await server.fetch(new Request(`${base}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(year ? { 'X-Academic-Year': year } : {}) },
  }));
  return { status: response.status, body: await response.json() as Record<string, any> };
}

async function login(email: string, password: string) {
  const response = await server.fetch(new Request(`${base}/auth/login`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password }),
  }));
  const body = await response.json() as Record<string, any>;
  expect(response.status).toBe(200);
  return (body.data?.accessToken ?? body.accessToken) as string;
}

async function userId(email: string) {
  const [row] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, email)).limit(1);
  return row.id;
}

beforeAll(async () => {
  adminToken = await login('admin@history.example.test', adminPassword);
  principalToken = await login('principal@history.example.test', principalPassword);
  // A notification is someone's message, not a record of a school year: one for
  // each fixture account, created during a closed year's reporting interval.
  await db.insert(notifications).values([
    { id: ids.admin, recipientUserId: await userId('admin@history.example.test'), sourceKey: 'history-test:admin',
      topic: 'reminder', title: 'Fee reminder', body: 'A fee from 2025-2026 is overdue', createdAt: '2026-03-01T09:00:00.000Z' },
    { id: ids.principal, recipientUserId: await userId('principal@history.example.test'), sourceKey: 'history-test:principal',
      topic: 'reminder', title: 'Fee reminder', body: 'Another recipient', createdAt: '2026-03-01T09:00:00.000Z' },
  ]);
});

afterAll(async () => {
  await db.delete(notifications).where(inArray(notifications.id, Object.values(ids)));
});

describe('personal notifications on the marked PostgreSQL fixture', () => {
  it('shows the same inbox and unread count whichever year is selected', async () => {
    const listed = async (year?: string) => {
      const result = await request('/notifications?limit=100', adminToken, year);
      expect(result.status).toBe(200);
      return (result.body.data as Array<{ id: string }>).map((row) => row.id);
    };
    const count = async (year?: string) => (await request('/notifications/unread-count', adminToken, year)).body.data.count;
    for (const year of [undefined, '2024-2025', '2025-2026', '2026-2027']) {
      expect(await listed(year)).toContain(ids.admin);
      expect(await listed(year)).not.toContain(ids.principal);
    }
    expect(await count('2024-2025')).toBe(await count());
  });

  it('lets only the recipient mark a notification read, under any year', async () => {
    expect((await request(`/notifications/${ids.admin}/read`, principalToken, undefined, 'PATCH')).status).toBe(404);
    const read = await request(`/notifications/${ids.admin}/read`, adminToken, '2024-2025', 'PATCH');
    expect(read.status).toBe(200);
    expect(read.body.data.readAt).toBeTruthy();
    const unread = await request('/notifications?unread=true&limit=100', adminToken, '2026-2027');
    expect((unread.body.data as Array<{ id: string }>).map((row) => row.id)).not.toContain(ids.admin);
    const [principalRow] = await db.select().from(notifications).where(eq(notifications.id, ids.principal));
    expect(principalRow.readAt).toBeNull();
  });
});
