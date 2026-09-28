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
// 5496 to 5510 are taken by the other history transport suites.
const port = 5511;
let adminToken: string;
const created = { classes: [] as string[], sections: [] as string[], routines: [] as string[] };

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

async function create(kind: keyof typeof created, path: string, year: string, body: Record<string, unknown>) {
  const result = await request(path, year, 'POST', body);
  if (result.body.data?.id) created[kind].push(result.body.data.id);
  return result;
}

const ids = (body: Record<string, any>) => (body.data as Array<{ id: string }>).map((row) => row.id);

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
  const { classes, sections, routineSchedules } = await import('../../src/database/schema');
  const { inArray } = await import('drizzle-orm');
  if (created.routines.length) await db.delete(routineSchedules).where(inArray(routineSchedules.id, created.routines));
  if (created.sections.length) await db.delete(sections).where(inArray(sections.id, created.sections));
  if (created.classes.length) await db.delete(classes).where(inArray(classes.id, created.classes));
  await server.stop();
});

describe('authenticated Classes, Sections and Class routines REST and MCP on the marked PostgreSQL fixture', () => {
  it('refuses reads without a signed-in user', async () => {
    for (const path of ['/classes', '/sections', '/class-routines']) {
      expect((await request(path, undefined, 'GET', undefined, '')).status).toBe(401);
    }
  });

  it('creates a class in the selected year, whatever year the body names, and keeps it there', async () => {
    const past = await create('classes', '/classes', '2025-2026',
      { name: 'History transport class', level: 'Middle', academicYear: '2020-2021' });
    expect(past.status).toBe(200);
    const id = past.body.data.id as string;
    expect(past.body.data.academicYear).toBe('2025-2026');

    expect(ids((await request('/classes', '2025-2026')).body)).toContain(id);
    expect(ids((await request('/classes')).body)).not.toContain(id);
    const other = await request(`/classes/${id}`, '2026-2027');
    expect(other.status).toBe(404);
    expect(other.body.message).toBe('Class not found');
    expect((await request(`/classes/${id}`, '2026-2027', 'PUT', { name: 'Wrong year' })).status).toBe(404);
    expect((await request(`/classes/${id}`, '2026-2027', 'DELETE')).status).toBe(404);
    const renamed = await request(`/classes/${id}`, '2025-2026', 'PUT', { name: 'History transport class 2', academicYear: '2026-2027' });
    expect(renamed.status).toBe(200);
    expect(renamed.body.data.academicYear).toBe('2025-2026');

    const students = await request('/classes/history-class-2025/students', '2025-2026');
    expect(students.status).toBe(200);
    expect(students.body.data).toHaveLength(8);
    expect((await request('/classes/history-class-2025/students', '2026-2027')).status).toBe(404);
  });

  it("adds sections only to the selected year's classes and refuses to delete a section that held students", async () => {
    const [klass] = created.classes;
    const refused = await request('/sections', '2026-2027', 'POST', { classId: klass, name: 'T' });
    expect(refused.status).toBe(409);
    expect(refused.body.message).toBe("The section's class must belong to the selected school year");
    const section = await create('sections', '/sections', '2025-2026', { classId: klass, name: 'T' });
    expect(section.status).toBe(200);
    const id = section.body.data.id as string;
    expect(ids((await request('/sections', '2025-2026')).body)).toContain(id);
    expect((await request(`/sections/${id}`, '2026-2027')).status).toBe(404);
    expect((await request(`/sections/${id}`, '2025-2026', 'PUT', { classId: 'history-class-2026' })).status).toBe(409);

    // A 2024-2025 section keeps its placements after its students moved on.
    const held = await request('/sections/history-section-2024-a', '2024-2025', 'DELETE');
    expect(held.status).toBe(409);
    expect(held.body.message).toBe('This section has students; move them before deleting or moving it');
    expect((await request('/sections/history-section-2025-b/students', '2025-2026')).body.data
      .map((row: { id: string }) => row.id)).toEqual(['history-student-05']);
  });

  it("makes timetables for the selected year's sections and reads them only there", async () => {
    const [section] = created.sections;
    const refused = await request('/class-routines', '2026-2027', 'POST', { sectionId: section, name: 'Wrong year' });
    expect(refused.status).toBe(409);
    expect(refused.body.message).toBe("The routine's section must belong to the selected school year");
    const routine = await create('routines', '/class-routines', '2025-2026', { sectionId: section, name: 'History routine' });
    expect(routine.status).toBe(200);
    const id = routine.body.data.id as string;
    expect(routine.body.data.academicYear).toBe('2025-2026');
    expect(ids((await request(`/class-routines?sectionId=${section}`, '2025-2026')).body)).toEqual([id]);
    expect((await request(`/class-routines?sectionId=${section}`, '2026-2027')).body.data).toEqual([]);
    expect((await request(`/class-routines/${id}`, '2026-2027')).status).toBe(404);
    expect((await request(`/class-routines/${id}/archive`, '2026-2027', 'POST')).status).toBe(404);
    expect((await request(`/class-routines/sections/${section}/published`, '2025-2026')).body.data?.id).toBe(id);
    expect((await request(`/class-routines/assignments/${section}`, '2026-2027')).status).toBe(409);
  });

  it('refuses a conflicting or unknown year selection', async () => {
    expect((await request('/classes?academicYear=2026-2027', '2025-2026')).status).toBe(400);
    expect((await request('/sections', '2099-2100')).status).toBe(404);
  });

  it('uses the same year selection over authenticated MCP', async () => {
    const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
    const { StreamableHTTPClientTransport } = await import('@modelcontextprotocol/sdk/client/streamableHttp.js');
    const list = async (tool: string, headerYear?: string, toolYear?: string) => {
      const client = new Client({ name: 'school-class-history-test', version: '1.0.0' });
      const transport = new StreamableHTTPClientTransport(new URL(`http://localhost:${port}/api/mcp`), {
        requestInit: { headers: { Authorization: `Bearer ${adminToken}`,
          ...(headerYear ? { 'X-Academic-Year': headerYear } : {}) } },
      });
      await client.connect(transport);
      try {
        const tools = await client.listTools();
        expect(tools.tools.find((item) => item.name === tool)?.inputSchema.properties).toHaveProperty('academicYear');
        const result = await client.callTool({ name: tool, arguments: toolYear ? { academicYear: toolYear } : {} });
        const { content, isError } = result as { content: Array<{ text: string }>; isError?: boolean };
        expect(isError).not.toBe(true);
        return (JSON.parse(content[0].text) as Array<{ id: string }>).map((row) => row.id);
      } finally { await transport.close(); }
    };
    expect(await list('classes_get_classes', '2025-2026')).toContain(created.classes[0]);
    expect(await list('classes_get_classes', undefined, '2024-2025')).toEqual(['history-class-2024']);
    expect(await list('sections_get_sections', undefined, '2025-2026')).toContain(created.sections[0]);
  });
});
