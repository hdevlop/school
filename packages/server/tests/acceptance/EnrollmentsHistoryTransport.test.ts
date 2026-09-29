import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { and, eq, sql } from 'drizzle-orm';

const url = process.env.SCHOOL_HISTORY_TEST_DB_URL;
const adminPassword = process.env.SCHOOL_HISTORY_ADMIN_PASSWORD;
const principalPassword = process.env.SCHOOL_HISTORY_PRINCIPAL_PASSWORD;
if (!url || !adminPassword || !principalPassword) throw new Error('History fixture env is required');
const target = new URL(url);
if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname) || target.pathname !== '/school_history_test') {
  throw new Error('Expected local school_history_test');
}
process.env.DB_URL = url;
const { db } = await import('../../src/database/db');
const { auditLogs, students } = await import('../../src/database/schema');
const { server } = await import('../../src/index');
const base = 'http://school.local/api';
const id = 'history-enrollment-02-2025';
const reason = `History acceptance ${crypto.randomUUID()}`;
let admin: string;
let principal: string;

async function request(path: string, year = '2025-2026', method = 'GET', data?: unknown, token?: string) {
  const response = await server.fetch(new Request(`${base}${path}`, { method,
    headers: { Authorization: `Bearer ${token ?? admin}`, 'X-Academic-Year': year,
      ...(data ? { 'content-type': 'application/json' } : {}) },
    ...(data ? { body: JSON.stringify(data) } : {}),
  }));
  return { status: response.status, body: await response.json() as Record<string, any> };
}
async function login(email: string, password: string) {
  const response = await server.fetch(new Request(`${base}/auth/login`, { method: 'POST',
    headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password }) }));
  const body = await response.json() as Record<string, any>;
  expect(response.status).toBe(200);
  return body.data?.accessToken ?? body.accessToken ?? body.data?.tokens?.accessToken;
}
const state = (record: Record<string, any>) => ({ enrolledOn: record.enrolledOn,
  leftOn: record.leftOn, status: record.status,
  placements: record.placements.map(({ id, classId, sectionId, validFrom, validTo }) =>
    ({ id, classId, sectionId, validFrom, validTo })),
});

beforeAll(async () => {
  await server.listen(5529);
  admin = await login('admin@history.example.test', adminPassword);
  principal = await login('principal@history.example.test', principalPassword);
});
afterAll(async () => {
  await db.delete(auditLogs).where(and(eq(auditLogs.resource, 'student-enrollments'),
    sql`${auditLogs.metadata}->>'reason' = ${reason}`));
  await server.stop();
});

describe('enrollment history over authenticated REST', () => {
  it('projects corrections only for the active year and restores the original placement', async () => {
    const activeId = 'history-enrollment-10-2026';
    const read = async () => {
      const result = await request(`/student-enrollments/${activeId}`, '2026-2027');
      return result.body.data ?? result.body;
    };
    const original = await read();
    const expected = state(original);
    let changed = false;
    try {
      const result = await request(`/student-enrollments/${activeId}`, '2026-2027', 'PUT', {
        enrolledOn: original.enrolledOn, leftOn: original.leftOn, status: original.status,
        placement: { ...expected.placements[0], sectionId: 'history-section-2026-b' }, expected, reason,
      });
      changed = result.status === 200;
      expect(result.status).toBe(200);
      const [projection] = await db.select().from(students).where(eq(students.id, 'history-student-10'));
      expect(projection.sectionId).toBe('history-section-2026-b');
    } finally {
      if (changed) {
        const restored = await request(`/student-enrollments/${activeId}`, '2026-2027', 'PUT', {
          enrolledOn: original.enrolledOn, leftOn: original.leftOn, status: original.status,
          placement: expected.placements[0], expected: state(await read()), reason,
        });
        expect(restored.status).toBe(200);
        const [projection] = await db.select().from(students).where(eq(students.id, 'history-student-10'));
        expect(projection.sectionId).toBe(expected.placements[0].sectionId);
      }
    }
  });
  it('filters cross-year ids and rejects invalid/conflicting selection and missing authentication', async () => {
    expect((await request(`/student-enrollments/${id}`)).status).toBe(200);
    expect((await request(`/student-enrollments/${id}`, '2026-2027')).status).toBe(404);
    expect((await request(`/student-enrollments/${id}`, 'invalid')).status).toBe(400);
    expect((await request(`/student-enrollments/${id}?academicYear=2026-2027`)).status).toBe(400);
    expect((await request(`/student-enrollments/${id}`, '2025-2026', 'GET', undefined, 'invalid')).status).toBe(401);
  });
  it('audits an old-year correction, rejects its stale retry, and lets the principal restore it without touching the current projection', async () => {
    const original = ((await request(`/student-enrollments/${id}`)).body.data ?? (await request(`/student-enrollments/${id}`)).body);
    const [projection] = await db.select().from(students).where(eq(students.id, original.studentId));
    const expected = state(original);
    const data = { enrolledOn: original.enrolledOn, leftOn: original.leftOn, status: original.status,
      placement: { ...expected.placements[0], sectionId: 'history-section-2025-b' }, expected, reason };
    let changed = false;
    try {
      const result = await request(`/student-enrollments/${id}`, '2025-2026', 'PUT', data);
      expect(result.status).toBe(200); changed = result.status === 200;
      expect((await request(`/student-enrollments/${id}`, '2025-2026', 'PUT', data)).status).toBe(409);
      const [after] = await db.select().from(students).where(eq(students.id, original.studentId));
      expect(after).toEqual(projection);
      const audit = await db.select().from(auditLogs).where(and(eq(auditLogs.resourceId, id),
        sql`${auditLogs.metadata}->>'reason' = ${reason}`));
      expect(audit).toHaveLength(1);
      expect(audit[0].userRole).toBe('admin');
      expect((audit[0].metadata as any).before.placements[0].sectionId).toBe('history-section-2025-a');
    } finally {
      if (changed) {
        const current = ((await request(`/student-enrollments/${id}`)).body.data ?? (await request(`/student-enrollments/${id}`)).body);
        const restored = await request(`/student-enrollments/${id}`, '2025-2026', 'PUT', {
          enrolledOn: original.enrolledOn, leftOn: original.leftOn, status: original.status,
          placement: expected.placements[0], expected: state(current), reason,
        }, principal);
        expect(restored.status).toBe(200);
      }
    }
  });
  it('rolls back a correction conflicting with dated attendance and writes no success audit', async () => {
    const enrollmentId = 'history-enrollment-05-2025';
    const original = ((await request(`/student-enrollments/${enrollmentId}`)).body.data ?? (await request(`/student-enrollments/${enrollmentId}`)).body);
    const expected = state(original);
    const first = expected.placements.find((p) => p.id.endsWith('-a'));
    const result = await request(`/student-enrollments/${enrollmentId}`, '2025-2026', 'PUT', {
      enrolledOn: original.enrolledOn, leftOn: original.leftOn, status: original.status,
      placement: { ...first, sectionId: 'history-section-2025-b' }, expected, reason,
    });
    expect(result.status).toBe(409);
    expect(state(((await request(`/student-enrollments/${enrollmentId}`)).body.data ?? (await request(`/student-enrollments/${enrollmentId}`)).body))).toEqual(expected);
    expect(await db.select().from(auditLogs).where(and(eq(auditLogs.resourceId, enrollmentId),
      sql`${auditLogs.metadata}->>'reason' = ${reason}`))).toHaveLength(0);
  });
});
