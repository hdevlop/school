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
// 5496 to 5506 are taken by the other history transport suites.
const port = 5507;
let adminToken: string;
const created: string[] = [];

async function login(email: string, password: string) {
  const response = await server.fetch(new Request(`${base}/auth/login`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  }));
  const body = await response.json() as Record<string, any>;
  expect(response.status).toBe(200);
  const token = body.data?.accessToken ?? body.accessToken ?? body.data?.tokens?.accessToken;
  if (typeof token !== 'string') throw new Error('Login response has no access token');
  return token;
}

async function request(path: string, year?: string, method = 'GET', data?: unknown) {
  const response = await server.fetch(new Request(`${base}${path}`, {
    method,
    headers: { Authorization: `Bearer ${adminToken}`, ...(year ? { 'X-Academic-Year': year } : {}),
      ...(data ? { 'content-type': 'application/json' } : {}) },
    ...(data ? { body: JSON.stringify(data) } : {}),
  }));
  return { status: response.status, body: await response.json() as Record<string, any> };
}

async function create(year: string, studentId: string, incidentAt: string) {
  const result = await request('/discipline', year, 'POST', {
    studentId, incidentAt, category: 'disrespect', severity: 'low', description: 'History transport incident',
  });
  if (result.body.data?.id) created.push(result.body.data.id);
  return result;
}

beforeAll(async () => {
  await server.listen(port);
  adminToken = await login('admin@history.example.test', adminPassword);
});

afterAll(async () => {
  const { db } = await import('../../src/database/db');
  const { disciplineIncidents } = await import('../../src/modules/discipline/disciplineSchema');
  const { inArray } = await import('drizzle-orm');
  if (created.length) await db.delete(disciplineIncidents).where(inArray(disciplineIncidents.id, created));
  await server.stop();
});

describe('authenticated Discipline REST and MCP on the marked PostgreSQL fixture', () => {
  it('files a past-year incident under the class and section of its day, and keeps it in that year', async () => {
    // Omar moved from section A to section B on 15 January 2026.
    const beforeTransfer = await create('2025-2026', 'history-student-05', '2025-12-01T10:00:00.000Z');
    const afterTransfer = await create('2025-2026', 'history-student-05', '2026-02-01T10:00:00.000Z');
    expect(beforeTransfer.status).toBe(200);
    expect(afterTransfer.status).toBe(200);
    expect(beforeTransfer.body.data).toMatchObject({ classId: 'history-class-2025', sectionId: 'history-section-2025-a' });
    expect(afterTransfer.body.data.sectionId).toBe('history-section-2025-b');
    const ids = [beforeTransfer.body.data.id, afterTransfer.body.data.id].sort();

    const inPast = await request('/discipline', '2025-2026');
    const inCurrent = await request('/discipline');
    expect(inPast.status).toBe(200);
    expect(inPast.body.data.map((row: { id: string }) => row.id).sort()).toEqual(ids);
    expect(inCurrent.body.data.map((row: { id: string }) => row.id)).not.toContain(ids[0]);
    expect((await request(`/discipline/${ids[0]}`, '2026-2027')).status).toBe(404);
    expect((await request(`/discipline/${ids[0]}`, '2026-2027', 'PUT', { description: 'Wrong year' })).status).toBe(404);
    expect((await request(`/discipline/${ids[0]}/resolve`, '2026-2027', 'POST', {
      actionType: 'verbal_warning', resolutionNote: 'Wrong year',
    })).status).toBe(404);
    expect((await request(`/discipline/${ids[0]}`, '2026-2027', 'DELETE')).status).toBe(404);

    // Moving the date across the transfer moves the incident to the other section.
    const moved = await request(`/discipline/${ids[0]}`, '2025-2026', 'PUT', { incidentAt: '2026-02-10T10:00:00.000Z' });
    expect(moved.status).toBe(200);
    expect(moved.body.data.sectionId).toBe('history-section-2025-b');
    expect((await request(`/discipline/${ids[0]}`, '2025-2026', 'PUT', { incidentAt: '2026-09-10T10:00:00.000Z' })).status)
      .toBe(409);
    expect((await request(`/discipline/${ids[1]}`, '2025-2026', 'DELETE')).status).toBe(200);
  });

  it('refuses a date outside the selected year, a student not placed that day, and a bad year selection', async () => {
    expect((await create('2025-2026', 'history-student-05', '2026-09-10T10:00:00.000Z')).status).toBe(409);
    expect((await create('2025-2026', 'history-student-07', '2026-03-05T10:00:00.000Z')).status).toBe(409);
    expect((await create('2025-2026', 'history-student-08', '2025-10-01T10:00:00.000Z')).status).toBe(409);
    expect((await create('2025-2026', 'history-student-missing', '2025-10-01T10:00:00.000Z')).status).toBe(404);
    expect((await request('/discipline?academicYear=2026-2027', '2025-2026')).status).toBe(400);
    expect((await request('/discipline', '2099-2100')).status).toBe(404);
  });

  it('uses the same year selection over authenticated MCP', async () => {
    const past = await create('2025-2026', 'history-student-01', '2025-11-20T10:00:00.000Z');
    expect(past.status).toBe(200);
    const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
    const { StreamableHTTPClientTransport } = await import('@modelcontextprotocol/sdk/client/streamableHttp.js');
    const list = async (headerYear?: string, toolYear?: string) => {
      const client = new Client({ name: 'school-discipline-history-test', version: '1.0.0' });
      const transport = new StreamableHTTPClientTransport(new URL(`http://localhost:${port}/api/mcp`), {
        requestInit: { headers: { Authorization: `Bearer ${adminToken}`,
          ...(headerYear ? { 'X-Academic-Year': headerYear } : {}) } },
      });
      await client.connect(transport);
      try {
        const tools = await client.listTools();
        expect(tools.tools.find((tool) => tool.name === 'discipline_list')?.inputSchema.properties)
          .toHaveProperty('academicYear');
        const result = await client.callTool({ name: 'discipline_list', arguments: toolYear ? { academicYear: toolYear } : {} });
        const { content, isError } = result as { content: Array<{ text: string }>; isError?: boolean };
        expect(isError).not.toBe(true);
        return (JSON.parse(content[0].text) as Array<{ id: string }>).map((row) => row.id);
      } finally { await transport.close(); }
    };
    expect(await list('2025-2026')).toContain(past.body.data.id);
    expect(await list(undefined, '2026-2027')).not.toContain(past.body.data.id);
  });
});
