import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { eq, inArray } from 'drizzle-orm';

const fixtureUrl = process.env.SCHOOL_HISTORY_TEST_DB_URL;
const adminPassword = process.env.SCHOOL_HISTORY_ADMIN_PASSWORD;
if (!fixtureUrl || !adminPassword) throw new Error('History fixture env is required');
const target = new URL(fixtureUrl);
if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname) || target.pathname !== '/school_history_test') {
  throw new Error('Expected local school_history_test');
}
process.env.DB_URL = fixtureUrl;
const { db } = await import('../../src/database/db');
const { users, roles, staffRoles, staff, teachers, teacherAssignments, assessments, attendance, classes, sections, subjects } = await import('../../src/database/schema');
const { server } = await import('../../src/index');
const suffix = crypto.randomUUID().slice(0, 8);
const owned: Array<{ id: string; staffId: string; userId: string }> = [];
const ownRecords: string[] = [];
let token: string;
let addedRoleId: string | undefined;
let addedStaffRole = false;

async function request(path: string, method = 'GET', body?: unknown) {
  const response = await server.fetch(new Request(`http://school.local/api${path}`, {
    method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'X-Academic-Year': '2026-2027', 'Accept-Language': 'en', ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  }));
  const result = await response.json() as Record<string, any>;
  return { status: response.status, body: result, data: result.data ?? result };
}

async function createTeacher() {
  const index = owned.length;
  const result = await request('/teachers', 'POST', {
    id: `delete-${suffix}-${index}`, name: `Salma Idrissi ${index}`, cin: `SI${suffix}${index}`,
    email: `salma.${suffix}.${index}@example.test`, phone: `+212612${Date.now().toString().slice(-5)}${index}`,
    address: 'Rabat', salary: 5000, hireDate: '2026-09-01', password: `${crypto.randomUUID()}aA1!`,
    assignments: [{ classId: 'history-class-2026', sectionIds: ['history-section-2026-a'], subjectIds: ['history-subject-math'] }],
  });
  expect(result.status).toBe(200);
  const teacher = result.data;
  owned.push({ id: teacher.id, staffId: teacher.staffId, userId: teacher.userId });
  await db.insert(teacherAssignments).values({ id: `old-${teacher.id}`, teacherId: teacher.id,
    classId: 'history-class-2025', sectionId: 'history-section-2025-a', subjectId: 'history-subject-math' });
  return teacher;
}

async function expectRemoved(teacher: { id: string; staffId: string; userId: string }) {
  expect(await db.select().from(teachers).where(eq(teachers.id, teacher.id))).toHaveLength(0);
  expect(await db.select().from(teacherAssignments).where(eq(teacherAssignments.teacherId, teacher.id))).toHaveLength(0);
  expect(await db.select().from(staff).where(eq(staff.id, teacher.staffId))).toHaveLength(0);
  expect(await db.select().from(users).where(eq(users.id, teacher.userId))).toHaveLength(0);
}

beforeAll(async () => {
  const addedRoles = await db.insert(roles).values({ id: `role-${suffix}`, name: 'teacher' })
    .onConflictDoNothing().returning({ id: roles.id });
  addedRoleId = addedRoles[0]?.id;
  const addedStaffRoles = await db.insert(staffRoles).values({ code: 'teacher', label: 'Teacher', active: true })
    .onConflictDoNothing().returning({ code: staffRoles.code });
  addedStaffRole = addedStaffRoles.length > 0;
  await server.listen(5540);
  const login = await request('/auth/login', 'POST', { email: 'admin@history.example.test', password: adminPassword });
  expect(login.status).toBe(200);
  token = login.data.accessToken;
});

afterAll(async () => {
  if (ownRecords.length) {
    await db.delete(assessments).where(inArray(assessments.id, ownRecords));
    await db.delete(attendance).where(inArray(attendance.id, ownRecords));
  }
  for (const teacher of owned) {
    await db.delete(teacherAssignments).where(eq(teacherAssignments.teacherId, teacher.id));
    await db.delete(teachers).where(eq(teachers.id, teacher.id));
    await db.delete(staff).where(eq(staff.id, teacher.staffId));
    await db.delete(users).where(eq(users.id, teacher.userId));
  }
  if (addedStaffRole) await db.delete(staffRoles).where(eq(staffRoles.code, 'teacher'));
  if (addedRoleId) await db.delete(roles).where(eq(roles.id, addedRoleId));
  await server.stop();
});

describe('admin teacher deletion on PostgreSQL', () => {
  it('automatically removes assignments from every year and the linked login, keeping academic structure', async () => {
    const teacher = await createTeacher();
    expect(await db.select().from(teacherAssignments).where(eq(teacherAssignments.teacherId, teacher.id))).toHaveLength(2);
    expect((await request(`/teachers/${teacher.id}`, 'DELETE')).status).toBe(200);
    await expectRemoved(teacher);
    expect(await db.select().from(classes).where(eq(classes.id, 'history-class-2025'))).toHaveLength(1);
    expect(await db.select().from(sections).where(eq(sections.id, 'history-section-2026-a'))).toHaveLength(1);
    expect(await db.select().from(subjects).where(eq(subjects.id, 'history-subject-math'))).toHaveLength(1);
  });

  it('rolls back teacher and assignment removal when linked staff history refuses deletion', async () => {
    const teacher = await createTeacher();
    const recordId = `attendance-${teacher.id}`;
    ownRecords.push(recordId);
    await db.insert(attendance).values({ id: recordId, type: 'staff', staffId: teacher.staffId,
      academicYearId: 'history-year-2026', date: '2026-10-01', status: 'present' });
    const result = await request(`/teachers/${teacher.id}`, 'DELETE');
    expect(result.status).toBe(409);
    expect(result.body.message).toContain('set an end date and status');
    expect(await db.select().from(teachers).where(eq(teachers.id, teacher.id))).toHaveLength(1);
    expect(await db.select().from(teacherAssignments).where(eq(teacherAssignments.teacherId, teacher.id))).toHaveLength(2);
    expect(await db.select().from(users).where(eq(users.id, teacher.userId))).toHaveLength(1);
  });

  it('keeps recorded assessments and their assignments with a clear explanation', async () => {
    const teacher = await createTeacher();
    const recordId = `assessment-${teacher.id}`;
    ownRecords.push(recordId);
    await db.insert(assessments).values({ id: recordId, title: 'Lecture encadree',
      teacherAssignmentId: `old-${teacher.id}`, academicYearId: 'history-year-2025',
      sectionIds: ['history-section-2025-a'], date: '2025-10-01', totalMarks: '20', passingMarks: '10' });
    const result = await request(`/teachers/${teacher.id}`, 'DELETE');
    expect(result.status).toBe(409);
    expect(result.body.message).toContain('assessments, exams, attendance or timetable');
    expect(await db.select().from(teacherAssignments).where(eq(teacherAssignments.teacherId, teacher.id))).toHaveLength(2);
    expect(await db.select().from(assessments).where(eq(assessments.id, recordId))).toHaveLength(1);
  });

  it('uses the same automatic cleanup for the bulk endpoint', async () => {
    const first = await createTeacher();
    const second = await createTeacher();
    const result = await request('/teachers/bulk', 'DELETE', [first.id, second.id]);
    expect(result.status).toBe(200);
    expect(result.data.deletedCount).toBe(2);
    await expectRemoved(first);
    await expectRemoved(second);
  });
});
