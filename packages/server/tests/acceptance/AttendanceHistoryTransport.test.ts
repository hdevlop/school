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
const port = 5496;
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

describe('authenticated Attendance transport on the marked PostgreSQL fixture', () => {
  it('selects exact rows for lists, dates and details with normal permissions', async () => {
    const old = await request('/attendance', '2025-2026');
    const current = await request('/attendance');
    expect(old.status).toBe(200);
    expect(current.status).toBe(200);
    expect(old.body.data.map((row: { id: string }) => row.id).sort())
      .toEqual(['history-attendance-2025', 'history-attendance-legacy-2025']);
    expect(current.body.data.map((row: { id: string }) => row.id))
      .toEqual(['history-attendance-2026']);
    expect((await request('/attendance/date/2025-11-11', '2025-2026')).body.data
      .map((row: { id: string }) => row.id)).toEqual(['history-attendance-legacy-2025']);
    expect((await request('/attendance/date/2025-11-11', '2026-2027')).body.data).toEqual([]);
    expect((await request('/attendance/history-attendance-2025', '2026-2027')).status).toBe(404);
    expect((await request('/attendance?academicYear=2026-2027', '2025-2026')).status).toBe(400);
    expect((await request('/attendance', '2025')).status).toBe(400);
    expect((await request('/attendance', '2025-2026', 'GET', undefined, principalToken)).status).toBe(403);
  });

  it('marks and corrects a past-year record only in its selected year', async () => {
    const data = { type: 'student', studentId: 'history-student-01',
      sectionId: 'history-section-2025-a', date: '2025-12-15', status: 'absent' };
    const created = await request('/attendance', '2025-2026', 'POST', data);
    expect(created.status).toBe(200);
    const id = created.body.data.id as string;
    try {
      expect(created.body.data.academicYearId).toBe('history-year-2025');
      expect((await request(`/attendance/${id}`, '2026-2027')).status).toBe(404);
      expect((await request(`/attendance/${id}`, '2026-2027', 'PUT', { status: 'present' })).status).toBe(404);
      const corrected = await request('/attendance/status', '2025-2026', 'PUT', {
        studentId: data.studentId, sectionId: data.sectionId, date: data.date, status: 'late',
        note: 'Arrived after the morning register',
      });
      expect(corrected.status).toBe(200);
      expect(corrected.body.data.status).toBe('late');
      expect((await request(`/attendance/${id}/history`, '2025-2026')).body.data).toHaveLength(1);
    } finally {
      expect((await request(`/attendance/${id}`, '2025-2026', 'DELETE')).status).toBe(200);
    }
    expect((await request('/attendance', '2026-2027', 'POST', data)).status).toBe(409);
  });

  it('uses the dated placement on both sides of a midyear section transfer', async () => {
    const baseMark = { type: 'student', studentId: 'history-student-05',
      date: '2026-01-16', status: 'present' };
    expect((await request('/attendance', '2025-2026', 'POST', {
      ...baseMark, sectionId: 'history-section-2025-a',
    })).status).toBe(409);
    const afterTransfer = await request('/attendance', '2025-2026', 'POST', {
      ...baseMark, sectionId: 'history-section-2025-b',
    });
    expect(afterTransfer.status).toBe(200);
    const id = afterTransfer.body.data.id as string;
    try {
      expect(afterTransfer.body.data.academicYearId).toBe('history-year-2025');
      expect(afterTransfer.body.data.sectionId).toBe('history-section-2025-b');
    } finally {
      expect((await request(`/attendance/${id}`, '2025-2026', 'DELETE')).status).toBe(200);
    }
  });

  it('scopes the student profile and dashboard consumers without swallowing year errors', async () => {
    const old = await request('/profiles/students/history-student-01/attendance', '2025-2026');
    const current = await request('/profiles/students/history-student-01/attendance');
    expect(old.status).toBe(200);
    expect(current.status).toBe(200);
    expect(old.body.data.total).toBe(1);
    expect(current.body.data.total).toBe(1);
    expect((await request('/dashboard/today', '2025-2026')).status).toBe(200);
    expect((await request('/dashboard/academic/kpis', '2025-2026')).status).toBe(200);
  });

  it('uses the same year selection in MCP header and tool input', async () => {
    const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
    const { StreamableHTTPClientTransport } = await import('@modelcontextprotocol/sdk/client/streamableHttp.js');
    const call = async (headerYear?: string, toolYear?: string) => {
      const client = new Client({ name: 'school-attendance-history-test', version: '1.0.0' });
      const transport = new StreamableHTTPClientTransport(new URL(`http://localhost:${port}/api/mcp`), {
        requestInit: { headers: { Authorization: `Bearer ${adminToken}`,
          ...(headerYear ? { 'X-Academic-Year': headerYear } : {}) } },
      });
      await client.connect(transport);
      try {
        const tools = await client.listTools();
        expect(tools.tools.find((tool) => tool.name === 'attendance_get_all')?.inputSchema.properties)
          .toHaveProperty('academicYear');
        return await client.callTool({ name: 'attendance_get_all',
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
      .toEqual(['history-attendance-2025', 'history-attendance-legacy-2025']);
    expect((JSON.parse(current.content[0].text) as Array<{ id: string }>).map((row) => row.id))
      .toEqual(['history-attendance-2026']);
  });
});
