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
// 5496 to 5508 are taken by the other history transport suites.
const port = 5509;
let adminToken: string;
const created: string[] = [];

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

// Omar (S05) sat in section A on 10 October 2025, the fixture assessment's date.
const pastGrade = { studentId: 'history-student-05', assessmentId: 'history-assessment-2025', marksObtained: 15 };
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
  const { grades } = await import('../../src/modules/grades/gradeSchema');
  const { inArray } = await import('drizzle-orm');
  if (created.length) await db.delete(grades).where(inArray(grades.id, created));
  await server.stop();
});

describe('authenticated Grades REST and MCP on the marked PostgreSQL fixture', () => {
  it('records a past-year grade in its source\'s year, and keeps every read and change there', async () => {
    const past = await request('/grades', '2025-2026', 'POST', pastGrade);
    expect(past.status).toBe(200);
    const id = past.body.data.id as string;
    created.push(id);
    expect(past.body.data.academicYearId).toBe('history-year-2025');

    for (const path of ['/grades', '/grades/student/history-student-05', '/grades/assessment/history-assessment-2025',
      '/grades/section/history-section-2025-a', '/grades/teacher/history-teacher']) {
      expect(ids((await request(path, '2025-2026')).body)).toContain(id);
    }
    expect(ids((await request('/grades')).body)).not.toContain(id);
    expect(ids((await request('/grades/student/history-student-05')).body)).not.toContain(id);
    expect((await request('/grades/student/history-student-05/report', '2025-2026')).body.data.totalGrades).toBe(1);
    expect((await request('/grades/student/history-student-05/report')).body.data.totalGrades).toBe(0);
    const profile = await request('/profiles/students/history-student-05/academic', '2025-2026');
    expect(ids({ data: profile.body.data.grades })).toEqual([id]);

    expect((await request(`/grades/${id}`, '2026-2027')).status).toBe(404);
    expect((await request(`/grades/${id}`, '2026-2027', 'PUT', { feedback: 'Wrong year' })).status).toBe(404);
    expect((await request(`/grades/${id}`, '2026-2027', 'DELETE')).status).toBe(404);
    expect((await request('/grades/assessment/history-assessment-2025', '2026-2027')).status).toBe(404);
    const corrected = await request(`/grades/${id}`, '2025-2026', 'PUT', { feedback: 'Well argued' });
    expect(corrected.status).toBe(200);
    expect(corrected.body.data.feedback).toBe('Well argued');
    expect((await request(`/grades/${id}`, '2025-2026', 'DELETE')).status).toBe(200);
  });

  it('refuses a grade for another year\'s source and a bad year selection', async () => {
    // The 2025-2026 assessment is not found in 2026-2027.
    expect((await request('/grades', '2026-2027', 'POST', pastGrade)).status).toBe(404);
    expect((await request('/grades?academicYear=2026-2027', '2025-2026')).status).toBe(400);
    expect((await request('/grades', '2099-2100')).status).toBe(404);
  });

  it('uses the same year selection over authenticated MCP', async () => {
    const past = await request('/grades', '2025-2026', 'POST', pastGrade);
    expect(past.status).toBe(200);
    created.push(past.body.data.id);
    const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
    const { StreamableHTTPClientTransport } = await import('@modelcontextprotocol/sdk/client/streamableHttp.js');
    const list = async (headerYear?: string, toolYear?: string) => {
      const client = new Client({ name: 'school-grade-history-test', version: '1.0.0' });
      const transport = new StreamableHTTPClientTransport(new URL(`http://localhost:${port}/api/mcp`), {
        requestInit: { headers: { Authorization: `Bearer ${adminToken}`,
          ...(headerYear ? { 'X-Academic-Year': headerYear } : {}) } },
      });
      await client.connect(transport);
      try {
        const tools = await client.listTools();
        expect(tools.tools.find((tool) => tool.name === 'grades_get_all')?.inputSchema.properties)
          .toHaveProperty('academicYear');
        const result = await client.callTool({ name: 'grades_get_all', arguments: toolYear ? { academicYear: toolYear } : {} });
        const { content, isError } = result as { content: Array<{ text: string }>; isError?: boolean };
        expect(isError).not.toBe(true);
        return (JSON.parse(content[0].text) as Array<{ id: string }>).map((row) => row.id);
      } finally { await transport.close(); }
    };
    expect(await list('2025-2026')).toContain(past.body.data.id);
    expect(await list(undefined, '2026-2027')).not.toContain(past.body.data.id);
  });
});
