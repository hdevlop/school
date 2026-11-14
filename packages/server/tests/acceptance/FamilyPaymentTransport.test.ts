// One parent paying for two children, end to end: real PostgreSQL (the local
// school_history_test fixture) and the real server over authenticated HTTP.
// It adds its own parent, fees and payments, and deletes only those rows.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { eq, inArray } from 'drizzle-orm';

const rawUrl = process.env.SCHOOL_HISTORY_TEST_DB_URL;
const adminPassword = process.env.SCHOOL_HISTORY_ADMIN_PASSWORD;
if (!rawUrl || !adminPassword) throw new Error('History fixture env is required');
const target = new URL(rawUrl);
if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)
  || target.pathname !== '/school_history_test') throw new Error('Expected local school_history_test');
process.env.DB_URL = rawUrl;

const { db } = await import('../../src/database/db');
const { parents } = await import('../../src/modules/parents/parentSchema');
const { studentParents } = await import('../../src/modules/students/studentSchema');
const { feeTypes } = await import('../../src/modules/financial/feeTypes/feeTypeSchema');
const { fees, feeInstallments } = await import('../../src/modules/financial/fees/feeSchema');
const { payments } = await import('../../src/modules/financial/payments/paymentSchema');
const { familyReceipts } = await import('../../src/modules/financial/payments/familyReceiptSchema');
const { paymentAllocations } = await import('../../src/modules/financial/allocations/allocationSchema');
const { financialAuditLogs } = await import('../../src/modules/financial/auditLog/auditLogSchema');
const { server } = await import('../../src/index');

const suffix = crypto.randomUUID().slice(0, 8);
const port = 5534;
const base = `http://localhost:${port}/api`;
const year = '2026-2027';
const AMINE = 'history-student-01';
const SALMA = 'history-student-02';
const OUTSIDER = 'history-student-03';
const parentId = `family-parent-${suffix}`;
const typeId = `family-type-${suffix}`;
const linkIds = [`family-link-a-${suffix}`, `family-link-b-${suffix}`];
const feeIds: Record<string, string> = {};
let token: string;

async function request(path: string, method = 'GET', json?: unknown) {
  const response = await fetch(`${base}${path}`, {
    method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'X-Academic-Year': year, 'X-Language': 'en',
      ...(json !== undefined ? { 'content-type': 'application/json' } : {}) },
    ...(json !== undefined ? { body: JSON.stringify(json) } : {}),
  });
  return { status: response.status, body: await response.json() as Record<string, any> };
}

// Three monthly installments per child, so each scenario pays a fresh one.
async function addFee(studentId: string, amount: number) {
  const id = `family-fee-${studentId.slice(-2)}-${suffix}`;
  feeIds[studentId] = id;
  const total = String(amount * 3);
  await db.insert(fees).values({ id, studentId, feeTypeId: typeId, schedule: 'monthly', academicYear: year,
    baseAmount: String(amount), grossAmount: total, netAmount: total, status: 'pending', effectiveDate: '2026-09-01' });
  await db.insert(feeInstallments).values([1, 2, 3].map((number) => ({
    feeId: id, number, dueDate: `2026-${String(8 + number).padStart(2, '0')}-01`, amount: String(amount), status: 'pending' as const,
  })));
}

const familyBody = (number: number, extra: Record<string, unknown> = {}) => ({
  parentId, paymentMethod: 'cash', paymentDate: '2026-11-12',
  children: [
    { studentId: AMINE, allocations: [{ feeId: feeIds[AMINE], number, amount: 1500 }] },
    { studentId: SALMA, allocations: [{ feeId: feeIds[SALMA], number, amount: 1200 }] },
  ],
  ...extra,
});

async function installmentState(studentId: string, number: number) {
  const rows = await db.select().from(feeInstallments).where(eq(feeInstallments.feeId, feeIds[studentId]));
  return rows.find((row) => row.number === number)!;
}

beforeAll(async () => {
  const marker = await db.execute<{ id: string }>('select id from school_history_fixture_marker');
  expect(marker[0]?.id).toBe('academic-history-alerts-v1');
  await db.insert(parents).values({ id: parentId, name: 'Fatima El Amrani', relationshipType: 'mother' });
  await db.insert(studentParents).values([
    { id: linkIds[0], studentId: AMINE, parentId },
    { id: linkIds[1], studentId: SALMA, parentId },
  ]);
  await db.insert(feeTypes).values({ id: typeId, name: `Mensualité ${suffix}`, category: 'tuition',
    amount: '1500', paymentType: 'recurring', status: 'active' });
  await addFee(AMINE, 1500);
  await addFee(SALMA, 1200);
  await server.listen(port);
  const login = await request('/auth/login', 'POST', { email: 'admin@history.example.test', password: adminPassword });
  expect(login.status, JSON.stringify(login.body)).toBe(200);
  token = login.body.data?.accessToken ?? login.body.accessToken ?? login.body.data?.tokens?.accessToken;
});

afterAll(async () => {
  await server.stop();
  const feeList = Object.values(feeIds);
  const paymentRows = feeList.length
    ? await db.select({ id: paymentAllocations.paymentId }).from(paymentAllocations).where(inArray(paymentAllocations.feeId, feeList))
    : [];
  const paymentIds = [...new Set(paymentRows.map((row) => row.id))];
  if (paymentIds.length) {
    await db.delete(paymentAllocations).where(inArray(paymentAllocations.paymentId, paymentIds));
    await db.delete(financialAuditLogs).where(inArray(financialAuditLogs.entityId, paymentIds));
    await db.delete(payments).where(inArray(payments.id, paymentIds));
  }
  await db.delete(familyReceipts).where(eq(familyReceipts.parentId, parentId));
  if (feeList.length) {
    await db.delete(feeInstallments).where(inArray(feeInstallments.feeId, feeList));
    await db.delete(fees).where(inArray(fees.id, feeList));
  }
  await db.delete(feeTypes).where(eq(feeTypes.id, typeId));
  await db.delete(studentParents).where(inArray(studentParents.id, linkIds));
  await db.delete(parents).where(eq(parents.id, parentId));
});

describe('a parent paying for two children with one receipt', () => {
  let receipt: any;

  it('records one family receipt and one payment per child', async () => {
    const response = await request('/payments/family', 'POST', familyBody(1));
    expect(response.status, JSON.stringify(response.body)).toBe(200);
    receipt = response.body.data;
    expect(Number(receipt.amount)).toBe(2700);
    expect(receipt.status).toBe('completed');
    expect(receipt.parent.name).toBe('Fatima El Amrani');
    expect(receipt.payments.map((payment: any) => [payment.studentId, Number(payment.amount), payment.familyReceiptNumber]))
      .toEqual([[AMINE, 1500, receipt.receiptNumber], [SALMA, 1200, receipt.receiptNumber]]);
    expect((await installmentState(AMINE, 1)).status).toBe('paid');
    expect((await installmentState(SALMA, 1)).status).toBe('paid');
  });

  it('reads the receipt back with each child\'s lines, and marks each child\'s history', async () => {
    const response = await request(`/payments/family/${receipt.id}`);
    expect(response.status).toBe(200);
    expect(response.body.data.payments.map((payment: any) => payment.receiptItems.length)).toEqual([1, 1]);
    const history = await request(`/payments/student/${SALMA}`);
    expect(history.body.data.find((payment: any) => payment.familyReceiptId === receipt.id)?.familyReceiptNumber)
      .toBe(receipt.receiptNumber);
  });

  it('replays a retried request instead of charging twice', async () => {
    const key = crypto.randomUUID();
    const first = await request('/payments/family', 'POST', familyBody(2, { idempotencyKey: key }));
    const again = await request('/payments/family', 'POST', familyBody(2, { idempotencyKey: key }));
    expect(first.status, JSON.stringify(first.body)).toBe(200);
    expect(again.status).toBe(200);
    expect(again.body.data.id).toBe(first.body.data.id);
    expect(await db.select().from(payments).where(eq(payments.familyReceiptId, first.body.data.id))).toHaveLength(2);
  });

  it('refuses a child of another family and writes nothing', async () => {
    const before = await db.select().from(familyReceipts).where(eq(familyReceipts.parentId, parentId));
    const body = familyBody(3);
    body.children.push({ studentId: OUTSIDER, allocations: [{ feeId: feeIds[AMINE], number: 3, amount: 1 }] });
    const response = await request('/payments/family', 'POST', body);
    expect(response.status).toBe(400);
    expect(response.body.message).toContain('linked to this parent');
    expect(await db.select().from(familyReceipts).where(eq(familyReceipts.parentId, parentId))).toHaveLength(before.length);
    expect((await installmentState(AMINE, 3)).status).toBe('pending');
  });

  it('voids the whole receipt from either child\'s payment', async () => {
    const salmaPayment = receipt.payments.find((payment: any) => payment.studentId === SALMA);
    const response = await request(`/payments/${salmaPayment.id}/void`, 'POST', { reason: 'Wrong month' });
    expect(response.status, JSON.stringify(response.body)).toBe(200);
    const rows = await db.select().from(payments).where(eq(payments.familyReceiptId, receipt.id));
    expect(rows.map((row) => row.status)).toEqual(['voided', 'voided']);
    expect((await installmentState(AMINE, 1)).status).not.toBe('paid');
    expect((await installmentState(SALMA, 1)).status).not.toBe('paid');
  });

  it('bounces one family cheque for every child', async () => {
    const recorded = await request('/payments/family', 'POST', familyBody(3, {
      paymentMethod: 'check', checkNumber: `CH-${suffix}`, checkDueDate: '2026-11-30',
    }));
    expect(recorded.status, JSON.stringify(recorded.body)).toBe(200);
    expect(recorded.body.data.status).toBe('pending');
    const [first] = recorded.body.data.payments;
    const bounced = await request(`/payments/${first.id}/check-status`, 'POST', { status: 'bounced', reason: 'No funds' });
    expect(bounced.status, JSON.stringify(bounced.body)).toBe(200);
    const rows = await db.select().from(payments).where(eq(payments.familyReceiptId, recorded.body.data.id));
    expect(rows.map((row) => row.status)).toEqual(['bounced', 'bounced']);
  });
});
