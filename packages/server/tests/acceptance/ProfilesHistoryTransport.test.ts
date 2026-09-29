import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { count, eq, inArray, like } from 'drizzle-orm';

const rawUrl = process.env.SCHOOL_HISTORY_TEST_DB_URL;
const adminPassword = process.env.SCHOOL_HISTORY_ADMIN_PASSWORD;
const principalPassword = process.env.SCHOOL_HISTORY_PRINCIPAL_PASSWORD;
if (!rawUrl || !adminPassword || !principalPassword) throw new Error('History fixture env is required');
const target = new URL(rawUrl);
if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)
  || target.pathname !== '/school_history_test') throw new Error('Expected local school_history_test');
process.env.DB_URL = rawUrl;
// A controlled business day inside 2026-2027, independent of the machine clock.
process.env.APP_BUSINESS_DATE = '2026-09-27';

const { db } = await import('../../src/database/db');
const { assessments, events, parents, permissions, rolePermissions, roles, studentParents, users } =
  await import('../../src/database/schema');
const { yearScopedModules } = await import('../../src/config/yearScope');
const { server } = await import('../../src/index');

const base = 'http://school.local/api';
const port = 5527;
const suffix = crypto.randomUUID().slice(0, 8);
const prefix = `history-profiles-rest-${suffix}`;
const TEACHER = 'history-teacher';
const OMAR = 'history-student-05';
const AYA = 'history-student-08';
const ADAM = 'history-student-01';
const parentId = `${prefix}-parent`;
const parentUserId = `${prefix}-parent-user`;
const todayAssessmentId = `${prefix}-today`;
const eventId = (name: string) => `${prefix}-${name}`;
// A school-wide role with no grades, attendance, alerts, events or fee access.
const librarian = { roleId: `${prefix}-role`, userId: `${prefix}-librarian`,
  email: `profiles-${suffix}@history.example.test`, password: crypto.randomUUID() };
const LIBRARIAN_GRANTS = ['read:students', 'read:teachers'];
let adminToken: string;
let principalToken: string;
let librarianToken: string;
const createdPermissionIds: string[] = [];

async function login(email: string, password: string) {
  const response = await server.fetch(new Request(`${base}/auth/login`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  }));
  const body = await response.json() as Record<string, any>;
  expect(response.status).toBe(200);
  const token = body.data?.accessToken ?? body.accessToken ?? body.data?.tokens?.accessToken;
  expect(typeof token).toBe('string');
  return token as string;
}

async function request(path: string, year?: string, token = adminToken) {
  const response = await server.fetch(new Request(`${base}${path}`, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(year ? { 'X-Academic-Year': year } : {}) },
  }));
  // A handler that returns null answers with no body at all.
  const text = await response.text();
  return { status: response.status, body: (text ? JSON.parse(text) : null) as Record<string, any> | null };
}

async function data(path: string, year?: string) {
  const response = await request(path, year);
  expect(response.status, `${path} ${JSON.stringify(response.body)}`).toBe(200);
  return response.body?.data;
}

const ids = (rows: Array<{ id: string }>) => rows.map((row) => row.id);
const sorted = (rows: Array<{ id: string }>) => ids(rows).sort();

beforeAll(async () => {
  await db.insert(users).values({ id: parentUserId, name: 'History profiles parent',
    email: `profiles-parent-${suffix}@history.example.test`, password: 'not-used', status: 'active', emailVerified: true });
  await db.insert(parents).values({ id: parentId, userId: parentUserId, name: `History profiles parent ${suffix}`,
    relationshipType: 'guardian' });
  await db.insert(studentParents).values([OMAR, AYA].map((studentId) => ({
    id: `${prefix}-link-${studentId.slice(-2)}`, studentId, parentId,
  })));
  // Omar and Aya sit in 2026-2027 section A; nobody is placed in B that year.
  await db.insert(events).values([
    { id: eventId('school'), title: 'School open day', startDate: '2026-10-05' },
    { id: eventId('section-a'), title: 'Section A parents meeting', startDate: '2026-10-06',
      visibility: 'parents' as const, sectionId: 'history-section-2026-a' },
    { id: eventId('section-b'), title: 'Section B outing', startDate: '2026-10-07', sectionId: 'history-section-2026-b' },
    { id: eventId('staff'), title: 'Staff training', startDate: '2026-10-08', visibility: 'staff' as const },
  ].map((event) => ({ type: 'academic' as const, endDate: event.startDate, ...event })));
  // An assessment of the fixture teacher on the business day.
  await db.insert(assessments).values({ id: todayAssessmentId, teacherAssignmentId: 'history-assignment-2026',
    academicYearId: 'history-year-2026', title: 'Profiles quiz today', date: '2026-09-27',
    totalMarks: '20', passingMarks: '10', sectionIds: ['history-section-2026-a'] });

  // The fixture grants only announcements; add what the librarian reads and
  // remove only what this suite created.
  for (const name of LIBRARIAN_GRANTS) {
    const [action, resource] = name.split(':');
    const [created] = await db.insert(permissions).values({ id: `${prefix}-${action}-${resource}`, name, resource, action })
      .onConflictDoNothing().returning({ id: permissions.id });
    if (created) createdPermissionIds.push(created.id);
  }
  const granted = await db.select({ id: permissions.id }).from(permissions).where(inArray(permissions.name, LIBRARIAN_GRANTS));
  expect(granted).toHaveLength(LIBRARIAN_GRANTS.length);
  await db.insert(roles).values({ id: librarian.roleId, name: 'librarian' });
  await db.insert(rolePermissions).values(granted.map((permission) => ({ roleId: librarian.roleId, permissionId: permission.id })));
  await db.insert(users).values({
    id: librarian.userId, name: 'History profiles librarian', email: librarian.email,
    password: await Bun.password.hash(librarian.password, { algorithm: 'bcrypt', cost: 10 }),
    roleId: librarian.roleId, status: 'active', emailVerified: true,
  });

  await server.listen(port);
  adminToken = await login('admin@history.example.test', adminPassword);
  principalToken = await login('principal@history.example.test', principalPassword);
  librarianToken = await login(librarian.email, librarian.password);
});

afterAll(async () => {
  await server.stop();
  await db.delete(events).where(like(events.id, `${prefix}-%`));
  await db.delete(assessments).where(eq(assessments.id, todayAssessmentId));
  await db.delete(studentParents).where(eq(studentParents.parentId, parentId));
  await db.delete(parents).where(eq(parents.id, parentId));
  await db.delete(users).where(inArray(users.id, [parentUserId, librarian.userId]));
  await db.delete(rolePermissions).where(eq(rolePermissions.roleId, librarian.roleId));
  await db.delete(roles).where(eq(roles.id, librarian.roleId));
  if (createdPermissionIds.length) await db.delete(permissions).where(inArray(permissions.id, createdPermissionIds));
  const [left] = await db.select({ count: count() }).from(events).where(like(events.id, `${prefix}-%`));
  expect(left.count).toBe(0);
  const [roleLeft] = await db.select({ count: count() }).from(roles).where(eq(roles.id, librarian.roleId));
  expect(roleLeft.count).toBe(0);
});

describe('profiles over the history fixture', () => {
  it("shows a teacher's classes and students of the selected year, and today only in the year that holds it", async () => {
    for (const group of ['student-profile', 'parent-profile', 'teacher-profile']) expect(yearScopedModules).toHaveProperty(group);
    const classes = async (year?: string) => ids((await data(`/profiles/teachers/${TEACHER}/classes`, year)).classes);
    // Every year's assignment used to show under any year.
    expect(await classes('2024-2025')).toEqual(['history-class-2024']);
    expect(await classes('2025-2026')).toEqual(['history-class-2025']);
    expect(await classes()).toEqual(['history-class-2026']);

    const students = async (year?: string) => sorted((await data(`/profiles/teachers/${TEACHER}/students`, year)).students);
    expect(await students('2025-2026')).toEqual(['01', '02', '03', '04', '05', '06', '07', '09'].map((n) => `history-student-${n}`));
    expect(await students()).toEqual(['01', '02', '03', '05', '06', '08', '09', '10'].map((n) => `history-student-${n}`));

    const current = await data(`/profiles/teachers/${TEACHER}/schedule-today`);
    expect(ids(current.todayAssessments)).toEqual([todayAssessmentId]);
    expect(ids(current.classes)).toEqual(['history-class-2026']);
    // 2025-2026 has no today: null, not an empty list that reads as a free day.
    const old = await data(`/profiles/teachers/${TEACHER}/schedule-today`, '2025-2026');
    expect(old.todayAssessments).toBeNull();
    expect(ids(old.classes)).toEqual(['history-class-2025']);

    expect(ids((await data(`/profiles/teachers/${TEACHER}/pending-grading`)).pendingAssessments).sort())
      .toEqual(['history-assessment-2026', todayAssessmentId].sort());
  });

  it("shows each student tab in the selected year", async () => {
    // Aya was not enrolled in 2024-2025; she is in 2026-2027.
    const notEnrolled = (await data(`/profiles/students/${AYA}/overview`, '2024-2025')).student;
    expect(notEnrolled).toMatchObject({ id: AYA, class: null, section: null, enrollment: null });
    const enrolled = (await data(`/profiles/students/${AYA}/overview`)).student;
    expect(enrolled.class.id).toBe('history-class-2026');
    expect((await data(`/profiles/students/${OMAR}/overview`, '2025-2026')).student.section.id).toBe('history-section-2025-b');

    // No marks is no rate; it used to read as 0%.
    expect(await data(`/profiles/students/${AYA}/attendance`, '2024-2025'))
      .toEqual({ total: 0, present: 0, absent: 0, late: 0, percentage: null });
    expect((await data(`/profiles/students/${ADAM}/attendance`, '2024-2025')).total).toBe(1);

    // Aya's only fee is charged to 2025-2026, without an enrollment that year.
    // No fee that year: no content, as a null answer is sent.
    const noFees = await request(`/profiles/students/${AYA}/financial`, '2024-2025');
    expect(noFees.status).toBe(204);
    expect(noFees.body).toBeNull();
    const fees = await data(`/profiles/students/${AYA}/financial`, '2025-2026');
    expect(fees.fees.map((fee: { academicYear: string }) => fee.academicYear)).toEqual(['2025-2026']);

    expect(await data(`/profiles/students/${AYA}/transport`)).toEqual({ route: [] });
  });

  it("lists the upcoming events that parent sees, and each child's class and fees in the year", async () => {
    const upcoming = await data(`/profiles/parents/${parentId}/upcoming-events`);
    // Not section B's outing (no child placed there) nor staff training.
    expect(ids(upcoming.events)).toEqual([eventId('school'), eventId('section-a')]);
    expect(sorted(upcoming.children)).toEqual([OMAR, AYA].sort());
    expect((await data(`/profiles/parents/${parentId}/upcoming-events`, '2025-2026')).events).toEqual([]);

    const children = await data(`/profiles/parents/${parentId}/children`, '2025-2026');
    const byId = Object.fromEntries(children.map((child: any) => [child.id, child]));
    expect(byId[OMAR].section.id).toBe('history-section-2025-b');
    expect(byId[AYA].class).toBeNull();
    expect(byId[AYA].fees.fees.map((fee: { academicYear: string }) => fee.academicYear)).toEqual(['2025-2026']);
    // Enrolled with no fees that year: an empty summary in his class of the year.
    expect(byId[OMAR].fees.fees).toEqual([]);
    expect(byId[OMAR].fees.assignment.section.id).toBe('history-section-2025-b');

    // Debt across years is the one all-year tab: Aya's 2025-2026 fee shows under any year.
    const due = await data(`/profiles/parents/${parentId}/fees-due`, '2024-2025');
    const aya = due.find((child: { studentId: string }) => child.studentId === AYA);
    expect(aya.fees.fees.map((fee: { academicYear: string }) => fee.academicYear)).toEqual(['2025-2026']);
  });

  // Each tab used to answer any signed-in user: a librarian read every
  // student's grades, attendance and fees, and every family's debts.
  it("asks for each tab's own module permission", async () => {
    const status = async (path: string, token: string) => (await request(path, undefined, token)).status;
    const librarianStatuses = {
      overview: await status(`/profiles/students/${OMAR}/overview`, librarianToken),
      academic: await status(`/profiles/students/${OMAR}/academic`, librarianToken),
      attendance: await status(`/profiles/students/${OMAR}/attendance`, librarianToken),
      financial: await status(`/profiles/students/${OMAR}/financial`, librarianToken),
      transport: await status(`/profiles/students/${OMAR}/transport`, librarianToken),
      unreadAlerts: await status(`/profiles/parents/${parentId}/unread-alerts`, librarianToken),
      children: await status(`/profiles/parents/${parentId}/children`, librarianToken),
      feesDue: await status(`/profiles/parents/${parentId}/fees-due`, librarianToken),
      upcomingEvents: await status(`/profiles/parents/${parentId}/upcoming-events`, librarianToken),
      teacherClasses: await status(`/profiles/teachers/${TEACHER}/classes`, librarianToken),
      teacherToday: await status(`/profiles/teachers/${TEACHER}/schedule-today`, librarianToken),
      teacherStudents: await status(`/profiles/teachers/${TEACHER}/students`, librarianToken),
      pendingGrading: await status(`/profiles/teachers/${TEACHER}/pending-grading`, librarianToken),
    };
    expect(librarianStatuses).toEqual({
      overview: 200, academic: 401, attendance: 401, financial: 401, transport: 401,
      unreadAlerts: 401, children: 401, feesDue: 401, upcomingEvents: 401,
      teacherClasses: 200, teacherToday: 200, teacherStudents: 200, pendingGrading: 401,
    });
    // Fees stay with the finance roles and student routes with the administrator.
    expect(await status(`/profiles/students/${OMAR}/financial`, principalToken)).toBe(200);
    expect(await status(`/profiles/parents/${parentId}/fees-due`, principalToken)).toBe(200);
    expect(await status(`/profiles/students/${OMAR}/transport`, principalToken)).toBe(401);
    expect(await status(`/profiles/students/${OMAR}/overview`, '')).toBe(401);
  });

  it('refuses bad years and people the reader cannot find', async () => {
    const path = `/profiles/teachers/${TEACHER}/classes`;
    expect((await request(path, 'twenty')).status).toBe(400);
    expect((await request(`${path}?academicYear=2024-2025`, '2025-2026')).status).toBe(400);
    expect((await request(path, '2019-2020')).status).toBe(404);
    const teacher = await request('/profiles/teachers/history-teacher-missing/classes', '2025-2026');
    expect(teacher.status).toBe(404);
    expect(teacher.body.message).toBe('Teacher not found');
    const student = await request('/profiles/students/history-student-missing/attendance', '2025-2026');
    expect(student.status).toBe(404);
    expect(student.body.message).toBe('Student not found');
  });

  it("gives MCP each call's own year and the same permissions", async () => {
    const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
    const { StreamableHTTPClientTransport } = await import('@modelcontextprotocol/sdk/client/streamableHttp.js');
    const call = async (name: string, args: Record<string, unknown>, headerYear?: string, token = adminToken) => {
      const client = new Client({ name: 'school-profiles-history-test', version: '1.0.0' });
      const transport = new StreamableHTTPClientTransport(new URL(`http://localhost:${port}/api/mcp`), {
        requestInit: { headers: { Authorization: `Bearer ${token}`, ...(headerYear ? { 'X-Academic-Year': headerYear } : {}) } },
      });
      await client.connect(transport);
      try {
        const tools = await client.listTools();
        expect(tools.tools.find((item) => item.name === name)?.inputSchema.properties).toHaveProperty('academicYear');
        return await client.callTool({ name, arguments: args }) as { content: Array<{ text: string }>; isError?: boolean };
      } finally { await transport.close(); }
    };
    // Tool names keep the group's hyphen; every signed-in user lists every
    // tool, so the route guards are what refuse the call.
    const classesTool = 'teacher-profile_get_my_classes';
    const [byHeader, byInput, conflict, refused] = await Promise.all([
      call(classesTool, { teacherId: TEACHER }, '2024-2025'),
      call(classesTool, { teacherId: TEACHER, academicYear: '2025-2026' }),
      call(classesTool, { teacherId: TEACHER, academicYear: '2026-2027' }, '2025-2026'),
      call('student-profile_get_financial', { studentId: OMAR }, undefined, librarianToken),
    ]);
    expect(byHeader.isError).not.toBe(true);
    expect(byInput.isError).not.toBe(true);
    expect(ids(JSON.parse(byHeader.content[0].text).classes)).toEqual(['history-class-2024']);
    expect(ids(JSON.parse(byInput.content[0].text).classes)).toEqual(['history-class-2025']);
    expect(conflict.isError).toBe(true);
    expect(refused.isError).toBe(true);
    expect(refused.content[0].text).toContain('Access denied');
  });
});
