import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { and, eq, inArray } from 'drizzle-orm';
import type { FinancialImportDatePreview } from '@sms/contracts';

const rawUrl = process.env.SCHOOL_HISTORY_TEST_DB_URL;
const password = process.env.SCHOOL_HISTORY_ADMIN_PASSWORD;
if (!rawUrl || !password) throw new Error('History fixture env is required');
const target = new URL(rawUrl);
if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname) || target.pathname !== '/school_history_test') throw new Error('Expected local school_history_test');
process.env.DB_URL = rawUrl;
const { db } = await import('../../src/database/db');
const { students, studentEnrollments, studentEnrollmentPlacements, academicYears, feeTypes, fees, feeInstallments,
  payments, paymentAllocations, auditLogs, financialAuditLogs } = await import('../../src/database/schema');
const { server } = await import('../../src/index');
const suffix = crypto.randomUUID().slice(0, 8);
const studentId = `import-date-student-${suffix}`;
const enrollmentId = `import-date-enroll-${suffix}`;
const placementId = `import-date-place-${suffix}`;
const typeId = `import-date-type-${suffix}`;
const receiptNumber = `import-date-receipt-${suffix}`;
let token: string;
let preview: FinancialImportDatePreview;
const source = { studentId, enrollmentDate: '2026-09-01', fees: [
  { feeTypeId: typeId, schedule: 'monthly', baseAmount: 400, academicYear: '2026-2027', effectiveDate: '2026-09-01' },
], payments: [{ receiptNumber, myskoolPlusReceipt: '40 /26', paymentDate: '2026-08-24', paymentMethod: 'bankTransfer',
  allocations: [{ feeTypeId: typeId, month: '2026-09', amount: 100 }] }] };
async function request(path: string, body: unknown) {
  const response = await server.fetch(new Request(`http://school.local/api/fees/import${path}`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'X-Academic-Year': '2026-2027', 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }));
  return { status: response.status, body: await response.json() as Record<string, any> };
}
async function dates() {
  const [student] = await db.select().from(students).where(eq(students.id, studentId));
  const [enrollment] = await db.select().from(studentEnrollments).where(eq(studentEnrollments.id, enrollmentId));
  const [placement] = await db.select().from(studentEnrollmentPlacements).where(eq(studentEnrollmentPlacements.id, placementId));
  return [student.enrollmentDate, enrollment.enrolledOn, placement.validFrom];
}
beforeAll(async () => {
  const [year] = await db.select().from(academicYears).where(eq(academicYears.label, '2026-2027'));
  const [example] = await db.select().from(studentEnrollments).where(and(eq(studentEnrollments.studentId, 'history-student-08'), eq(studentEnrollments.academicYearId, year.id)));
  const [placement] = await db.select().from(studentEnrollmentPlacements).where(eq(studentEnrollmentPlacements.enrollmentId, example.id));
  await db.insert(students).values({ id: studentId, studentCode: `DATE-${suffix}`, name: 'Enrollment import fixture',
    classId: placement.classId, sectionId: placement.sectionId, gender: 'F', enrollmentDate: '2026-10-26', status: 'active' });
  await db.insert(studentEnrollments).values({ id: enrollmentId, studentId, academicYearId: year.id, enrolledOn: '2026-10-26', status: 'active' });
  await db.insert(studentEnrollmentPlacements).values({ id: placementId, enrollmentId, classId: placement.classId,
    sectionId: placement.sectionId, validFrom: '2026-10-26', validTo: null, reason: 'Initial enrollment' });
  await db.insert(feeTypes).values({ id: typeId, name: `Import date ${suffix}`, category: 'tuition', amount: '400', paymentType: 'recurring', status: 'active' });
  await server.listen(5538);
  const response = await server.fetch(new Request('http://school.local/api/auth/login', { method: 'POST',
    headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'admin@history.example.test', password }) }));
  const result = await response.json() as Record<string, any>;
  expect(response.status).toBe(200);
  token = result.data?.accessToken ?? result.accessToken;
});
afterAll(async () => {
  await server.stop();
  const foundFees = await db.select({ id: fees.id }).from(fees).where(eq(fees.studentId, studentId));
  const foundPayments = await db.select({ id: payments.id }).from(payments).where(eq(payments.studentId, studentId));
  const ids = [...foundFees, ...foundPayments].map(row => row.id);
  if (ids.length) await db.delete(financialAuditLogs).where(inArray(financialAuditLogs.entityId, ids));
  await db.delete(auditLogs).where(inArray(auditLogs.resourceId, [studentId, enrollmentId]));
  if (foundFees.length) {
    await db.delete(paymentAllocations).where(inArray(paymentAllocations.feeId, foundFees.map(row => row.id)));
    await db.delete(feeInstallments).where(inArray(feeInstallments.feeId, foundFees.map(row => row.id)));
    await db.delete(fees).where(inArray(fees.id, foundFees.map(row => row.id)));
  }
  if (foundPayments.length) await db.delete(payments).where(inArray(payments.id, foundPayments.map(row => row.id)));
  await db.delete(feeTypes).where(eq(feeTypes.id, typeId));
  await db.delete(studentEnrollmentPlacements).where(eq(studentEnrollmentPlacements.enrollmentId, enrollmentId));
  await db.delete(studentEnrollments).where(eq(studentEnrollments.id, enrollmentId));
  await db.delete(students).where(eq(students.id, studentId));
});

describe('financial import with source enrollment dates', () => {
  it('previews the actual date changes without writing and leaves normal fee validation intact', async () => {
    const result = await request('/preview-dates', { students: [{ studentId, enrollmentDate: source.enrollmentDate }] });
    expect(result.status).toBe(200);
    expect(result.body.data).toHaveLength(1);
    preview = result.body.data[0];
    expect(preview).toMatchObject({ admissionDate: '2026-09-01', yearEnrolledOn: '2026-09-01',
      correction: { expectedAdmissionDate: '2026-10-26', expected: { enrolledOn: '2026-10-26' } } });
    expect((await request('', source)).status).toBe(400);
    expect(await dates()).toEqual(['2026-10-26', '2026-10-26', '2026-10-26']);
    expect(await db.select().from(fees).where(eq(fees.studentId, studentId))).toHaveLength(0);
  });
  it('rejects stale reviewed dates and rolls back admission before any partial correction can remain', async () => {
    const correction = structuredClone(preview.correction);
    correction.expected.enrolledOn = '2026-10-25';
    correction.expected.placements[0].validFrom = '2026-10-25';
    expect((await request('/with-dates', { ...source, dateCorrection: correction })).status).toBe(409);
    expect(await dates()).toEqual(['2026-10-26', '2026-10-26', '2026-10-26']);
  });
  it('rolls back admission, yearly enrollment, placement and audits when a receipt allocation fails', async () => {
    const bad = structuredClone(source);
    bad.payments[0].allocations[0].month = '2027-07';
    expect((await request('/with-dates', { ...bad, dateCorrection: preview.correction })).status).toBe(409);
    expect(await dates()).toEqual(['2026-10-26', '2026-10-26', '2026-10-26']);
    expect(await db.select().from(fees).where(eq(fees.studentId, studentId))).toHaveLength(0);
    expect(await db.select().from(auditLogs).where(inArray(auditLogs.resourceId, [studentId, enrollmentId]))).toHaveLength(0);
  });
  it('applies reviewed dates with the fees and receipt in one audited transaction, then retries without duplicates', async () => {
    const result = await request('/with-dates', { ...source, dateCorrection: preview.correction });
    expect(result.status).toBe(200);
    expect(result.body.data).toMatchObject({ createdFees: 1, createdPayments: 1 });
    expect(await dates()).toEqual(['2026-09-01', '2026-09-01', '2026-09-01']);
    expect(await db.select().from(auditLogs).where(inArray(auditLogs.resourceId, [studentId, enrollmentId]))).toHaveLength(2);
    const check = await request('/preview-dates', { students: [{ studentId, enrollmentDate: source.enrollmentDate }] });
    expect(check.body.data).toEqual([]);
    expect((await request('', source)).body.data).toMatchObject({ createdFees: 0, createdPayments: 0, reusedFees: 1, reusedPayments: 1 });
  });
});
