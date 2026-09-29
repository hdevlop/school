import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { and, eq, sql } from 'drizzle-orm';

const url = process.env.SCHOOL_HISTORY_TEST_DB_URL;
const adminPassword = process.env.SCHOOL_HISTORY_ADMIN_PASSWORD;
const principalPassword = process.env.SCHOOL_HISTORY_PRINCIPAL_PASSWORD;
if (!url || !adminPassword || !principalPassword) throw new Error('History fixture env is required');
const target = new URL(url);
if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname) || target.pathname !== '/school_history_test') {
  throw new Error('Expected local school_history_test');
}
process.env.DB_URL = url;
const { db } = await import('../../src/database/db');
const { auditLogs, students, users, roles, permissions, rolePermissions } = await import('../../src/database/schema');
const { server } = await import('../../src/index');
const base = 'http://school.local/api';
const id = 'history-student-02';
const enrollmentId = 'history-enrollment-02-2025';
const suffix = crypto.randomUUID().slice(0, 8);
const outsider = { userId: `history-students-outsider-${suffix}`, roleId: `history-students-role-${suffix}`,
  email: `students-${suffix}@history.example.test`, password: crypto.randomUUID() };
let outsiderToken: string;
let createdPermissionId: string | undefined;
let grantedPermissionId: string | undefined;
const reason = `History acceptance ${crypto.randomUUID()}`;
let admin: string;
let principal: string;

async function request(path: string, year = '2025-2026', method = 'GET', data?: unknown, token?: string) {
  const response = await server.fetch(new Request(`${base}${path}`, { method,
    headers: { Authorization: `Bearer ${token ?? admin}`, 'X-Academic-Year': year,
      ...(data ? { 'content-type': 'application/json' } : {}) },
    ...(data ? { body: JSON.stringify(data) } : {}),
  }));
  return { status: response.status, body: await response.json() as Record<string, any> };
}
async function login(email: string, password: string) {
  const response = await server.fetch(new Request(`${base}/auth/login`, { method: 'POST',
    headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password }) }));
  const body = await response.json() as Record<string, any>;
  expect(response.status).toBe(200);
  return body.data?.accessToken ?? body.accessToken ?? body.data?.tokens?.accessToken;
}
const state = (record: Record<string, any>) => ({ enrolledOn: record.enrolledOn,
  leftOn: record.leftOn, status: record.status,
  placements: record.placements.map(({ id, classId, sectionId, validFrom, validTo }) =>
    ({ id, classId, sectionId, validFrom, validTo })),
});

beforeAll(async () => {
  const [created] = await db.insert(permissions).values({ id: `history-students-perm-${suffix}`,
    name: 'update:students', resource: 'students', action: 'update' }).onConflictDoNothing().returning();
  createdPermissionId = created?.id;
  const [permission] = await db.select().from(permissions).where(eq(permissions.name, 'update:students'));
  const [grant] = await db.select().from(rolePermissions).where(and(eq(rolePermissions.roleId, 'history-role-principal'),
    eq(rolePermissions.permissionId, permission.id)));
  if (!grant) {
    await db.insert(rolePermissions).values({ roleId: 'history-role-principal', permissionId: permission.id });
    grantedPermissionId = permission.id;
  }
  await db.insert(roles).values({ id: outsider.roleId, name: outsider.roleId });
  await db.insert(users).values({ id: outsider.userId, roleId: outsider.roleId, email: outsider.email,
    name: 'History students outsider', password: await Bun.password.hash(outsider.password, { algorithm: 'bcrypt', cost: 10 }),
    status: 'active', emailVerified: true });
  await server.listen(5530);
  admin = await login('admin@history.example.test', adminPassword);
  principal = await login('principal@history.example.test', principalPassword);
  outsiderToken = await login(outsider.email, outsider.password);
});
afterAll(async () => {
  await db.delete(auditLogs).where(and(eq(auditLogs.resource, 'student-enrollments'),
    sql`${auditLogs.metadata}->>'reason' = ${reason}`));
  await db.delete(users).where(eq(users.id, outsider.userId));
  await db.delete(roles).where(eq(roles.id, outsider.roleId));
  if (grantedPermissionId) await db.delete(rolePermissions).where(and(eq(rolePermissions.roleId, 'history-role-principal'),
    eq(rolePermissions.permissionId, grantedPermissionId)));
  if (createdPermissionId) await db.delete(permissions).where(eq(permissions.id, createdPermissionId));
  await server.stop();
});


async function readEnrollment(recordId = enrollmentId) {
  const result = await request(`/student-enrollments/${recordId}`);
  expect(result.status).toBe(200);
  return result.body.data ?? result.body;
}

describe('student history over authenticated REST and MCP', () => {
  it('edits one profile field without resetting or rejecting an inactive student', async () => {
    const [original] = await db.select({ status: students.status,
      previousSchool: students.previousSchool }).from(students).where(eq(students.id, id));
    try {
      await db.update(students).set({ status: 'inactive' }).where(eq(students.id, id));
      const updated = await request(`/students/${id}`, '2025-2026', 'PUT',
        { previousSchool: 'History previous school' });
      expect(updated.status).toBe(200);
      const [saved] = await db.select({ status: students.status,
        previousSchool: students.previousSchool }).from(students).where(eq(students.id, id));
      expect(saved).toEqual({ status: 'inactive', previousSchool: 'History previous school' });
    } finally {
      await db.update(students).set(original).where(eq(students.id, id));
    }
  });

  it('defaults to the active year and exposes historical placement/status without hiding shared identity', async () => {
    const old = await request('/students/history-student-05');
    const active = await request('/students/history-student-05', '2026-2027');
    expect(old.status).toBe(200);
    expect(old.body.data.sectionId).toBe('history-section-2025-b');
    expect(active.body.data.classId).toBe('history-class-2026');
    const absent = await request('/students/history-student-08');
    expect(absent.body.data.id).toBe('history-student-08');
    expect(absent.body.data.classId).toBeNull();
    expect(absent.body.data.status).toBeNull();
    const response = await server.fetch(new Request(`${base}/students`, { headers: { Authorization: `Bearer ${admin}` } }));
    const defaults = await response.json() as Record<string, any>;
    expect(defaults.data).toHaveLength(8);
    expect(defaults.data.every((row) => row.classId === 'history-class-2026')).toBe(true);
    const oldList = await request('/students');
    expect(oldList.body.data).toHaveLength(8);
    expect((await request('/students?onDate=2026-01-15')).body.data.find((row) => row.id === 'history-student-05').sectionId)
      .toBe('history-section-2025-b');
  });
  it('refuses missing permissions, invalid years, conflicting selections and out-of-year roster dates', async () => {
    expect((await request('/students', '2025-2026', 'GET', undefined, outsiderToken)).status).toBe(401);
    expect((await request('/students', 'bad')).status).toBe(400);
    expect((await request('/students?academicYear=2026-2027')).status).toBe(400);
    expect((await request('/students?onDate=2024-10-01')).status).toBe(400);
    expect((await request('/students/missing')).status).toBe(404);
  });
  it('corrects through Student Edit atomically, retains identity changes across years, and serializes concurrent stale edits', async () => {
    const original = await readEnrollment();
    const [projection] = await db.select().from(students).where(eq(students.id, id));
    const expected = state(original);
    const data = { enrolledOn: original.enrolledOn, leftOn: original.leftOn, status: original.status,
      placement: { ...expected.placements[0], sectionId: 'history-section-2025-b' }, expected, reason };
    let changed = false;
    try {
      const results = await Promise.all([
        request(`/students/${id}`, '2025-2026', 'PUT', { previousSchool: reason, enrollmentCorrection: { enrollmentId, ...data } }),
        request(`/students/${id}`, '2025-2026', 'PUT', { previousSchool: reason, enrollmentCorrection: { enrollmentId, ...data } }),
      ]);
      changed = results.some((result) => result.status === 200);
      expect(results.map((result) => result.status).sort()).toEqual([200, 409]);
      const old = (await request(`/students/${id}`)).body.data;
      const active = (await request(`/students/${id}`, '2026-2027')).body.data;
      expect(old.sectionId).toBe('history-section-2025-b');
      expect(active.sectionId).toBe(projection.sectionId);
      expect(old.previousSchool).toBe(reason);
      expect(active.previousSchool).toBe(reason);
      const [after] = await db.select().from(students).where(eq(students.id, id));
      expect([after.classId, after.sectionId, after.status]).toEqual([projection.classId, projection.sectionId, projection.status]);
      expect(await db.select().from(auditLogs).where(and(eq(auditLogs.resourceId, enrollmentId),
        sql`${auditLogs.metadata}->>'reason' = ${reason}`))).toHaveLength(1);
    } finally {
      if (changed) {
        const current = await readEnrollment();
        const restored = await request(`/students/${id}`, '2025-2026', 'PUT', { previousSchool: projection.previousSchool,
          enrollmentCorrection: { enrollmentId, enrolledOn: original.enrolledOn, leftOn: original.leftOn, status: original.status,
            placement: expected.placements[0], expected: state(current), reason },
        }, principal);
        expect(restored.status).toBe(200);
      }
    }
  });
  it('rejects foreign/cross-year enrollment ids and keeps profile and enrollment unchanged on a conflict', async () => {
    const original = await readEnrollment();
    const expected = state(original);
    const data = { enrollmentId, enrolledOn: original.enrolledOn, leftOn: original.leftOn, status: original.status,
      placement: expected.placements[0], expected, reason };
    expect((await request(`/students/${id}`, '2026-2027', 'PUT', { enrollmentCorrection: data })).status).toBe(404);
    expect((await request('/students/history-student-03', '2025-2026', 'PUT', { enrollmentCorrection: data })).status).toBe(404);
    expect((await request(`/students/${id}`, '2025-2026', 'PUT', { classId: 'history-class-2025' })).status).toBe(409);
  });
  it("advertises one year input and isolates MCP calls by tool input or request header", async () => {
    const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
    const { StreamableHTTPClientTransport } = await import('@modelcontextprotocol/sdk/client/streamableHttp.js');
    const call = async (headerYear?: string, toolYear?: string) => {
      const client = new Client({ name: 'school-students-history-test', version: '1.0.0' });
      const transport = new StreamableHTTPClientTransport(new URL('http://localhost:5530/api/mcp'), {
        requestInit: { headers: { Authorization: `Bearer ${admin}`,
          ...(headerYear ? { 'X-Academic-Year': headerYear } : {}) } },
      });
      await client.connect(transport);
      try {
        const tool = (await client.listTools()).tools.find((item) => item.name === 'students_get_student');
        expect(tool?.inputSchema.properties).toHaveProperty('academicYear');
        return await client.callTool({ name: 'students_get_student', arguments: { id: 'history-student-05',
          ...(toolYear ? { academicYear: toolYear } : {}) } }) as { content: Array<{ text: string }>; isError?: boolean };
      } finally { await transport.close(); }
    };
    const [old, active, conflict] = await Promise.all([
      call(undefined, '2025-2026'), call('2026-2027'), call('2025-2026', '2026-2027'),
    ]);
    expect(old.isError).not.toBe(true);
    expect(active.isError).not.toBe(true);
    expect(JSON.parse(old.content[0].text).sectionId).toBe('history-section-2025-b');
    expect(JSON.parse(active.content[0].text).classId).toBe('history-class-2026');
    expect(conflict.isError).toBe(true);
  });
});
