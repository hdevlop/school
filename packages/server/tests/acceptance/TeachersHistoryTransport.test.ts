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
const { db } = await import('../../src/database/db');
const { staff, teachers } = await import('../../src/database/schema');
const { eq } = await import('drizzle-orm');
const base = 'http://school.local/api';
const port = 5530;
let token: string;

async function request(path: string, year?: string, method = 'GET', data?: unknown, authenticated = true) {
  const response = await server.fetch(new Request(`${base}${path}`, {
    method,
    headers: { ...(authenticated ? { Authorization: `Bearer ${token}` } : {}),
      ...(year ? { 'X-Academic-Year': year } : {}),
      ...(data ? { 'content-type': 'application/json' } : {}) },
    ...(data ? { body: JSON.stringify(data) } : {}),
  }));
  return { status: response.status, body: await response.json() as Record<string, any> };
}

beforeAll(async () => {
  await server.listen(port);
  const login = await request('/auth/login', undefined, 'POST',
    { email: 'admin@history.example.test', password: adminPassword }, false);
  expect(login.status).toBe(200);
  token = login.body.data?.accessToken ?? login.body.accessToken;
  if (!token) throw new Error('History admin login returned no access token');
});
afterAll(async () => { await server.stop(); });

describe('authenticated teacher year selection over REST and MCP', () => {
  it('preserves an inactive staff status on a one-field teacher REST edit', async () => {
    const [teacher] = await db.select({ staffId: teachers.staffId,
      specialization: teachers.specialization }).from(teachers)
      .where(eq(teachers.id, 'history-teacher'));
    const [member] = await db.select({ status: staff.status }).from(staff)
      .where(eq(staff.id, teacher.staffId));
    try {
      await db.update(staff).set({ status: 'inactive' }).where(eq(staff.id, teacher.staffId));
      const updated = await request('/teachers/history-teacher', '2026-2027', 'PUT',
        { specialization: 'History mathematics' });
      expect(updated.status).toBe(200);
      const [saved] = await db.select({ status: staff.status }).from(staff)
        .where(eq(staff.id, teacher.staffId));
      expect(saved.status).toBe('inactive');
    } finally {
      await db.update(staff).set({ status: member.status }).where(eq(staff.id, teacher.staffId));
      await db.update(teachers).set({ specialization: teacher.specialization })
        .where(eq(teachers.id, 'history-teacher'));
    }
  });

  it('keeps teacher identity shared and selects assignment data by year', async () => {
    expect((await request('/teachers', undefined, 'GET', undefined, false)).status).toBe(401);
    for (const year of ['2024', '2025', '2026']) {
      const label = `${year}-${Number(year) + 1}`;
      const detail = await request('/teachers/history-teacher', label);
      expect(detail.status).toBe(200);
      expect(detail.body.data.assignments).toHaveLength(1);
      expect(detail.body.data.assignments[0].classId).toBe(`history-class-${year}`);
      const classes = await request('/teachers/history-teacher/classes', label);
      expect(classes.status).toBe(200);
      expect(classes.body.data.map((row: { id: string }) => row.id)).toEqual([`history-class-${year}`]);
    }
    expect((await request('/teachers/history-teacher', '2099-2100')).status).toBe(404);
    expect((await request('/teachers/history-teacher', '2025-2026?')).status).toBe(400);
    expect((await request('/teachers/history-teacher?academicYear=2026-2027', '2025-2026')).status).toBe(400);
  });

  it('refuses to assign a teacher to another year class', async () => {
    const refused = await request('/teachers/assign-subject', '2026-2027', 'POST', {
      teacherId: 'history-teacher', classId: 'history-class-2025',
      sectionId: 'history-section-2025-a', subjectId: 'history-subject-math',
    });
    expect(refused.status).toBe(404);
    expect((await request('/teachers/history-teacher/classes', '2025-2026')).body.data).toHaveLength(1);
  });

  it('protects assignment history when deleting a teacher', async () => {
    const one = await request('/teachers/history-teacher', '2026-2027', 'DELETE');
    expect(one.status).toBe(409);
    expect(one.body.message).toContain('class assignments');
    expect((await request('/teachers/history-teacher/classes', '2024-2025')).body.data).toHaveLength(1);
    expect((await request('/teachers', '2026-2027', 'DELETE')).status).toBe(409);
  });

  it('exposes the selected year to the teacher MCP tool', async () => {
    const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
    const { StreamableHTTPClientTransport } = await import('@modelcontextprotocol/sdk/client/streamableHttp.js');
    const client = new Client({ name: 'school-teacher-history-test', version: '1.0.0' });
    const transport = new StreamableHTTPClientTransport(new URL(`http://localhost:${port}/api/mcp`), {
      requestInit: { headers: { Authorization: `Bearer ${token}` } },
    });
    await client.connect(transport);
    try {
      const tools = await client.listTools();
      expect(tools.tools.find((item) => item.name === 'teachers_get_classes')?.inputSchema.properties)
        .toHaveProperty('academicYear');
      const result = await client.callTool({ name: 'teachers_get_classes',
        arguments: { id: 'history-teacher', academicYear: '2025-2026' } });
      const { content, isError } = result as { content: Array<{ text: string }>; isError?: boolean };
      expect(isError).not.toBe(true);
      expect((JSON.parse(content[0].text) as Array<{ id: string }>).map((row) => row.id))
        .toEqual(['history-class-2025']);
    } finally { await transport.close(); }
  });
});
