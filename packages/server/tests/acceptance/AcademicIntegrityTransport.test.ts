import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { eq, inArray } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { fileURLToPath } from 'node:url';

const raw = process.env.SCHOOL_HISTORY_TEST_DB_URL;
const password = process.env.SCHOOL_HISTORY_ADMIN_PASSWORD;
if (!raw || !password) throw new Error('History fixture env is required');
const target = new URL(raw);
if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname) || target.pathname !== '/school_history_test') {
  throw new Error('Expected local school_history_test');
}
process.env.DB_URL = raw;
const { db } = await import('../../src/database/db');
const { academicYears, classes, sections, subjects, cycles, staff, staffRoles, teachers, teacherAssignments,
  assistantAssignments, students, studentEnrollments, studentEnrollmentPlacements } = await import('../../src/database/schema');
const { server } = await import('../../src/index');
const suffix = crypto.randomUUID().replaceAll('-', '').slice(0, 7);
const id = (name: string) => `academic-${suffix}-${name}`;
const yearLabel = '2026-2027';
let token: string;
const codes: string[] = [];
const ownSubjects: string[] = [];
const ownCycles = [id('inactive')];
const ownClasses = [id('class'), id('staff-class')];
const ownSections = ['full', 'source', 'protected', 'dated'].map(id);
const ownStaff = [id('assistant'), id('teacher-staff')];
let addedAssistantRole = false;
const dataOf = (body: any) => body.data ?? body;

async function request(path: string, method = 'GET', body?: unknown) {
  const response = await server.fetch(new Request(`http://school.local/api${path}`, {
    method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'X-Academic-Year': yearLabel, 'Accept-Language': 'en', ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  }));
  const result = await response.json() as Record<string, any>;
  return { status: response.status, body: result, data: dataOf(result) };
}

async function importStudent(section: string, name: string, enrolledOn = '2026-09-01') {
  const code = id(`student-${codes.length}`);
  codes.push(code);
  return request('/students/import', 'POST', {
    studentCode: code, name, gender: 'F', classId: ownClasses[0], sectionId: id(section),
    enrollmentDate: '2026-09-01', yearEnrolledOn: enrolledOn,
  });
}

async function enrollment(studentId: string) {
  const [row] = await db.select().from(studentEnrollments).where(eq(studentEnrollments.studentId, studentId));
  const result = await request(`/student-enrollments/${row.id}`);
  expect(result.status).toBe(200);
  return result.data;
}

beforeAll(async () => {
  await migrate(db, { migrationsFolder: fileURLToPath(new URL('../../src/database/migrations/', import.meta.url)) });
  const [year] = await db.select().from(academicYears).where(eq(academicYears.id, 'history-year-2026'));
  expect(year?.label).toBe(yearLabel);
  await server.listen(5537);
  const login = await request('/auth/login', 'POST', { email: 'admin@history.example.test', password });
  expect(login.status).toBe(200);
  token = login.data.accessToken;
  expect(typeof token).toBe('string');
  await db.insert(cycles).values({ id: ownCycles[0], name: id('inactive'), active: false });
  const addedRoles = await db.insert(staffRoles).values({ code: 'assistant', label: 'Assistant', active: true })
    .onConflictDoNothing().returning({ code: staffRoles.code });
  addedAssistantRole = addedRoles.length > 0;
  await db.insert(classes).values(ownClasses.map(classId => ({ id: classId, name: classId, level: 'Primaire', academicYear: yearLabel })));
  await db.insert(sections).values(ownSections.map(sectionId => ({
    id: sectionId, classId: ownClasses[0], name: sectionId.split('-').at(-1)!, maxStudents: sectionId === id('source') ? 10 : 1,
  })));
  const [subject] = await db.insert(subjects).values({ code: `S${suffix}`, name: 'Lecture encadrée' }).returning();
  ownSubjects.push(subject.id);
  await db.insert(staff).values([
    { id: ownStaff[0], employeeCode: ownStaff[0], name: 'Salma Alaoui', role: 'assistant', hireDate: '2026-09-01' },
    { id: ownStaff[1], employeeCode: ownStaff[1], name: 'Youssef Amrani', role: 'teacher', hireDate: '2026-09-01' },
  ]);
  await db.insert(assistantAssignments).values({ id: id('assistant-assignment'), staffId: ownStaff[0], classId: ownClasses[1] });
  await db.insert(teachers).values({ id: id('teacher'), staffId: ownStaff[1] });
  await db.insert(teacherAssignments).values({ id: id('teacher-assignment'), teacherId: id('teacher'),
    classId: ownClasses[0], sectionId: id('protected'), subjectId: subject.id });
});

afterAll(async () => {
  // Only exact IDs/codes created by this run are removed, including a failed write's residue.
  const ownStudents = codes.length ? await db.select({ id: students.id }).from(students).where(inArray(students.studentCode, codes)) : [];
  const studentIds = ownStudents.map(row => row.id);
  if (studentIds.length) {
    const annual = await db.select({ id: studentEnrollments.id }).from(studentEnrollments).where(inArray(studentEnrollments.studentId, studentIds));
    if (annual.length) {
      await db.delete(studentEnrollmentPlacements).where(inArray(studentEnrollmentPlacements.enrollmentId, annual.map(row => row.id)));
      await db.delete(studentEnrollments).where(inArray(studentEnrollments.id, annual.map(row => row.id)));
    }
    await db.delete(students).where(inArray(students.id, studentIds));
  }
  await db.delete(teacherAssignments).where(eq(teacherAssignments.id, id('teacher-assignment')));
  await db.delete(teachers).where(eq(teachers.id, id('teacher')));
  await db.delete(assistantAssignments).where(eq(assistantAssignments.id, id('assistant-assignment')));
  await db.delete(staff).where(inArray(staff.id, ownStaff));
  if (addedAssistantRole) await db.delete(staffRoles).where(eq(staffRoles.code, 'assistant'));
  await db.delete(sections).where(inArray(sections.id, ownSections));
  await db.delete(classes).where(inArray(classes.id, ownClasses));
  if (ownSubjects.length) await db.delete(subjects).where(inArray(subjects.id, ownSubjects));
  await db.delete(cycles).where(inArray(cycles.id, ownCycles));
  await server.stop();
});

describe('Academic integrity on the marked PostgreSQL fixture', () => {
  it('creates assistant staff without assigning a class or creating a login', async () => {
    const result = await request('/staff', 'POST', {
      name: 'Meriem El Fassi', cin: `AB${suffix}`, phone: '+212612345679', address: 'Rabat',
      role: 'assistant', salary: 3000, hireDate: '2026-09-01', createLogin: false,
    });
    if (result.status === 200) ownStaff.push(result.data.id);
    expect(result.status).toBe(200);
    expect(result.data.userId).toBeNull();
    expect(await db.select().from(assistantAssignments).where(eq(assistantAssignments.staffId, result.data.id))).toHaveLength(0);
  });
  it('rejects case variants on create/update, allows self-update, and handles concurrent duplicates', async () => {
    const [existing] = await db.select().from(subjects).where(eq(subjects.id, ownSubjects[0]));
    expect((await request('/subjects', 'POST', { code: ` ${existing.code.toLowerCase()} `, name: 'Lecture en double' })).status).toBe(409);
    expect((await request(`/subjects/${existing.id}`, 'PUT', { code: existing.code.toLowerCase() })).status).toBe(200);
    const code = `C${suffix}`;
    const raced = await Promise.all(['Lecture arabe', 'Lecture française'].map(name => request('/subjects', 'POST', { code, name })));
    for (const result of raced) if (result.status === 200) ownSubjects.push(result.data.id);
    expect(raced.map(result => result.status).sort()).toEqual([200, 409]);
    expect((await request(`/subjects/${ownSubjects[1]}`, 'PUT', { code: existing.code.toLowerCase() })).status).toBe(409);
  });

  it('names linked staff and preserves linked teacher assignments on delete and move', async () => {
    const klass = await request(`/classes/${ownClasses[1]}`, 'DELETE');
    expect(klass.status).toBe(409);
    expect(klass.body.message).toContain('Salma Alaoui');
    for (const [method, body] of [['DELETE', undefined], ['PUT', { classId: ownClasses[1] }]] as const) {
      const section = await request(`/sections/${id('protected')}`, method, body);
      expect(section.status).toBe(409);
      expect(section.body.message).toContain('Youssef Amrani');
    }
    expect(await db.select().from(teacherAssignments).where(eq(teacherAssignments.id, id('teacher-assignment')))).toHaveLength(1);
    await expect(db.delete(sections).where(eq(sections.id, id('protected'))).execute()).rejects.toThrow();
  });

  it('refuses newly assigning an inactive cycle and permits unrelated edits to an existing assignment', async () => {
    expect((await request(`/classes/${ownClasses[0]}`, 'PUT', { cycleId: ownCycles[0] })).status).toBe(409);
    await db.update(classes).set({ cycleId: ownCycles[0] }).where(eq(classes.id, ownClasses[0]));
    expect((await request(`/classes/${ownClasses[0]}`, 'PUT', { description: 'Description conservée' })).status).toBe(200);
    expect((await request('/classes', 'POST', { name: id('refused'), level: 'Primaire', cycleId: ownCycles[0] })).status).toBe(409);
  });

  it('admits only one of two student imports racing for the last seat and rolls back the loser', async () => {
    const raced = await Promise.all([importStudent('full', 'Noura Alaoui'), importStudent('full', 'Yasmine Amrani')]);
    expect(raced.map(result => result.status).sort()).toEqual([200, 409]);
    const refused = raced.find(result => result.status === 409)!;
    expect(refused.body.message).toContain('maximum 1');
    expect(await db.select().from(students).where(inArray(students.studentCode, codes.slice(0, 2)))).toHaveLength(1);
  });

  it('refuses over-capacity transfers, corrections and capacity reductions without changing placements', async () => {
    const first = await importStudent('source', 'Imane Bennani');
    const second = await importStudent('source', 'Hiba El Idrissi');
    expect([first.status, second.status]).toEqual([200, 200]);
    const original = await enrollment(first.data.id);
    const transfer = await request(`/student-enrollments/${original.id}/transfer`, 'POST', {
      classId: ownClasses[0], sectionId: id('full'), validFrom: '2026-09-15', reason: 'Changement de groupe',
    });
    expect(transfer.status).toBe(409);
    const { enrolledOn, leftOn, status } = original;
    const placements = original.placements.map(({ id, classId, sectionId, validFrom, validTo }: any) => ({ id, classId, sectionId, validFrom, validTo }));
    const correction = await request(`/student-enrollments/${original.id}`, 'PUT', {
      enrolledOn, leftOn, status, expected: { enrolledOn, leftOn, status, placements },
      placement: { ...placements[0], sectionId: id('full') }, reason: 'Correction du registre',
    });
    expect(correction.status).toBe(409);
    expect((await enrollment(first.data.id)).placements).toEqual(original.placements);
    expect((await request(`/sections/${id('source')}`, 'PUT', { maxStudents: 1 })).status).toBe(409);
    expect((await request(`/sections/${id('source')}`)).data.maxStudents).toBe(10);
  });

  it('respects exclusive end dates while protecting historically occupied intervals', async () => {
    const first = await importStudent('dated', 'Lina Mansouri');
    expect(first.status).toBe(200);
    const annual = await enrollment(first.data.id);
    expect((await request(`/student-enrollments/${annual.id}/end`, 'POST', { leftOn: '2026-09-15', status: 'withdrawn' })).status).toBe(200);
    expect((await importStudent('dated', 'Aya Berrada', '2026-09-15')).status).toBe(200);
    expect((await importStudent('dated', 'Sara Chraibi', '2026-09-10')).status).toBe(409);
  });
});
