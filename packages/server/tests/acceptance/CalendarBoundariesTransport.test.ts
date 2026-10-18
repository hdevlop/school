import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { and, eq, inArray, sql } from 'drizzle-orm';

const rawUrl = process.env.SCHOOL_CALENDAR_TEST_DB_URL;
const marker = process.env.SCHOOL_CALENDAR_TEST_MARKER;
const password = process.env.SCHOOL_HISTORY_ADMIN_PASSWORD;
if (!rawUrl || !marker || !password) throw Error('Use bun run test:calendar:integration with the marked fixture environment');
const target = new URL(rawUrl);
if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)
  || target.pathname !== '/school_calendar_boundary_test') throw Error('Expected disposable local calendar fixture');
process.env.DB_URL = rawUrl;
const originalDate = process.env.APP_BUSINESS_DATE;
const { db } = await import('../../src/database/db');
const proof = await db.execute<{ id: string }>(sql`select id from school_calendar_fixture_marker`);
if (proof.length !== 1 || proof[0].id !== marker) throw Error('Calendar fixture ownership marker mismatch');
const { academicYears, academicYearTransitionRuns, studentEnrollments, studentEnrollmentPlacements,
  settings, students, classes, sections, feeTypes, fees, feeInstallments, payments, paymentAllocations,
  users, roles, auditLogs } = await import('../../src/database/schema');
const { getBusinessClockInfo } = await import('../../src/shared/businessDate');
const { server } = await import('../../src/index');
const base = 'http://127.0.0.1:5544/api';
const dates = ['2027-06-30', '2027-07-01', '2027-07-14', '2027-07-15', '2027-08-01', '2027-09-01'];
const studentId = 'history-student-01';
const typeId = 'calendar-boundary-tuition';
const oldFee = 'calendar-boundary-old-fee', activeFee = 'calendar-boundary-active-fee';
let token: string, teacherToken: string, sourceId: string, targetId: string;
let initialSettings: Array<typeof settings.$inferSelect>;
let serverStarted = false;

async function request(path: string, method = 'GET', body?: unknown, year = '2026-2027', identity: string | null = token) {
  const response = await fetch(base + path, { method,
    headers: { ...(identity ? { Authorization: `Bearer ${identity}` } : {}), 'X-Academic-Year': year,
      'X-Language': 'en', ...(body !== undefined ? { 'content-type': 'application/json' } : {}) },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(30000),
  });
  return { status: response.status, body: await response.json() as Record<string, any> };
}

async function feeSnapshot() {
  return { fees: await db.select().from(fees).orderBy(fees.id), installments: await db.select().from(feeInstallments).orderBy(feeInstallments.id) };
}

beforeAll(async () => {
  process.env.APP_BUSINESS_DATE = dates[0];
  const [source] = await db.select().from(academicYears).where(eq(academicYears.label, '2026-2027'));
  if (!source) throw Error('The clone needs the seeded active year');
  sourceId = source.id;
  await db.update(academicYears).set({ paymentCloseoutOn: '2027-07-14' }).where(eq(academicYears.id, sourceId));
  initialSettings = await db.select().from(settings).orderBy(settings.id);
  await db.insert(feeTypes).values({ id: typeId, name: 'Scolarité calendrier', amount: '100', category: 'tuition', paymentType: 'recurring', status: 'active' });
  for (const [id, year, start] of [[oldFee, '2025-2026', 2025], [activeFee, '2026-2027', 2026]] as const) {
    await db.insert(fees).values({ id, studentId, feeTypeId: typeId, academicYear: year, effectiveDate: `${start}-09-01`,
      schedule: 'monthly', baseAmount: '100', grossAmount: '1000', netAmount: '1000' });
    await db.insert(feeInstallments).values(Array.from({ length: 10 }, (_, index) => ({
      id: `${id}-${index + 1}`, feeId: id, number: index + 1, amount: '100',
      dueDate: new Date(Date.UTC(start, 8 + index, 1)).toISOString().slice(0, 10),
    })));
  }
  const [teacherRole] = await db.select().from(roles).where(eq(roles.name, 'teacher'));
  const roleId = teacherRole?.id ?? 'calendar-boundary-teacher-role';
  if (!teacherRole) await db.insert(roles).values({ id: roleId, name: 'teacher' });
  const teacherPassword = `Fixture-${crypto.randomUUID()}-A1!`;
  await db.insert(users).values({ id: 'calendar-boundary-teacher', name: 'Salma El Idrissi', email: 'calendar-teacher@example.test',
    password: await Bun.password.hash(teacherPassword, { algorithm: 'bcrypt', cost: 10 }), roleId, status: 'active', emailVerified: true });
  await server.listen(5544); serverStarted = true;
  const login = await request('/auth/login', 'POST', { email: 'admin@history.example.test', password }, '2026-2027', null);
  expect(login.status).toBe(200); token = login.body.data.accessToken;
  const teacher = await request('/auth/login', 'POST', { email: 'calendar-teacher@example.test', password: teacherPassword }, '2026-2027', null);
  expect(teacher.status).toBe(200); teacherToken = teacher.body.data.accessToken;
});

afterAll(async () => {
  if (serverStarted) await server.stop();
  if (originalDate === undefined) delete process.env.APP_BUSINESS_DATE;
  else process.env.APP_BUSINESS_DATE = originalDate;
});

describe('controlled calendar payment boundaries', () => {
  it.each(dates)('keeps receipts dated %s payable against their original fee years without regenerating fees', async date => {
    process.env.APP_BUSINESS_DATE = date;
    expect(getBusinessClockInfo()).toMatchObject({ businessDate: date, businessDateOverridden: true });
    const number = dates.indexOf(date) + 1;
    const beforeToday = await request('/payments/today');
    expect(beforeToday.status).toBe(200);
    const paymentIds: string[] = [];
    for (const [feeId, year] of [[oldFee, '2025-2026'], [activeFee, '2026-2027']]) {
      const body = { studentId, paymentDate: date, paymentMethod: 'cash', amount: 100,
        idempotencyKey: crypto.randomUUID(), allocations: [{ feeId, number, amount: 100 }] };
      const created = await request('/payments', 'POST', body, year);
      expect(created.status).toBe(200);
      const id = created.body.data.id; paymentIds.push(id);
      const repeated = await request('/payments', 'POST', body, year);
      expect(repeated.status).toBe(200); expect(repeated.body.data.id).toBe(id);
      const [stored] = await db.select().from(payments).where(eq(payments.id, id));
      expect(stored).toMatchObject({ paymentDate: date, settledDate: date, status: 'completed', amount: '100.00' });
      const allocations = await db.select().from(paymentAllocations).where(eq(paymentAllocations.paymentId, id));
      expect(allocations).toHaveLength(1); expect(allocations[0]).toMatchObject({ feeId, amount: '100.00' });
      expect((await db.select().from(fees).where(eq(fees.id, feeId)))[0]).toMatchObject({ academicYear: year,
        paidAmount: `${number * 100}.00`, grossAmount: '1000.00', netAmount: '1000.00', discountAmount: '0.00' });
    }
    const today = await request('/payments/today');
    expect(today.body.data.summary.total - beforeToday.body.data.summary.total).toBe(200);
    expect(paymentIds.every(id => today.body.data.payments.some((row: { id: string }) => row.id === id))).toBe(true);
    expect(await db.select({ id: fees.id }).from(fees).where(inArray(fees.id, [oldFee, activeFee]))).toHaveLength(2);
    const schedule = await db.select().from(feeInstallments).where(inArray(feeInstallments.feeId, [oldFee, activeFee]));
    expect(schedule).toHaveLength(20);
    expect(schedule.every(row => row.id === `${row.feeId}-${row.number}` && row.amount === '100.00')).toBe(true);
    expect(await db.select().from(settings).orderBy(settings.id)).toEqual(initialSettings);
    expect((await db.select().from(academicYears).where(eq(academicYears.id, sourceId)))[0].paymentCloseoutOn).toBe('2027-07-14');
  });
});

describe('separate academic-year activation over HTTP and PostgreSQL', () => {
  it('prepares a verified draft without changing fees or active settings', async () => {
    const before = await feeSnapshot();
    const result = await request('/academic-years', 'POST', { label: '2027-2028', instructionStartsOn: '2027-09-01', instructionEndsOn: '2028-06-30',
      reportingStartsOn: '2027-09-01', reportingEndsOn: '2028-08-31', paymentCloseoutOn: '2028-07-14',
      provenance: 'assumed', provenanceNote: 'Controlled isolated calendar acceptance fixture' });
    expect(result.status).toBe(200); targetId = result.body.data?.id ?? result.body.id;
    expect(typeof targetId).toBe('string');
    expect((await request(`/academic-years/${targetId}/verify-calendar`, 'POST', { evidenceNote: 'Verified isolated September to June calendar' })).status).toBe(200);
    expect(await feeSnapshot()).toEqual(before);
    expect(await db.select().from(settings).orderBy(settings.id)).toEqual(initialSettings);
  });

  it('refuses activation without a committed transition or by an unauthorized teacher', async () => {
    process.env.APP_BUSINESS_DATE = '2027-09-01';
    const before = await feeSnapshot();
    expect((await request(`/academic-years/${targetId}/activate`, 'POST')).status).toBe(409);
    expect((await request(`/academic-years/${targetId}/activate`, 'POST', undefined, '2026-2027', teacherToken)).status).toBe(403);
    expect((await request('/auth/me', 'GET', undefined, '2026-2027', teacherToken)).status).toBe(200);
    expect(await feeSnapshot()).toEqual(before);
    expect(await db.select().from(settings).orderBy(settings.id)).toEqual(initialSettings);
  });

  it('waits until September 1 even with a prepared transition', async () => {
    // Activation is under test; seed its already-committed preparation, including one target placement.
    await db.insert(classes).values({ id: 'calendar-next-class', name: 'CM2 calendrier', academicYear: '2027-2028' });
    await db.insert(sections).values({ id: 'calendar-next-section', classId: 'calendar-next-class', name: 'A' });
    await db.insert(studentEnrollments).values({ id: 'calendar-next-enrollment', studentId, academicYearId: targetId, enrolledOn: '2027-09-01' });
    await db.insert(studentEnrollmentPlacements).values({ id: 'calendar-next-placement', enrollmentId: 'calendar-next-enrollment',
      classId: 'calendar-next-class', sectionId: 'calendar-next-section', validFrom: '2027-09-01' });
    const roster = await db.select({ studentId: studentEnrollments.studentId }).from(studentEnrollments)
      .where(eq(studentEnrollments.academicYearId, sourceId));
    await db.insert(academicYearTransitionRuns).values({ id: 'calendar-prepared-transition', sourceAcademicYearId: sourceId,
      targetAcademicYearId: targetId, idempotencyKey: crypto.randomUUID(), payloadHash: 'isolated-prepared-fixture', previewHash: 'isolated-prepared-fixture',
      input: { enrolledOn: '2027-09-01' }, outcomes: roster.map(row => ({ studentId: row.studentId, outcome: row.studentId === studentId ? 'promote' : 'omit' })) });
    process.env.APP_BUSINESS_DATE = '2027-08-31';
    const beforeStudents = await db.select().from(students).orderBy(students.id);
    expect((await request(`/academic-years/${targetId}/activate`, 'POST')).status).toBe(409);
    expect((await request(`/academic-years/${sourceId}/close`, 'POST')).status).toBe(409);
    expect(await db.select().from(students).orderBy(students.id)).toEqual(beforeStudents);
    expect(await db.select().from(settings).orderBy(settings.id)).toEqual(initialSettings);
  });

  it('activates once on September 1 during concurrent requests without generating fees', async () => {
    process.env.APP_BUSINESS_DATE = '2027-09-01';
    const before = await feeSnapshot();
    const results = await Promise.all([request(`/academic-years/${targetId}/activate`, 'POST'), request(`/academic-years/${targetId}/activate`, 'POST')]);
    expect(results.map(r => r.status)).toEqual([200, 200]);
    const payloads = results.map(r => r.body.data ?? r.body);
    expect(payloads.map(r => r.changed).sort()).toEqual([false, true]);
    expect((await db.select().from(settings))[0]).toMatchObject({ activeAcademicYearId: targetId, currentAcademicYear: '2027-2028' });
    expect((await db.select().from(students).where(eq(students.id, studentId)))[0]).toMatchObject({ classId: 'calendar-next-class', sectionId: 'calendar-next-section', status: 'active' });
    expect((await db.select().from(academicYears).where(eq(academicYears.id, targetId)))[0].status).toBe('open');
    expect((await db.select().from(academicYears).where(eq(academicYears.id, sourceId)))[0].status).toBe('open');
    expect(await db.select().from(auditLogs).where(and(eq(auditLogs.action, 'academic-year.activate'), eq(auditLogs.resourceId, targetId)))).toHaveLength(1);
    expect(await feeSnapshot()).toEqual(before);
    const again = await request(`/academic-years/${targetId}/activate`, 'POST');
    expect(again.status).toBe(200); expect((again.body.data ?? again.body).changed).toBe(false);
    expect(await feeSnapshot()).toEqual(before);
  });

  it('closes the previous year separately while keeping historical receipts and fees intact', async () => {
    const before = await feeSnapshot();
    expect((await request(`/academic-years/${sourceId}/close`, 'POST')).status).toBe(200);
    expect((await db.select().from(academicYears).where(eq(academicYears.id, sourceId)))[0].status).toBe('closed');
    expect((await request(`/fees/${oldFee}`, 'GET', undefined, '2025-2026')).status).toBe(200);
    expect((await request(`/fees/${activeFee}`, 'GET', undefined, '2026-2027')).status).toBe(200);
    expect(await feeSnapshot()).toEqual(before);
    expect((await db.select().from(settings))[0].activeAcademicYearId).toBe(targetId);
  });
});
