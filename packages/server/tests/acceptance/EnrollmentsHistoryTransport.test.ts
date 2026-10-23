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
const { auditLogs, students, sections, attendance } = await import('../../src/database/schema');
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
  it('checks duplicate codes and full sections before enrollment without creating a student', async () => {
    const [student] = await db.select().from(students).where(eq(students.id, 'history-student-10'));
    const [section] = await db.select().from(sections).where(eq(sections.id, student.sectionId));
    const before = await db.select({ id: students.id }).from(students);
    try {
      await db.update(sections).set({ maxStudents: 1 }).where(eq(sections.id, section.id));
      const result = await request('/students/validate-admission', '2026-2027', 'POST', {
        studentCode: student.studentCode, classId: student.classId, sectionId: student.sectionId, yearEnrolledOn: '2026-09-01',
      });
      expect(result.status).toBe(200);
      expect((result.body.data ?? result.body).issues.map((issue: any) => issue.field)).toEqual(['studentCode', 'sectionId']);
      expect(await db.select({ id: students.id }).from(students)).toEqual(before);
      expect((await request('/students/validate-admission', '2026-2027', 'POST', {
        studentCode: student.studentCode, classId: student.classId, sectionId: student.sectionId, yearEnrolledOn: '2026-09-01',
      }, 'invalid')).status).toBe(401);
    } finally {
      await db.update(sections).set({ maxStudents: section.maxStudents }).where(eq(sections.id, section.id));
    }
  });

  it('corrects a same-day placement through transfer, audits it, and updates section counts', async () => {
    const note = `${reason} same-day`;
    const read = async () => { const { body } = await request(`/student-enrollments/${id}`); return body.data ?? body; };
    const readSections = async () => { const { body } = await request('/sections'); return (body.data ?? body) as any[]; };
    const original = await read();
    const expected = state(original);
    const placement = expected.placements[0];
    const before = await readSections();
    let changed = false;
    try {
      const moved = await request(`/student-enrollments/${id}/transfer`, '2025-2026', 'POST', {
        classId: placement.classId, sectionId: 'history-section-2025-b', validFrom: placement.validFrom, reason: note,
      });
      changed = moved.status === 200;
      expect(moved.status).toBe(200);
      const after = await read();
      expect(after.placements).toHaveLength(expected.placements.length);
      expect(after.placements[0].id).toBe(placement.id);
      expect(after.placements[0].validFrom).toBe(placement.validFrom);
      const sectionRows = await readSections();
      for (const [sectionId, delta] of [[placement.sectionId, -1], ['history-section-2025-b', 1]] as const) {
        expect(sectionRows.find(row => row.id === sectionId).studentCount)
          .toBe(before.find(row => row.id === sectionId).studentCount + delta);
      }
      const classResponse = (await request('/classes')).body;
      const classes = classResponse.data ?? classResponse;
      const nested = classes.find((row: any) => row.id === placement.classId).sections;
      expect(nested.find((row: any) => row.id === 'history-section-2025-b').studentCount)
        .toBe(sectionRows.find(row => row.id === 'history-section-2025-b').studentCount);
      const audits = await db.select().from(auditLogs).where(and(eq(auditLogs.resourceId, id), sql`${auditLogs.metadata}->>'reason' = ${note}`));
      expect(audits).toHaveLength(1);
      expect(audits[0].userRole).toBe('admin');
    } finally {
      if (changed) {
        const restored = await request(`/student-enrollments/${id}`, '2025-2026', 'PUT', {
          enrolledOn: original.enrolledOn, leftOn: original.leftOn, status: original.status,
          placement, expected: state(await read()), reason: note,
        }, principal);
        expect(restored.status).toBe(200);
      }
      await db.delete(auditLogs).where(and(eq(auditLogs.resourceId, id), sql`${auditLogs.metadata}->>'reason' = ${note}`));
    }
  });

  it('rolls back a same-day transfer when it would strand dated records', async () => {
    const enrollmentId = id;
    const originalResponse = (await request(`/student-enrollments/${enrollmentId}`)).body;
    const original = originalResponse.data ?? originalResponse;
    const expected = state(original);
    const current = original.placements[0];
    const attendanceId = `same-day-${crypto.randomUUID()}`;
    const note = `${reason} dated-conflict`;
    let changed = false;
    try {
      await db.insert(attendance).values({ id: attendanceId, studentId: original.studentId,
        sectionId: current.sectionId, academicYearId: original.academicYearId, date: current.validFrom, status: 'present' });
      const result = await request(`/student-enrollments/${enrollmentId}/transfer`, '2025-2026', 'POST', {
        classId: current.classId, sectionId: 'history-section-2025-b', validFrom: current.validFrom, reason: note,
      });
      changed = result.status === 200;
      expect(result.status).toBe(409);
      const after = (await request(`/student-enrollments/${enrollmentId}`)).body;
      expect(state(after.data ?? after)).toEqual(expected);
      expect(await db.select().from(auditLogs).where(and(eq(auditLogs.resourceId, id),
        sql`${auditLogs.metadata}->>'reason' = ${note}`))).toHaveLength(0);
    } finally {
      if (changed) {
        const after = (await request(`/student-enrollments/${enrollmentId}`)).body;
        const restored = await request(`/student-enrollments/${enrollmentId}`, '2025-2026', 'PUT', {
          enrolledOn: original.enrolledOn, leftOn: original.leftOn, status: original.status,
          placement: current, expected: state(after.data ?? after), reason: note,
        });
        expect(restored.status).toBe(200);
      }
      await db.delete(attendance).where(eq(attendance.id, attendanceId));
      await db.delete(auditLogs).where(and(eq(auditLogs.resourceId, id), sql`${auditLogs.metadata}->>'reason' = ${note}`));
    }
  });

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
      const history = await request(`/students/${original.studentId}/enrollments`);
      expect(history.status).toBe(200);
      const corrected = history.body.data.find((enrollment: any) => enrollment.id === id).placements[0];
      expect(corrected.actorId).toBe(audit[0].userId);
      expect(corrected.actorName).toBeTruthy();
      expect(corrected.updatedAt).toBeTruthy();
      expect(corrected.reason).toBe(reason);
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
