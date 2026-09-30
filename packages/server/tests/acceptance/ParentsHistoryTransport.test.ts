import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { and, count, eq, inArray } from 'drizzle-orm';

const rawUrl = process.env.SCHOOL_HISTORY_TEST_DB_URL;
const adminPassword = process.env.SCHOOL_HISTORY_ADMIN_PASSWORD;
const principalPassword = process.env.SCHOOL_HISTORY_PRINCIPAL_PASSWORD;
if (!rawUrl || !adminPassword || !principalPassword) throw new Error('History fixture env is required');
const target = new URL(rawUrl);
if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)
  || target.pathname !== '/school_history_test') throw new Error('Expected local school_history_test');
process.env.DB_URL = rawUrl;

const { db } = await import('../../src/database/db');
const { parents, permissions, rolePermissions, roles, studentParents, users } = await import('../../src/database/schema');
const { yearScopedModules } = await import('../../src/config/yearScope');
const { server } = await import('../../src/index');

const base = 'http://school.local/api';
const port = 5526;
const suffix = crypto.randomUUID().slice(0, 8);
const OMAR = 'history-student-05';
const MARIAM = 'history-student-04';
const AYA = 'history-student-08';
const ADAM = 'history-student-01';
const parentId = `history-parents-rest-${suffix}`;
const parentUserId = `history-parents-rest-user-${suffix}`;
const outsider = { roleId: `history-parents-role-${suffix}`, userId: `history-parents-outsider-${suffix}`,
  email: `parents-${suffix}@history.example.test`, password: crypto.randomUUID() };
const PRINCIPAL_ROLE = 'history-role-principal';
let adminToken: string;
let principalToken: string;
let outsiderToken: string;
let createdPermissionId: string | undefined;
let grantedPermissionId: string | undefined;

async function login(email: string, password: string) {
  const response = await server.fetch(new Request(`${base}/auth/login`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  }));
  const body = await response.json() as Record<string, any>;
  expect(response.status).toBe(200);
  const token = body.data?.accessToken ?? body.accessToken ?? body.data?.tokens?.accessToken;
  expect(typeof token).toBe('string');
  return token as string;
}

async function request(path: string, year?: string, method = 'GET', data?: unknown, token = adminToken) {
  const response = await server.fetch(new Request(`${base}${path}`, {
    method,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(year ? { 'X-Academic-Year': year } : {}),
      ...(data ? { 'content-type': 'application/json' } : {}) },
    ...(data ? { body: JSON.stringify(data) } : {}),
  }));
  return { status: response.status, body: await response.json() as Record<string, any> };
}

type Child = { id: string; class: { id: string } | null; section: { id: string } | null; fees?: unknown };
const placement = (children: Child[], id: string) => {
  const child = children.find((row) => row.id === id);
  return child ? [child.class?.id ?? null, child.section?.id ?? null] : undefined;
};

beforeAll(async () => {
  await db.insert(users).values({ id: parentUserId, name: 'History REST parent',
    email: `parents-rest-${suffix}@history.example.test`, password: 'not-used', status: 'active', emailVerified: true });
  await db.insert(parents).values({ id: parentId, userId: parentUserId, name: `History REST parent ${suffix}`,
    relationshipType: 'guardian' });
  await db.insert(studentParents).values([OMAR, MARIAM, AYA].map((studentId) => ({
    id: `history-parents-rest-link-${studentId.slice(-2)}-${suffix}`, studentId, parentId,
  })));
  // The app grants the principal `read:parents`; the fixture grants no
  // parents permission, so add it for this suite and remove only what it added.
  const [created] = await db.insert(permissions).values({
    id: `history-parents-perm-${suffix}`, name: 'read:parents', resource: 'parents', action: 'read',
  }).onConflictDoNothing().returning({ id: permissions.id });
  createdPermissionId = created?.id;
  const [readParents] = await db.select({ id: permissions.id }).from(permissions)
    .where(eq(permissions.name, 'read:parents')).limit(1);
  if (!readParents) throw new Error('read:parents permission missing');
  const [existingGrant] = await db.select({ roleId: rolePermissions.roleId }).from(rolePermissions)
    .where(and(eq(rolePermissions.roleId, PRINCIPAL_ROLE), eq(rolePermissions.permissionId, readParents.id)));
  if (!existingGrant) {
    await db.insert(rolePermissions).values({ roleId: PRINCIPAL_ROLE, permissionId: readParents.id });
    grantedPermissionId = readParents.id;
  }
  // A signed-in role with no permission to read parents.
  await db.insert(roles).values({ id: outsider.roleId, name: `history-parents-${suffix}` });
  await db.insert(users).values({
    id: outsider.userId, name: 'History parents outsider', email: outsider.email,
    password: await Bun.password.hash(outsider.password, { algorithm: 'bcrypt', cost: 10 }),
    roleId: outsider.roleId, status: 'active', emailVerified: true,
  });
  await server.listen(port);
  adminToken = await login('admin@history.example.test', adminPassword);
  principalToken = await login('principal@history.example.test', principalPassword);
  outsiderToken = await login(outsider.email, outsider.password);
});

afterAll(async () => {
  await server.stop();
  await db.delete(studentParents).where(eq(studentParents.parentId, parentId));
  await db.delete(parents).where(eq(parents.id, parentId));
  await db.delete(users).where(inArray(users.id, [parentUserId, outsider.userId]));
  await db.delete(roles).where(eq(roles.id, outsider.roleId));
  if (grantedPermissionId) {
    await db.delete(rolePermissions).where(and(
      eq(rolePermissions.roleId, PRINCIPAL_ROLE), eq(rolePermissions.permissionId, grantedPermissionId),
    ));
  }
  if (createdPermissionId) await db.delete(permissions).where(eq(permissions.id, createdPermissionId));
  const [left] = await db.select({ count: count() }).from(parents).where(eq(parents.id, parentId));
  expect(left.count).toBe(0);
});

describe('parents over the history fixture', () => {
  it('preserves both contact flags on a one-field REST edit', async () => {
    const [original] = await db.select({
      occupation: parents.occupation,
      isEmergencyContact: parents.isEmergencyContact,
      financialResponsibility: parents.financialResponsibility,
    }).from(parents).where(eq(parents.id, parentId));
    try {
      await db.update(parents).set({ isEmergencyContact: true, financialResponsibility: true })
        .where(eq(parents.id, parentId));
      const updated = await request(`/parents/${parentId}`, '2026-2027', 'PUT', { occupation: 'Historian' });
      expect(updated.status).toBe(200);
      const [saved] = await db.select({ isEmergencyContact: parents.isEmergencyContact,
        financialResponsibility: parents.financialResponsibility }).from(parents).where(eq(parents.id, parentId));
      expect(saved).toEqual({ isEmergencyContact: true, financialResponsibility: true });
    } finally {
      await db.update(parents).set(original).where(eq(parents.id, parentId));
    }
  });

  it("shows one shared parent with each year's class for every linked child", async () => {
    expect(yearScopedModules).toHaveProperty('parents');
    const children = async (year?: string, token = adminToken) => {
      const response = await request(`/parents/${parentId}/children`, year, 'GET', undefined, token);
      expect(response.status, JSON.stringify(response.body)).toBe(200);
      return response.body.data as Child[];
    };

    const byYear = {
      '2024-2025': await children('2024-2025'),
      '2025-2026': await children('2025-2026'),
      '2026-2027': await children('2026-2027'),
    };
    for (const list of Object.values(byYear)) expect(list.map((child) => child.id)).toEqual([AYA, MARIAM, OMAR]);
    expect(placement(byYear['2024-2025'], OMAR)).toEqual(['history-class-2024', 'history-section-2024-a']);
    expect(placement(byYear['2024-2025'], AYA)).toEqual([null, null]);
    expect(placement(byYear['2025-2026'], OMAR)).toEqual(['history-class-2025', 'history-section-2025-b']);
    expect(placement(byYear['2025-2026'], MARIAM)).toEqual(['history-class-2025', 'history-section-2025-a']);
    expect(placement(byYear['2025-2026'], AYA)).toEqual([null, null]);
    expect(placement(byYear['2026-2027'], MARIAM)).toEqual([null, null]);
    expect(placement(byYear['2026-2027'], AYA)).toEqual(['history-class-2026', 'history-section-2026-a']);
    // No selection is the active year.
    expect(await children()).toEqual(byYear['2026-2027']);
    // The principal reads the whole family too.
    expect((await children('2025-2026', principalToken)).map((child) => child.id)).toEqual([AYA, MARIAM, OMAR]);

    // The parent profile's children tab follows the same year, with fees.
    const profile = await request(`/profiles/parents/${parentId}/children`, '2025-2026');
    expect(profile.status).toBe(200);
    expect(placement(profile.body.data, OMAR)).toEqual(['history-class-2025', 'history-section-2025-b']);
    expect(profile.body.data.every((child: Child) => 'fees' in child)).toBe(true);

    // The parent's own record is shared identity, the same in every year.
    for (const year of ['2024-2025', '2025-2026', '2026-2027']) {
      const detail = await request(`/parents/${parentId}`, year);
      expect(detail.status).toBe(200);
      expect(detail.body.data).toMatchObject({ id: parentId, totalChildren: 3 });
      const list = await request('/parents', year);
      expect(list.body.data.map((row: { id: string }) => row.id)).toContain(parentId);
    }
  });

  it('links and unlinks children now, and refuses to delete every parent while any is linked', async () => {
    const linked = await request(`/parents/${parentId}/link-student`, '2024-2025', 'POST', { studentId: ADAM });
    expect(linked.status, JSON.stringify(linked.body)).toBe(200);
    const withAdam = (await request(`/parents/${parentId}/children`, '2024-2025')).body.data as Child[];
    expect(placement(withAdam, ADAM)).toEqual(['history-class-2024', 'history-section-2024-a']);
    const twice = await request(`/parents/${parentId}/link-student`, '2024-2025', 'POST', { studentId: ADAM });
    expect(twice.status).toBe(409);
    expect(twice.body.message).toBe('Student is already linked to this parent');
    expect((await request(`/parents/${parentId}/unlink-student/${ADAM}`, '2024-2025', 'DELETE')).status).toBe(200);
    const withoutAdam = (await request(`/parents/${parentId}/children`, '2024-2025')).body.data as Child[];
    expect(withoutAdam.map((child) => child.id)).not.toContain(ADAM);

    // The link cascades, so deleting every parent would unlink every year's children.
    const refused = await request('/parents', undefined, 'DELETE');
    expect(refused.status).toBe(409);
    expect(refused.body.message).toBe('Some parents are still linked to students. Unlink their children, or delete parents one by one.');
    const single = await request(`/parents/${parentId}`, undefined, 'DELETE');
    expect(single.status).toBe(409);
    expect(single.body.message).toBe('Cannot delete parent with linked students');
    const [kept] = await db.select({ count: count() }).from(studentParents).where(eq(studentParents.parentId, parentId));
    expect(kept.count).toBe(3);
  });

  it('refuses outsiders and bad years', async () => {
    expect((await request(`/parents/${parentId}/children`, undefined, 'GET', undefined, outsiderToken)).status).toBe(403);
    expect((await request(`/parents/${parentId}/children`, undefined, 'GET', undefined, '')).status).toBe(401);
    expect((await request(`/parents/${parentId}/children`, 'twenty')).status).toBe(400);
    expect((await request(`/parents/${parentId}/children?academicYear=2024-2025`, '2025-2026')).status).toBe(400);
    expect((await request(`/parents/${parentId}/children`, '2019-2020')).status).toBe(404);
    const missing = await request('/parents/history-parents-missing/children', '2025-2026');
    expect(missing.status).toBe(404);
    expect(missing.body.message).toBe('Parent not found');
  });

  it("gives MCP the children tool once, with each call's own year", async () => {
    const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
    const { StreamableHTTPClientTransport } = await import('@modelcontextprotocol/sdk/client/streamableHttp.js');
    const call = async (headerYear?: string, toolYear?: string) => {
      const client = new Client({ name: 'school-parents-history-test', version: '1.0.0' });
      const transport = new StreamableHTTPClientTransport(new URL(`http://localhost:${port}/api/mcp`), {
        requestInit: { headers: { Authorization: `Bearer ${adminToken}`,
          ...(headerYear ? { 'X-Academic-Year': headerYear } : {}) } },
      });
      await client.connect(transport);
      try {
        const tools = await client.listTools();
        const tool = tools.tools.find((item) => item.name === 'parents_get_children');
        expect(tool?.inputSchema.properties).toHaveProperty('academicYear');
        const result = await client.callTool({ name: 'parents_get_children',
          arguments: { id: parentId, ...(toolYear ? { academicYear: toolYear } : {}) } });
        return result as { content: Array<{ text: string }>; isError?: boolean };
      } finally { await transport.close(); }
    };
    const [byInput, byHeader, conflict] = await Promise.all([
      call(undefined, '2025-2026'), call('2024-2025'), call('2025-2026', '2026-2027'),
    ]);
    expect(byInput.isError).not.toBe(true);
    expect(byHeader.isError).not.toBe(true);
    expect(placement(JSON.parse(byInput.content[0].text), OMAR)).toEqual(['history-class-2025', 'history-section-2025-b']);
    expect(placement(JSON.parse(byHeader.content[0].text), OMAR)).toEqual(['history-class-2024', 'history-section-2024-a']);
    expect(conflict.isError).toBe(true);
  });
});
