import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { count, eq, like } from 'drizzle-orm';
import type { RouteEntry } from 'najm-core';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';

const rawUrl = process.env.SCHOOL_HISTORY_TEST_DB_URL;
const adminPassword = process.env.SCHOOL_HISTORY_ADMIN_PASSWORD;
if (!rawUrl || !adminPassword) throw new Error('History fixture env is required');
const target = new URL(rawUrl);
if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)
  || target.pathname !== '/school_history_test') throw new Error('Expected local school_history_test');
process.env.DB_URL = rawUrl;

const { INJECTION_TYPES } = await import('najm-core');
const { getGuardMetadata } = await import('najm-guard');
const { db } = await import('../../src/database/db');
const { permissions, rolePermissions, roles, users } = await import('../../src/database/schema');
const { server } = await import('../../src/index');

// Reviewed routes with no guard: sign-in, registration and password recovery;
// OAuth, which najm-auth answers with 404 for a provider School has not
// configured; the sign-in page's appearance and branding; health probes; and
// cron triggers that check FINANCIAL_CRON_SECRET themselves.
const PUBLIC_ROUTES = [
  'GET /api/appearance',
  'GET /api/auth/credential-setup/setup',
  'GET /api/auth/me',
  'GET /api/auth/oauth/github/callback',
  'GET /api/auth/oauth/github/start',
  'GET /api/auth/oauth/google/callback',
  'GET /api/auth/oauth/google/start',
  'GET /api/branding',
  'GET /api/branding/assets/:fileName',
  'GET /api/branding/factory/:fileName',
  'GET /api/health',
  'GET /api/health/ping',
  'GET /api/health/status',
  'POST /api/auth/credential-setup/cancel',
  'POST /api/auth/credential-setup/change',
  'POST /api/auth/forgot-password',
  'POST /api/auth/login',
  'POST /api/auth/logout',
  'POST /api/auth/refresh',
  'POST /api/auth/register',
  'POST /api/auth/reset-password',
  'POST /api/auth/session/recover',
  'POST /api/financial-notifications/cron/check-due',
  'POST /api/financial-notifications/cron/overdue',
  'POST /api/financial-notifications/list-recent',
];

// Reviewed routes any signed-in account may call: its own chat, notifications,
// language, password and OAuth links; the stored files it is shown; the year
// list; the public settings and AI settings; and counts that ownership narrows.
const SIGN_IN_ROUTES = [
  'DELETE /api/chat/sessions/:key',
  'DELETE /api/notifications/push-subscriptions',
  'GET /api/:namespace/files/preview/*',
  'GET /api/:namespace/files/serve/*',
  'GET /api/academic-years',
  'GET /api/academic-years/:id',
  'GET /api/ai-settings',
  'GET /api/chat/sessions',
  'GET /api/chat/sessions/:key',
  'GET /api/dashboard/operations/kpis',
  'GET /api/notifications',
  'GET /api/notifications/push-config',
  'GET /api/notifications/unread-count',
  'GET /api/settings/public',
  'GET /api/users/lang',
  'PATCH /api/chat/sessions/:key',
  'PATCH /api/notifications/:id/read',
  'PATCH /api/notifications/read-all',
  'POST /api/auth/change-password',
  'POST /api/auth/oauth/github/link',
  'POST /api/auth/oauth/google/link',
  'POST /api/chat',
  'POST /api/notifications/push-subscriptions',
  'POST /api/users/lang/:language',
];

const base = 'http://school.local/api';
const port = 5530;
const suffix = crypto.randomUUID().slice(0, 8);
const password = `Sec-${crypto.randomUUID()}-A1a`;
const mailbox = (name: string) => `${name}-${suffix}@security.example.test`;
// An active account with no role, as self-registration used to leave one, and
// one whose role grants read:classes and nothing else.
const roleless = { id: `security-roleless-${suffix}`, email: mailbox('roleless') };
const reader = { id: `security-reader-${suffix}`, email: mailbox('reader'), roleId: `security-reader-${suffix}` };
const namespace = `security-probe-${suffix}`;
// A one-pixel PNG, which the storage plugin accepts.
const png = Uint8Array.from(
  atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='),
  (char) => char.charCodeAt(0),
);

let adminToken: string;
let rolelessToken: string;
let readerToken: string;
let addedPermission: string | undefined;
let usersBefore: number;

type Init = { method?: string; token?: string | null; json?: unknown; body?: Uint8Array<ArrayBuffer>; type?: string };

async function send(path: string, init: Init = {}) {
  const token = init.token === undefined ? adminToken : init.token;
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (init.json !== undefined) headers['content-type'] = 'application/json';
  if (init.type) headers['content-type'] = init.type;
  return server.fetch(new Request(`${base}${path}`, {
    method: init.method ?? 'GET',
    headers,
    body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
  }));
}

async function status(path: string, init?: Init) {
  return (await send(path, init)).status;
}

async function login(email: string, secret: string) {
  const response = await send('/auth/login', { method: 'POST', token: null, json: { email, password: secret } });
  const body = await response.json() as Record<string, any>;
  expect(response.status, JSON.stringify(body)).toBe(200);
  const token = body.data?.accessToken ?? body.accessToken ?? body.data?.tokens?.accessToken;
  expect(typeof token).toBe('string');
  return token as string;
}

beforeAll(async () => {
  const [before] = await db.select({ count: count() }).from(users);
  usersBefore = before.count;
  const [existing] = await db.select({ id: permissions.id }).from(permissions).where(eq(permissions.name, 'read:classes'));
  if (!existing) {
    addedPermission = `security-read-classes-${suffix}`;
    await db.insert(permissions).values({ id: addedPermission, name: 'read:classes', resource: 'classes', action: 'read' });
  }
  await db.insert(roles).values({ id: reader.roleId, name: `security-reader-${suffix}` });
  await db.insert(rolePermissions).values({ roleId: reader.roleId, permissionId: existing?.id ?? addedPermission! });
  const hash = await Bun.password.hash(password, { algorithm: 'bcrypt', cost: 10 });
  await db.insert(users).values([
    { id: roleless.id, name: 'Security role-less', email: roleless.email, password: hash, status: 'active', emailVerified: true },
    { id: reader.id, name: 'Security reader', email: reader.email, password: hash, roleId: reader.roleId,
      status: 'active', emailVerified: true },
  ]);
  await server.listen(port);
  adminToken = await login('admin@history.example.test', adminPassword);
  rolelessToken = await login(roleless.email, password);
  readerToken = await login(reader.email, password);
});

afterAll(async () => {
  await server.stop();
  await rm(join(process.cwd(), 'storage', namespace), { recursive: true, force: true });
  await db.delete(users).where(like(users.email, `%-${suffix}@security.example.test`));
  await db.delete(roles).where(eq(roles.id, reader.roleId));
  if (addedPermission) await db.delete(permissions).where(eq(permissions.id, addedPermission));
  const [after] = await db.select({ count: count() }).from(users);
  expect(after.count).toBe(usersBefore);
});

describe('route security over the history fixture', () => {
  // A route added without a guard, or behind sign-in alone, fails here until
  // it is reviewed. Disabled plugin controllers must not appear in this list.
  it('leaves no route open, or behind sign-in alone, that was not reviewed', () => {
    const routes = server.container.getInjections<RouteEntry>(INJECTION_TYPES.ROUTE);
    const open: string[] = [];
    const signInOnly: string[] = [];
    for (const route of routes) {
      const names = [...getGuardMetadata(route.target), ...getGuardMetadata(route.target, route.methodName)]
        .map((guard) => guard.guardClass?.name);
      const line = `${route.method.toUpperCase()} ${route.path}`;
      expect(route.path).not.toMatch(/^\/api\/tools\/(auth|users|roles|permissions)(\/|$)/);
      if (names.length === 0) open.push(line);
      else if (names.every((name) => name === 'AuthGuard')) signInOnly.push(line);
    }
    expect(open.sort()).toEqual([...PUBLIC_ROUTES].sort());
    expect(signInOnly.sort()).toEqual([...SIGN_IN_ROUTES].sort());
  });

  it('does not mount the disabled storage studio', async () => {
    for (const path of ['/storage-studio/namespaces', '/storage-studio/capabilities', '/storage-studio/usage']) {
      for (const token of [null, rolelessToken, readerToken, adminToken]) {
        expect(await status(path, { token }), path).toBe(404);
      }
    }
    const folder = { method: 'POST', token: rolelessToken, json: { path: 'probe' } };
    expect(await status(`/storage-studio/${namespace}/folders`, folder)).toBe(404);
  });

  it('leaves stored files to administrators, and serves them to any signed-in account', async () => {
    const upload = await send(`/${namespace}/files/probe.png`, { method: 'POST', body: png, type: 'image/png' });
    expect(upload.status, await upload.clone().text()).toBe(200);

    const refused = [
      ['GET', `/${namespace}/files`],
      ['GET', `/${namespace}/files/info/probe.png`],
      ['POST', `/${namespace}/files/other.png`],
      ['DELETE', `/${namespace}/files/probe.png`],
      ['DELETE', `/${namespace}/files`],
    ] as const;
    for (const token of [rolelessToken, readerToken]) {
      for (const [method, path] of refused) {
        const init = method === 'POST' ? { method, token, body: png, type: 'image/png' } : { method, token };
        expect(await status(path, init), `${method} ${path}`).toBe(401);
      }
    }

    const served = await send(`/${namespace}/files/serve/probe.png`, { token: rolelessToken });
    expect(served.status).toBe(200);
    expect(new Uint8Array(await served.arrayBuffer())).toEqual(png);
    expect(await status(`/${namespace}/files/serve/probe.png`, { token: null })).toBe(401);

    const listed = await send(`/${namespace}/files`);
    expect(listed.status).toBe(200);
    const files = JSON.stringify(await listed.json());
    expect(files).toContain('probe.png');
    expect(files).not.toContain('other.png');
    expect(await status(`/${namespace}/files/probe.png`, { method: 'DELETE' })).toBe(200);
  });

  it('offers no storage or auth helpers over MCP, and runs timetable tools for read:classes alone', async () => {
    const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
    const { StreamableHTTPClientTransport } = await import('@modelcontextprotocol/sdk/client/streamableHttp.js');
    const connect = async (token: string) => {
      const client = new Client({ name: 'school-route-security-test', version: '1.0.0' });
      const transport = new StreamableHTTPClientTransport(new URL(`http://localhost:${port}/api/mcp`), {
        requestInit: { headers: { Authorization: `Bearer ${token}` } },
      });
      await client.connect(transport);
      return { client, transport };
    };
    // A guard refusal may come back as a tool error or as a protocol error.
    const refused = (call: Promise<unknown>) =>
      call.then((result) => (result as { isError?: boolean }).isError === true, () => true);

    const sessions = [await connect(adminToken), await connect(rolelessToken), await connect(readerToken)];
    try {
      const [admin, outsider, timetableReader] = sessions;
      const tools = (await admin.client.listTools()).tools.map((tool) => tool.name);
      expect(tools).toContain('class-routines_get_periods');
      expect(tools.filter((name) => /^(storage|auth|users|roles|permissions)_/.test(name))).toEqual([]);
      for (const name of ['auth_register', 'auth_login', 'auth_refresh', 'users_get_all', 'roles_get_all', 'permissions_get_all']) {
        expect(tools).not.toContain(name);
        expect(await refused(admin.client.callTool({ name, arguments: {} }))).toBe(true);
      }

      const call = { name: 'class-routines_get_periods', arguments: {} };
      expect(await refused(outsider.client.callTool(call))).toBe(true);
      expect(await refused(timetableReader.client.callTool(call))).toBe(false);
    } finally {
      await Promise.all(sessions.map(({ transport }) => transport.close()));
    }
  });

  it('reads timetables with read:classes, and refuses an account with no role', async () => {
    for (const path of ['/class-routines/periods', '/class-routines']) {
      expect(await status(path, { token: rolelessToken }), path).toBe(401);
      const read = await send(path, { token: readerToken });
      expect(read.status, `${path} ${await read.clone().text()}`).toBe(200);
    }
  });

  it('keeps built-in registration pending, strips privileged fields and rate-limits attempts', async () => {
    const email = mailbox('self');
    const registered = await send('/auth/register', { method: 'POST', token: null, json: {
      name: 'Security self', email, password, roleId: 'history-role-admin', status: 'active', emailVerified: true,
    } });
    expect(registered.status, await registered.clone().text()).toBe(200);
    const [account] = await db.select().from(users).where(eq(users.email, email));
    expect(account).toMatchObject({ status: 'pending', roleId: null, emailVerified: false });
    expect(await status('/auth/login', { method: 'POST', token: null, json: { email, password } })).toBe(403);
    const retries: number[] = [];
    for (let attempt = 2; attempt <= 6; attempt += 1) {
      retries.push(await status('/auth/register', { method: 'POST', token: null, json: { email, password } }));
    }
    expect(retries.slice(0, 4)).not.toContain(429);
    expect(retries[4]).toBe(429);
  });

  it('does not mount duplicate auth or account-management REST routes', async () => {
    for (const token of [null, adminToken]) {
      for (const action of ['register', 'login', 'refresh', 'logout', 'me']) {
        expect(await status(`/tools/auth/${action}`, {
          method: action === 'me' ? 'GET' : 'POST', token,
        }), action).toBe(404);
      }
      for (const resource of ['users', 'roles', 'permissions']) {
        expect(await status(`/tools/${resource}`, { token }), resource).toBe(404);
      }
    }
  });

  it('keeps built-in account-management routes available to the dashboard', async () => {
    for (const resource of ['users', 'roles', 'permissions']) {
      expect(await status(`/${resource}`), resource).toBe(200);
    }
    const email = mailbox('created');
    const created = await send('/users', { method: 'POST', json: { name: 'Security created', email, password, status: 'active' } });
    expect(created.status, await created.clone().text()).toBe(200);
    const [account] = await db.select().from(users).where(eq(users.email, email));
    expect(account.status).toBe('active');
    expect(await status('/auth/login', { method: 'POST', token: null, json: { email, password } })).toBe(200);
  });
});
