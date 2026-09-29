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
// 5496 to 5507 are taken by the other history transport suites.
const port = 5508;
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

// The fixture's 2025-2026 assignment: Mathematics in section A.
const pastExam = {
  classId: 'history-class-2025', sectionId: 'history-section-2025-a', subjectId: 'history-subject-math',
  teacherId: 'history-teacher', title: 'History term exam', type: 'midterm', date: '2025-12-15',
  startTime: '09:00', endTime: '10:00', duration: 60, totalMarks: 20, passingMarks: 10,
};

async function create(year: string, body: Record<string, unknown> = pastExam) {
  const result = await request('/exams', year, 'POST', body);
  if (result.body.data?.id) created.push(result.body.data.id);
  return result;
}

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
  const { exams } = await import('../../src/modules/exams/examSchema');
  const { inArray } = await import('drizzle-orm');
  if (created.length) await db.delete(exams).where(inArray(exams.id, created));
  await server.stop();
});

describe('authenticated Exams REST and MCP on the marked PostgreSQL fixture', () => {
  it('creates a past-year exam in that year only, and keeps reads and changes there', async () => {
    const past = await create('2025-2026', { ...pastExam, type: 'final',
      totalMarks: 40, passingMarks: 15, status: 'completed' });
    expect(past.status).toBe(200);
    const id = past.body.data.id as string;
    expect(past.body.data.academicYearId).toBe('history-year-2025');

    const listed = async (path: string, year?: string) =>
      (await request(path, year)).body.data.map((row: { id: string }) => row.id);
    expect(await listed('/exams', '2025-2026')).toContain(id);
    expect(await listed('/exams/section/history-section-2025-a', '2025-2026')).toContain(id);
    expect(await listed('/exams/teacher/history-teacher', '2025-2026')).toContain(id);
    expect(await listed('/exams')).not.toContain(id);
    expect(await listed('/exams/section/history-section-2025-a')).toEqual([]);

    expect((await request(`/exams/${id}`, '2026-2027')).status).toBe(404);
    expect((await request(`/exams/${id}`, '2026-2027', 'PUT', { title: 'Wrong year' })).status).toBe(404);
    expect((await request(`/exams/${id}`, '2026-2027', 'DELETE')).status).toBe(404);
    expect((await request(`/grades/exam/${id}`, '2026-2027')).status).toBe(404);
    const corrected = await request(`/exams/${id}`, '2025-2026', 'PUT', { title: 'Corrected term exam' });
    expect(corrected.status).toBe(200);
    expect((await request(`/exams/${id}`, '2025-2026')).body.data).toMatchObject({
      title: 'Corrected term exam', type: 'final', totalMarks: '40.00',
      passingMarks: '15.00', status: 'completed',
    });
    expect((await request(`/exams/${id}`, '2025-2026', 'DELETE')).status).toBe(200);
  });

  it('refuses sections of another year than the selected one, and a bad year selection', async () => {
    const wrongYear = await create('2026-2027');
    expect(wrongYear.status).toBe(409);
    expect(wrongYear.body.message).toBe("The exam's sections must belong to the selected school year");
    expect((await request('/exams?academicYear=2026-2027', '2025-2026')).status).toBe(400);
    expect((await request('/exams', '2099-2100')).status).toBe(404);
    expect((await request('/exams/missing-exam', '2025-2026')).body.message).toBe('Exam not found');
  });

  it("lists only the student's own assessments and upcoming exams in their profile", async () => {
    // Current-year section A; every 2026-2027 student sits in A, and Hamza (S07) is not enrolled that year.
    const upcoming = await create('2026-2027', { ...pastExam, classId: 'history-class-2026',
      sectionId: 'history-section-2026-a', date: '2027-05-10' });
    expect(upcoming.status).toBe(200);
    const profile = async (studentId: string, year?: string) =>
      (await request(`/profiles/students/${studentId}/academic`, year)).body.data;
    const adam = await profile('history-student-01');
    expect(adam.upcomingExams.map((row: { id: string }) => row.id)).toEqual([upcoming.body.data.id]);
    expect(adam.assessments.map((row: { id: string }) => row.id)).toEqual(['history-assessment-2026']);
    const hamza = await profile('history-student-07');
    expect(hamza.upcomingExams).toEqual([]);
    expect(hamza.assessments).toEqual([]);
    // A past year's exams are no longer upcoming.
    expect((await profile('history-student-01', '2025-2026')).upcomingExams).toEqual([]);
  });

  it('uses the same year selection over authenticated MCP', async () => {
    const past = await create('2025-2026');
    expect(past.status).toBe(200);
    const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
    const { StreamableHTTPClientTransport } = await import('@modelcontextprotocol/sdk/client/streamableHttp.js');
    const list = async (headerYear?: string, toolYear?: string) => {
      const client = new Client({ name: 'school-exam-history-test', version: '1.0.0' });
      const transport = new StreamableHTTPClientTransport(new URL(`http://localhost:${port}/api/mcp`), {
        requestInit: { headers: { Authorization: `Bearer ${adminToken}`,
          ...(headerYear ? { 'X-Academic-Year': headerYear } : {}) } },
      });
      await client.connect(transport);
      try {
        const tools = await client.listTools();
        expect(tools.tools.find((tool) => tool.name === 'exams_get_all')?.inputSchema.properties)
          .toHaveProperty('academicYear');
        const result = await client.callTool({ name: 'exams_get_all', arguments: toolYear ? { academicYear: toolYear } : {} });
        const { content, isError } = result as { content: Array<{ text: string }>; isError?: boolean };
        expect(isError).not.toBe(true);
        return (JSON.parse(content[0].text) as Array<{ id: string }>).map((row) => row.id);
      } finally { await transport.close(); }
    };
    expect(await list('2025-2026')).toContain(past.body.data.id);
    expect(await list(undefined, '2026-2027')).not.toContain(past.body.data.id);
  });
});
