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
const created = { classes: [] as string[], sections: [] as string[], cycles: [] as string[], subjects: [] as string[] };

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
  const { db } = await import('../../src/database/db');
  const { sql } = await import('drizzle-orm');
  const [fixture] = await db.execute(sql`select current_database() as database,
    (select id from school_history_fixture_marker) as marker`);
  expect(fixture.database).toBe('school_history_test');
  expect(fixture.marker).toBe('academic-history-alerts-v1');
  await server.listen(port);
  const login = await request('/auth/login', undefined, 'POST',
    { email: 'admin@history.example.test', password: adminPassword }, '');
  expect(login.status).toBe(200);
  adminToken = login.body.data?.accessToken ?? login.body.accessToken;
  if (!adminToken) throw new Error('History admin login returned no access token');
});

afterAll(async () => {
  const { db } = await import('../../src/database/db');
  const { classes, sections, cycles, subjects } = await import('../../src/database/schema');
  const { inArray } = await import('drizzle-orm');
  if (created.sections.length) await db.delete(sections).where(inArray(sections.id, created.sections));
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

  it('deletes a cycle with its classes and empty sections across school years', async () => {
    const cycle = await create('cycles', '/cycles', { name: 'History used cycle' });
    expect(cycle.status).toBe(200);
    const cycleId = cycle.body.data.id as string;
    const classIds: string[] = [];
    const sectionIds: string[] = [];
    for (const year of ['2024-2025', '2026-2027']) {
      const klass = await create('classes', '/classes', { name: 'History cycle class', level: 'Middle', cycleId }, year);
      expect(klass.status).toBe(200);
      classIds.push(klass.body.data.id);
      for (const name of ['A', 'B']) {
        const section = await create('sections', '/sections', { classId: klass.body.data.id, name }, year);
        expect(section.status).toBe(200);
        sectionIds.push(section.body.data.id);
      }
    }
    const unrelated = await create('classes', '/classes', { name: 'Unrelated cycle class', level: 'Middle' }, '2024-2025');
    expect(unrelated.status).toBe(200);

    expect((await request(`/cycles/${cycleId}`, '2026-2027', 'DELETE')).status).toBe(200);
    expect((await request(`/cycles/${cycleId}`)).body.message).toBe('Cycle not found');
    const { db } = await import('../../src/database/db');
    const { classes, sections } = await import('../../src/database/schema');
    const { inArray } = await import('drizzle-orm');
    expect(await db.select().from(classes).where(inArray(classes.id, classIds))).toEqual([]);
    expect(await db.select().from(sections).where(inArray(sections.id, sectionIds))).toEqual([]);
    expect((await request(`/classes/${unrelated.body.data.id}`, '2024-2025')).status).toBe(200);
    expect((await request(`/cycles/${created.cycles[0]}`)).status).toBe(200);
  });

  it('protects historical students when deleting their cycle', async () => {
    const cycle = await create('cycles', '/cycles', { name: 'Protected student cycle' });
    expect(cycle.status).toBe(200);
    const cycleId = cycle.body.data.id as string;
    const { db } = await import('../../src/database/db');
    const { classes, sections } = await import('../../src/database/schema');
    const { eq } = await import('drizzle-orm');
    const classId = 'history-class-2024';
    const [existing] = await db.select().from(classes).where(eq(classes.id, classId));
    const previousSections = await db.select().from(sections).where(eq(sections.classId, classId));
    await db.update(classes).set({ cycleId }).where(eq(classes.id, classId));
    try {
      const refused = await request(`/cycles/${cycleId}`, '2026-2027', 'DELETE');
      expect(refused.status).toBe(409);
      expect(refused.body.message).toContain('This section has students');
      expect((await request(`/cycles/${cycleId}`)).status).toBe(200);
      expect((await request(`/classes/${classId}`, '2024-2025')).body.data.cycleId).toBe(cycleId);
      expect(await db.select().from(sections).where(eq(sections.classId, classId))).toEqual(previousSections);
    } finally {
      await db.update(classes).set({ cycleId: existing.cycleId, updatedAt: existing.updatedAt })
        .where(eq(classes.id, classId));
    }
  });

  it('rolls back class and section deletion if an accountant still uses the cycle', async () => {
    const cycle = await create('cycles', '/cycles', { name: 'Protected accountant cycle' });
    expect(cycle.status).toBe(200);
    const cycleId = cycle.body.data.id as string;
    const klass = await create('classes', '/classes', { name: 'Accountant cycle class', level: 'Middle', cycleId }, '2024-2025');
    expect(klass.status).toBe(200);
    const section = await create('sections', '/sections', { classId: klass.body.data.id, name: 'A' }, '2024-2025');
    expect(section.status).toBe(200);
    const { db } = await import('../../src/database/db');
    const { staff, accountantAssignments } = await import('../../src/database/schema');
    const { eq } = await import('drizzle-orm');
    const [person] = await db.insert(staff).values({
      employeeCode: `cycle-accountant-${crypto.randomUUID()}`, name: 'Salma Alaoui', role: 'accountant', hireDate: '2026-09-01',
    }).returning();
    try {
      await db.insert(accountantAssignments).values({ staffId: person.id, cycleId });
      expect((await request(`/cycles/${cycleId}`, undefined, 'DELETE')).status).toBe(409);
      expect((await request(`/cycles/${cycleId}`)).status).toBe(200);
      expect((await request(`/classes/${klass.body.data.id}`, '2024-2025')).body.data.cycleId).toBe(cycleId);
      expect((await request(`/sections/${section.body.data.id}`, '2024-2025')).status).toBe(200);
    } finally {
      await db.delete(accountantAssignments).where(eq(accountantAssignments.staffId, person.id));
      await db.delete(staff).where(eq(staff.id, person.id));
    }
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

  it('also cascades cycle deletion over authenticated MCP', async () => {
    const cycle = await create('cycles', '/cycles', { name: 'MCP cascade cycle' });
    expect(cycle.status).toBe(200);
    const cycleId = cycle.body.data.id as string;
    const klass = await create('classes', '/classes', { name: 'MCP cycle class', level: 'Middle', cycleId }, '2024-2025');
    expect(klass.status).toBe(200);
    const section = await create('sections', '/sections', { classId: klass.body.data.id, name: 'A' }, '2024-2025');
    expect(section.status).toBe(200);
    const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
    const { StreamableHTTPClientTransport } = await import('@modelcontextprotocol/sdk/client/streamableHttp.js');
    const client = new Client({ name: 'school-cycle-deletion-test', version: '1.0.0' });
    const transport = new StreamableHTTPClientTransport(new URL(`http://localhost:${port}/api/mcp`), {
      requestInit: { headers: { Authorization: `Bearer ${adminToken}`, 'X-Academic-Year': '2026-2027' } },
    });
    await client.connect(transport);
    try {
      const result = await client.callTool({ name: 'cycles_delete', arguments: { id: cycleId } });
      expect(result.isError).not.toBe(true);
      expect((await request(`/cycles/${cycleId}`)).status).toBe(404);
      expect((await request(`/classes/${klass.body.data.id}`, '2024-2025')).status).toBe(404);
      expect((await request(`/sections/${section.body.data.id}`, '2024-2025')).status).toBe(404);
    } finally { await transport.close(); }
  });
});
