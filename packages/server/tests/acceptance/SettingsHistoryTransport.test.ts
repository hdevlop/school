import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { count, eq, inArray } from 'drizzle-orm';

const rawUrl = process.env.SCHOOL_HISTORY_TEST_DB_URL;
const adminPassword = process.env.SCHOOL_HISTORY_ADMIN_PASSWORD;
const principalPassword = process.env.SCHOOL_HISTORY_PRINCIPAL_PASSWORD;
if (!rawUrl || !adminPassword || !principalPassword) throw new Error('History fixture env is required');
const target = new URL(rawUrl);
if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)
  || target.pathname !== '/school_history_test') throw new Error('Expected local school_history_test');
process.env.DB_URL = rawUrl;

const { db } = await import('../../src/database/db');
const { roles, users } = await import('../../src/database/schema');
const { settings } = await import('../../src/modules/settings/settingSchema');
const { academicYears } = await import('../../src/modules/academicYears/AcademicYearSchema');
const { yearScopedModules } = await import('../../src/config/yearScope');
const { server } = await import('../../src/index');

const base = 'http://school.local/api';
const port = 5528;
const suffix = crypto.randomUUID().slice(0, 8);
const outsider = { roleId: `history-settings-role-${suffix}`, userId: `history-settings-outsider-${suffix}`,
  email: `settings-${suffix}@history.example.test`, password: crypto.randomUUID() };
let adminToken: string;
let principalToken: string;
let outsiderToken: string;
let stored: typeof settings.$inferSelect;
let yearsBefore: number;

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

async function row() {
  const [current] = await db.select().from(settings);
  return current;
}

async function restore() {
  const { id: _id, ...values } = stored;
  await db.update(settings).set(values).where(eq(settings.id, stored.id));
}

const withoutEdit = ({ schoolName: _name, updatedAt: _updated, ...rest }: Record<string, unknown>) => rest;

beforeAll(async () => {
  const rows = await db.select().from(settings);
  expect(rows.length).toBe(1);
  stored = rows[0];
  const [years] = await db.select({ count: count() }).from(academicYears);
  yearsBefore = years.count;
  await db.insert(roles).values({ id: outsider.roleId, name: `history-settings-${suffix}` });
  await db.insert(users).values({
    id: outsider.userId, name: 'History settings outsider', email: outsider.email,
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
  await restore();
  await db.delete(users).where(inArray(users.id, [outsider.userId]));
  await db.delete(roles).where(eq(roles.id, outsider.roleId));
  const after = await db.select().from(settings);
  expect(after).toEqual([stored]);
  const [years] = await db.select({ count: count() }).from(academicYears);
  expect(years.count).toBe(yearsBefore);
});

describe('settings over the history fixture', () => {
  it('are one shared row whatever year a reader selects', async () => {
    expect(yearScopedModules).not.toHaveProperty('settings');
    const reads = await Promise.all([undefined, '2024-2025', '2025-2026', '2026-2027']
      .map((year) => request('/settings/public', year, 'GET', undefined, outsiderToken)));
    for (const read of reads) {
      expect(read.status, JSON.stringify(read.body)).toBe(200);
      expect(read.body.data.activeAcademicYearId).toBe('history-year-2026');
      expect(read.body.data.currentAcademicYear).toBe('2026-2027');
      expect(read.body.data.schoolName).toBe(stored.schoolName);
    }
    const admin = await request('/settings/admin', '2024-2025');
    expect(admin.status).toBe(200);
    expect(admin.body.data.id).toBe(stored.id);
    expect((await request('/settings/admin', undefined, 'GET', undefined, outsiderToken)).status).toBe(401);
  });

  // An update named one field and reset every other one to its default.
  it('changes only the fields an update names', async () => {
    try {
      await db.update(settings).set({ timeZone: 'Africa/Casablanca', currency: 'MAD', language: 'fr',
        maintenanceMode: true, autoBackup: false, smsNotifications: true, maxClassSize: 28 })
        .where(eq(settings.id, stored.id));
      const edited = await row();
      const response = await request('/settings', '2024-2025', 'PUT', { schoolName: 'History settings REST' });
      expect(response.status, JSON.stringify(response.body)).toBe(200);
      const after = await row();
      expect(after.schoolName).toBe('History settings REST');
      expect(withoutEdit(after)).toEqual(withoutEdit(edited));

      const principal = await request('/settings', undefined, 'PUT', { schoolName: 'History settings principal' },
        principalToken);
      expect(principal.status).toBe(200);
      expect(withoutEdit(await row())).toEqual(withoutEdit(edited));
      expect((await request('/settings', undefined, 'PUT', { schoolName: 'Outsider' }, outsiderToken)).status).toBe(401);
    } finally {
      await restore();
    }
  });

  it('moves the active year only through activation', async () => {
    const pointer = [stored.activeAcademicYearId, stored.currentAcademicYear];
    const move = await request('/settings', undefined, 'PUT', { currentAcademicYear: '2025-2026' });
    expect(move.status).toBe(409);
    const month = await request('/settings', undefined, 'PUT', { startMonth: 'august' });
    expect(month.status).toBe(409);

    // The newest row holds the active year: a second one switched years and
    // registered an open 2027-2028 on the way.
    const second = { schoolName: 'Second school', schoolPhone: '212600000000', schoolEmail: '',
      currentAcademicYear: '2027-2028' };
    for (const token of [adminToken, principalToken]) {
      const created = await request('/settings', undefined, 'POST', second, token);
      expect(created.status).toBe(409);
      expect(created.body.message).toBe('School settings already exist; change them with an update');
    }
    const after = await db.select().from(settings);
    expect(after.map((current) => [current.activeAcademicYearId, current.currentAcademicYear])).toEqual([pointer]);
    expect(await db.select().from(academicYears).where(eq(academicYears.label, '2027-2028'))).toEqual([]);
    const active = await request('/settings/public', '2025-2026');
    expect(active.body.data.activeAcademicYearId).toBe('history-year-2026');
  });

  it('gives MCP the same shared settings, with no year input', async () => {
    const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
    const { StreamableHTTPClientTransport } = await import('@modelcontextprotocol/sdk/client/streamableHttp.js');
    const client = new Client({ name: 'school-settings-history-test', version: '1.0.0' });
    const transport = new StreamableHTTPClientTransport(new URL(`http://localhost:${port}/api/mcp`), {
      requestInit: { headers: { Authorization: `Bearer ${adminToken}`, 'X-Academic-Year': '2024-2025' } },
    });
    await client.connect(transport);
    try {
      const tools = (await client.listTools()).tools.filter((tool) => tool.name.startsWith('settings_'));
      expect(tools.map((tool) => tool.name).sort())
        .toEqual(['settings_create', 'settings_get_admin_settings', 'settings_get_by_id', 'settings_get_public_settings', 'settings_update']);
      for (const tool of tools) expect(tool.inputSchema.properties ?? {}).not.toHaveProperty('academicYear');

      await db.update(settings).set({ currency: 'MAD', timeZone: 'Africa/Casablanca' }).where(eq(settings.id, stored.id));
      const edited = await row();
      const update = await client.callTool({ name: 'settings_update', arguments: { schoolName: 'History settings MCP' } }) as
        { content: Array<{ text: string }>; isError?: boolean };
      expect(update.isError, update.content[0]?.text).not.toBe(true);
      const after = await row();
      expect(after.schoolName).toBe('History settings MCP');
      expect(withoutEdit(after)).toEqual(withoutEdit(edited));

      const create = await client.callTool({ name: 'settings_create', arguments: { schoolName: 'Second school',
        schoolPhone: '212600000000', schoolEmail: '', currentAcademicYear: '2027-2028' } }) as
        { content: Array<{ text: string }>; isError?: boolean };
      expect(create.isError).toBe(true);
      expect((await db.select().from(settings)).length).toBe(1);
    } finally {
      await transport.close();
      await restore();
    }
  });
});
