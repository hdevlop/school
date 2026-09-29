import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { eq, inArray } from 'drizzle-orm';

const rawUrl = process.env.SCHOOL_HISTORY_TEST_DB_URL;
const adminPassword = process.env.SCHOOL_HISTORY_ADMIN_PASSWORD;
if (!rawUrl || !adminPassword) throw new Error('History fixture env is required');
const target = new URL(rawUrl);
if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)
  || target.pathname !== '/school_history_test') throw new Error('Expected local school_history_test');
process.env.DB_URL = rawUrl;

const { db } = await import('../../src/database/db');
const { permissions, rolePermissions, roles, staffRoles } = await import('../../src/database/schema');
const { server } = await import('../../src/index');
const base = 'http://school.local/api';
const port = 5531;
const suffix = crypto.randomUUID().slice(0, 8);
const newCode = `historyGrantNew${suffix}`;
const existingCode = `historyGrantExisting${suffix}`;
const existingRoleId = `history-grant-existing-${suffix}`;
let token: string;

async function create(code: string, permissionIds: string[]) {
  const response = await server.fetch(new Request(`${base}/staff-roles`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ code, label: 'History grant rollback',
      createAccessRole: true, permissions: permissionIds }),
  }));
  return { status: response.status, body: await response.json() as Record<string, unknown> };
}

async function roleRows(code: string) {
  return db.select({ id: roles.id }).from(roles).where(eq(roles.name, code));
}

beforeAll(async () => {
  await server.listen(port);
  const response = await server.fetch(new Request(`${base}/auth/login`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'admin@history.example.test', password: adminPassword }),
  }));
  const body = await response.json() as Record<string, any>;
  expect(response.status).toBe(200);
  token = body.data?.accessToken ?? body.accessToken;
  if (!token) throw new Error('History admin login returned no access token');
});

afterAll(async () => {
  await server.stop();
  const roleIds = [
    ...(await roleRows(newCode)).map((row) => row.id),
    ...(await roleRows(existingCode)).map((row) => row.id),
  ];
  if (roleIds.length) await db.delete(rolePermissions).where(inArray(rolePermissions.roleId, roleIds));
  await db.delete(staffRoles).where(inArray(staffRoles.code, [newCode, existingCode]));
  if (roleIds.length) await db.delete(roles).where(inArray(roles.id, roleIds));
});

describe('staff role grant rollback over authenticated REST', () => {
  it('rolls back a new access role and its first grant when a later grant fails', async () => {
    const [permission] = await db.select({ id: permissions.id }).from(permissions).limit(1);
    if (!permission) throw new Error('History fixture has no permission');
    const result = await create(newCode, [permission.id, `missing-${suffix}`]);
    expect(result.status).toBe(404);
    expect(await roleRows(newCode)).toEqual([]);
    expect(await db.select().from(staffRoles).where(eq(staffRoles.code, newCode))).toEqual([]);
  });

  it('keeps an existing access role but rolls back a new grant when a later grant fails', async () => {
    const [permission] = await db.select({ id: permissions.id }).from(permissions).limit(1);
    if (!permission) throw new Error('History fixture has no permission');
    await db.insert(roles).values({ id: existingRoleId, name: existingCode });
    const result = await create(existingCode, [permission.id, `missing-${suffix}`]);
    expect(result.status).toBe(404);
    expect(await roleRows(existingCode)).toEqual([{ id: existingRoleId }]);
    expect(await db.select().from(rolePermissions).where(eq(rolePermissions.roleId, existingRoleId))).toEqual([]);
    expect(await db.select().from(staffRoles).where(eq(staffRoles.code, existingCode))).toEqual([]);
  });
});
