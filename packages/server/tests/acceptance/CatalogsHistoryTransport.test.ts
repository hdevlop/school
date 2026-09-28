import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'bun:test';

const rawUrl = process.env.SCHOOL_HISTORY_TEST_DB_URL;
const adminPassword = process.env.SCHOOL_HISTORY_ADMIN_PASSWORD;
if (!rawUrl || !adminPassword) throw new Error('History fixture env is required');
const target = new URL(rawUrl);
if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)
  || target.pathname !== '/school_history_test') throw new Error('Expected local school_history_test');
process.env.DB_URL = rawUrl;

const { server } = await import('../../src/index');
const base = 'http://school.local/api';
// 5496 to 5511 are taken by the other history transport suites.
const port = 5512;
let adminToken: string;
const created = { classes: [] as string[], cycles: [] as string[], subjects: [] as string[] };

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

async function create(kind: keyof typeof created, path: string, body: Record<string, unknown>, year?: string) {
  const result = await request(path, year, 'POST', body);
  if (result.body.data?.id) created[kind].push(result.body.data.id);
  return result;
}

const ids = (body: Record<string, any>) => (body.data as Array<{ id: string }>).map((row) => row.id).sort();

beforeAll(async () => {
  await server.listen(port);
  const login = await request('/auth/login', undefined, 'POST',
    { email: 'admin@history.example.test', password: adminPassword }, '');
  expect(login.status).toBe(200);
  adminToken = login.body.data?.accessToken ?? login.body.accessToken;
  if (!adminToken) throw new Error('History admin login returned no access token');
});

afterAll(async () => {
  const { db } = await import('../../src/database/db');
  const { classes, cycles, subjects } = await import('../../src/database/schema');
  const { inArray } = await import('drizzle-orm');
  if (created.classes.length) await db.delete(classes).where(inArray(classes.id, created.classes));
  if (created.cycles.length) await db.delete(cycles).where(inArray(cycles.id, created.cycles));
  if (created.subjects.length) await db.delete(subjects).where(inArray(subjects.id, created.subjects));
  await server.stop();
});

describe('shared Subjects and Cycles catalogs on the marked PostgreSQL fixture', () => {
  it('lists the same subjects and cycles whatever year is selected', async () => {
    const cycle = await create('cycles', '/cycles', { name: 'History shared cycle' });
    expect(cycle.status).toBe(200);
    const subjects = ids((await request('/subjects', '2024-2025')).body);
    expect(subjects).toContain('history-subject-math');
    expect(ids((await request('/subjects', '2026-2027')).body)).toEqual(subjects);
    expect(ids((await request('/subjects')).body)).toEqual(subjects);
    const cycles = ids((await request('/cycles', '2024-2025')).body);
    expect(cycles).toContain(cycle.body.data.id);
    expect(ids((await request('/cycles', '2026-2027')).body)).toEqual(cycles);
  });

  it("refuses to delete a subject any year's teacher assignment uses, and deletes an unused one", async () => {
    const used = await request('/subjects/history-subject-math', undefined, 'DELETE');
    expect(used.status).toBe(409);
    expect(used.body.message).toBe('Teachers or alerts in some school year use this subject, so it cannot be deleted');
    expect((await request('/subjects/history-subject-math')).status).toBe(200);

    const all = await request('/subjects', undefined, 'DELETE');
    expect(all.status).toBe(409);
    expect(all.body.message).toBe('Some subjects are used by teachers or alerts, so they cannot all be deleted');
    expect(ids((await request('/subjects')).body)).toContain('history-subject-math');

    const spare = await create('subjects', '/subjects', { code: 'HSPARE', name: 'History spare subject' });
    expect(spare.status).toBe(200);
    expect((await request(`/subjects/${spare.body.data.id}`, undefined, 'DELETE')).status).toBe(200);
    expect((await request(`/subjects/${spare.body.data.id}`)).body.message).toBe('Subject not found');
  });

  it("refuses to delete a cycle a past year's class uses, instead of unlinking the class", async () => {
    const cycle = await create('cycles', '/cycles', { name: 'History used cycle' });
    const cycleId = cycle.body.data.id as string;
    const klass = await create('classes', '/classes', { name: 'History cycle class', level: 'Middle', cycleId }, '2024-2025');
    expect(klass.status).toBe(200);

    const refused = await request(`/cycles/${cycleId}`, undefined, 'DELETE');
    expect(refused.status).toBe(409);
    expect(refused.body.message)
      .toBe('Classes or accountants in some school year use this cycle. Deactivate it instead of deleting it');
    expect((await request(`/classes/${klass.body.data.id}`, '2024-2025')).body.data.cycleId).toBe(cycleId);
    expect((await request(`/cycles/${cycleId}`, undefined, 'PUT', { active: false })).body.data.active).toBe(false);

    expect((await request(`/classes/${klass.body.data.id}`, '2024-2025', 'DELETE')).status).toBe(200);
    expect((await request(`/cycles/${cycleId}`, undefined, 'DELETE')).status).toBe(200);
    expect((await request(`/cycles/${cycleId}`)).body.message).toBe('Cycle not found');
  });

  it('exposes no year input over MCP', async () => {
    const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
    const { StreamableHTTPClientTransport } = await import('@modelcontextprotocol/sdk/client/streamableHttp.js');
    const client = new Client({ name: 'school-catalog-history-test', version: '1.0.0' });
    const transport = new StreamableHTTPClientTransport(new URL(`http://localhost:${port}/api/mcp`), {
      requestInit: { headers: { Authorization: `Bearer ${adminToken}`, 'X-Academic-Year': '2024-2025' } },
    });
    await client.connect(transport);
    try {
      const tools = await client.listTools();
      for (const name of ['subjects_get_subjects', 'cycles_get_cycles']) {
        expect(tools.tools.find((tool) => tool.name === name)?.inputSchema.properties ?? {}).not.toHaveProperty('academicYear');
      }
      const result = await client.callTool({ name: 'subjects_get_subjects', arguments: {} });
      const { content, isError } = result as { content: Array<{ text: string }>; isError?: boolean };
      expect(isError).not.toBe(true);
      expect((JSON.parse(content[0].text) as Array<{ id: string }>).map((row) => row.id)).toContain('history-subject-math');
    } finally { await transport.close(); }
  });
});
