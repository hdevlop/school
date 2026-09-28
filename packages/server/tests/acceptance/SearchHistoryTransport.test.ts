import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { eq } from 'drizzle-orm';

const rawUrl = process.env.SCHOOL_HISTORY_TEST_DB_URL;
const adminPassword = process.env.SCHOOL_HISTORY_ADMIN_PASSWORD;
if (!rawUrl || !adminPassword) throw new Error('History fixture env is required');
const target = new URL(rawUrl);
if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)
  || target.pathname !== '/school_history_test') throw new Error('Expected local school_history_test');
process.env.DB_URL = rawUrl;

const { db } = await import('../../src/database/db');
const { permissions, rolePermissions, roles, users } = await import('../../src/database/schema');
const { server } = await import('../../src/index');
const { SearchRepository } = await import('../../src/modules/search/SearchRepository');
const { yearScopedModules } = await import('../../src/config/yearScope');
const base = 'http://school.local/api';
const port = 5519;
const suffix = crypto.randomUUID().slice(0, 8);
const roleId = `history-search-role-${suffix}`;
const userId = `history-search-user-${suffix}`;
const email = `search-${suffix}@history.example.test`;
const password = crypto.randomUUID();
let adminToken: string;
let limitedToken: string;
let createdPermissionId: string | undefined;

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

async function request(path: string, token?: string, year?: string) {
  const response = await server.fetch(new Request(`${base}${path}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(year ? { 'X-Academic-Year': year } : {}),
    },
  }));
  return { status: response.status, body: await response.json() as Record<string, any> };
}

beforeAll(async () => {
  const permissionName = 'read:students';
  const [createdPermission] = await db.insert(permissions).values({
    id: `history-search-perm-${suffix}`, name: permissionName,
    resource: 'students', action: 'read',
  }).onConflictDoNothing().returning({ id: permissions.id });
  createdPermissionId = createdPermission?.id;
  const [permission] = await db.select({ id: permissions.id })
    .from(permissions).where(eq(permissions.name, permissionName)).limit(1);
  if (!permission) throw new Error('read:students permission missing');
  await db.insert(roles).values({ id: roleId, name: `history-search-${suffix}` });
  await db.insert(rolePermissions).values({ roleId, permissionId: permission.id });
  await db.insert(users).values({
    id: userId, name: 'History search actor', email,
    password: await Bun.password.hash(password, { algorithm: 'bcrypt', cost: 10 }),
    roleId, status: 'active', emailVerified: true,
  });
  await server.listen(port);
  adminToken = await login('admin@history.example.test', adminPassword);
  limitedToken = await login(email, password);
});
afterAll(async () => {
  await server.stop();
  await db.delete(users).where(eq(users.id, userId));
  await db.delete(roles).where(eq(roles.id, roleId));
  if (createdPermissionId) await db.delete(permissions).where(eq(permissions.id, createdPermissionId));
});

describe('shared identity search over the history fixture', () => {
  it('uses entity permissions and ownership while keeping identity results independent of year', async () => {
    expect(yearScopedModules).not.toHaveProperty('search');
    expect((await request('/search/students?q=Adam')).status).toBe(401);

    for (const year of [undefined, '2024-2025', '2025-2026', '2026-2027', 'invalid']) {
      const students = await request('/search/students?q=Adam', adminToken, year);
      expect(students.status, JSON.stringify(students.body)).toBe(200);
      expect(students.body.data.map((row: { id: string }) => row.id))
        .toContain('history-student-01');
      for (const path of ['/search?q=Adam', '/search/teachers?q=Adam', '/search/parents?q=Adam']) {
        expect((await request(path, adminToken, year)).status).toBe(200);
      }
    }
    const conflict = await request('/search/students?q=Adam&academicYear=2026-2027', adminToken, '2025-2026');
    expect(conflict.status).toBe(200);
    expect(conflict.body.data.map((row: { id: string }) => row.id)).toContain('history-student-01');

    const permitted = await request('/search/students?q=Adam', limitedToken);
    expect(permitted.status).toBe(200);
    expect(permitted.body.data).toEqual([]);
    for (const path of ['/search?q=Adam', '/search/teachers?q=Adam', '/search/parents?q=Adam']) {
      expect((await request(path, limitedToken)).status).toBe(401);
    }

    const studentOwned = new SearchRepository();
    studentOwned.db = db;
    studentOwned._scopeCtx = {
      hasActiveContext: () => true,
      getUser: () => ({ id: 'history-student-01-user', role: 'student' }),
    } as any;
    expect((await studentOwned.searchStudents('Adam')).map((row) => row.id)).toEqual(['history-student-01']);
    expect(await studentOwned.searchStudents('Salma')).toEqual([]);
    expect(await studentOwned.searchTeachers('Adam')).toEqual([]);
  });

  it('exposes the same shared search through authenticated MCP tools', async () => {
    const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
    const { StreamableHTTPClientTransport } = await import('@modelcontextprotocol/sdk/client/streamableHttp.js');
    const client = new Client({ name: 'school-search-history-test', version: '1.0.0' });
    const transport = new StreamableHTTPClientTransport(new URL(`http://localhost:${port}/api/mcp`), {
      requestInit: { headers: { Authorization: `Bearer ${adminToken}`, 'X-Academic-Year': '2024-2025' } },
    });
    await client.connect(transport);
    try {
      const tools = await client.listTools();
      const names = tools.tools.filter((tool) => tool.name.startsWith('search_')).map((tool) => tool.name);
      expect(names).toEqual(expect.arrayContaining([
        'search_search_global', 'search_search_students', 'search_search_teachers', 'search_search_parents',
      ]));
      const result = await client.callTool({ name: 'search_search_students', arguments: { q: 'Adam' } }) as {
        content: Array<{ text: string }>; isError?: boolean;
      };
      expect(result.isError).not.toBe(true);
      expect((JSON.parse(result.content[0].text) as Array<{ id: string }>).map((row) => row.id))
        .toContain('history-student-01');
    } finally { await transport.close(); }

    const limitedClient = new Client({ name: 'school-limited-search-test', version: '1.0.0' });
    const limitedTransport = new StreamableHTTPClientTransport(new URL(`http://localhost:${port}/api/mcp`), {
      requestInit: { headers: { Authorization: `Bearer ${limitedToken}` } },
    });
    await limitedClient.connect(limitedTransport);
    try {
      const allowed = await limitedClient.callTool({ name: 'search_search_students', arguments: { q: 'Adam' } }) as {
        content: Array<{ text: string }>; isError?: boolean;
      };
      expect(allowed.isError).not.toBe(true);
      expect(JSON.parse(allowed.content[0].text)).toEqual([]);
      const denied = await limitedClient.callTool({ name: 'search_search_global', arguments: { q: 'Adam' } });
      expect(denied.isError).toBe(true);
    } finally { await limitedTransport.close(); }
  });
});
