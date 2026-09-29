import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'bun:test';

const rawUrl = process.env.SCHOOL_HISTORY_TEST_DB_URL;
const password = process.env.SCHOOL_HISTORY_ADMIN_PASSWORD;
const principalPassword = process.env.SCHOOL_HISTORY_PRINCIPAL_PASSWORD;
if (!rawUrl || !password || !principalPassword) throw new Error('History fixture env is required');
const target = new URL(rawUrl);
if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)
  || target.pathname !== '/school_history_test') throw new Error('Expected local school_history_test');
process.env.DB_URL = rawUrl;

const { server } = await import('../../src/index');
const base = 'http://school.local/api';
const port = 5497;
let adminToken: string;
let principalToken: string;

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

beforeAll(async () => {
  await server.listen(port);
  for (const actor of [
    { email: 'admin@history.example.test', password, set: (token: string) => { adminToken = token; } },
    { email: 'principal@history.example.test', password: principalPassword,
      set: (token: string) => { principalToken = token; } },
  ]) {
    const response = await request('/auth/login', undefined, 'POST', {
      email: actor.email, password: actor.password,
    }, '');
    expect(response.status).toBe(200);
    const token = response.body.data?.accessToken ?? response.body.accessToken;
    if (!token) throw new Error(`History ${actor.email} login returned no access token`);
    actor.set(token);
  }
});
afterAll(async () => { await server.stop(); });

describe('authenticated Assessments transport on the marked PostgreSQL fixture', () => {
  it('selects exact rows and rejects another year or malformed selection', async () => {
    const old = await request('/assessments', '2025-2026');
    const current = await request('/assessments');
    expect(old.status).toBe(200);
    expect(current.status).toBe(200);
    expect(old.body.data.map((row: { id: string }) => row.id).sort())
      .toEqual(['history-assessment-2025', 'history-assessment-legacy-2025']);
    expect(current.body.data.map((row: { id: string }) => row.id))
      .toEqual(['history-assessment-2026']);
    expect((await request('/assessments/history-assessment-2025', '2026-2027')).status).toBe(404);
    expect((await request('/assessments?academicYear=2026-2027', '2025-2026')).status).toBe(400);
    expect((await request('/assessments', '2025')).status).toBe(400);
    expect((await request('/assessments', '2025-2026', 'GET', undefined, principalToken)).status).toBe(401);
  });

  it('creates in a past year only for matching sections and scopes updates and deletion', async () => {
    const body = { classId: 'history-class-2025', sectionId: 'history-section-2025-a',
      subjectId: 'history-subject-math', teacherId: 'history-teacher', title: 'History term quiz',
      date: '2025-12-15', duration: 45, totalMarks: 20, passingMarks: 10,
      type: 'project', status: 'completed' };
    const created = await request('/assessments', '2025-2026', 'POST', body);
    expect(created.status).toBe(200);
    const id = created.body.data.id as string;
    try {
      expect(created.body.data.academicYearId).toBe('history-year-2025');
      expect((await request(`/assessments/${id}`, '2026-2027')).status).toBe(404);
      expect((await request(`/assessments/${id}`, '2026-2027', 'PUT', { title: 'Wrong year' })).status).toBe(404);
      expect((await request(`/assessments/${id}`, '2025-2026', 'PUT', { title: 'Corrected quiz' })).body.data.title)
        .toBe('Corrected quiz');
      expect((await request(`/assessments/${id}`, '2025-2026')).body.data)
        .toMatchObject({ type: 'project', status: 'completed' });
    } finally {
      expect((await request(`/assessments/${id}`, '2025-2026', 'DELETE')).status).toBe(200);
    }
    const wrongYear = await request('/assessments', '2026-2027', 'POST', body);
    expect(wrongYear.status).toBe(409);
    expect(wrongYear.body.message).toBe("The assessment's sections must belong to the selected school year");
    expect((await request('/assessments/missing-assessment', '2025-2026')).body.message).toBe('Assessment not found');
  });

  it('keeps profile and grade-source consumers inside the same year scope', async () => {
    const oldProfile = await request('/profiles/students/history-student-01/academic', '2025-2026');
    const currentProfile = await request('/profiles/students/history-student-01/academic');
    expect(oldProfile.status).toBe(200);
    expect(currentProfile.status).toBe(200);
    expect(oldProfile.body.data.assessments.map((row: { id: string }) => row.id).sort())
      .toEqual(['history-assessment-2025', 'history-assessment-legacy-2025']);
    expect(currentProfile.body.data.assessments.map((row: { id: string }) => row.id))
      .toEqual(['history-assessment-2026']);
    const pending = await request('/profiles/teachers/history-teacher/pending-grading', '2025-2026');
    expect(pending.status).toBe(200);
    expect(pending.body.data.pendingCount).toBe(2);
    expect((await request('/grades/assessment/history-assessment-2025', '2026-2027')).status).toBe(404);
  });

  it('uses the same year selection in MCP header and tool input', async () => {
    const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
    const { StreamableHTTPClientTransport } = await import('@modelcontextprotocol/sdk/client/streamableHttp.js');
    const call = async (headerYear?: string, toolYear?: string) => {
      const client = new Client({ name: 'school-assessment-history-test', version: '1.0.0' });
      const transport = new StreamableHTTPClientTransport(new URL(`http://localhost:${port}/api/mcp`), {
        requestInit: { headers: { Authorization: `Bearer ${adminToken}`,
          ...(headerYear ? { 'X-Academic-Year': headerYear } : {}) } },
      });
      await client.connect(transport);
      try {
        const tools = await client.listTools();
        expect(tools.tools.find((tool) => tool.name === 'assessments_get_all')?.inputSchema.properties)
          .toHaveProperty('academicYear');
        return await client.callTool({ name: 'assessments_get_all',
          arguments: toolYear ? { academicYear: toolYear } : {} }) as {
          content: Array<{ text: string }>; isError?: boolean;
        };
      } finally { await transport.close(); }
    };
    const [old, current, conflict] = await Promise.all([
      call('2025-2026'), call(undefined, '2026-2027'), call('2025-2026', '2026-2027'),
    ]);
    expect(old.isError).not.toBe(true);
    expect(current.isError).not.toBe(true);
    expect(conflict.isError).toBe(true);
    expect((JSON.parse(old.content[0].text) as Array<{ id: string }>).map((row) => row.id).sort())
      .toEqual(['history-assessment-2025', 'history-assessment-legacy-2025']);
    expect((JSON.parse(current.content[0].text) as Array<{ id: string }>).map((row) => row.id))
      .toEqual(['history-assessment-2026']);
  });
});
