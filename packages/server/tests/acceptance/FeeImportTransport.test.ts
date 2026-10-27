import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { eq, inArray } from 'drizzle-orm';

const rawUrl = process.env.SCHOOL_HISTORY_TEST_DB_URL;
const password = process.env.SCHOOL_HISTORY_ADMIN_PASSWORD;
if (!rawUrl || !password) throw new Error('History fixture env is required');
const target = new URL(rawUrl);
if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname) || target.pathname !== '/school_history_test') {
  throw new Error('Expected local school_history_test');
}
process.env.DB_URL = rawUrl;
const { db } = await import('../../src/database/db');
const { feeTypes, fees, feeInstallments, payments, paymentAllocations, financialAuditLogs } = await import('../../src/database/schema');
const { server } = await import('../../src/index');
const suffix = crypto.randomUUID().slice(0, 8);
const typeId = `import-type-${suffix}`;
const extraTypeId = `import-extra-${suffix}`;
const receipt = `import-cash-${suffix}`;
const cheque = `import-check-${suffix}`;
const cheque2 = `import-check2-${suffix}`;
const failedReceipt = `import-failed-${suffix}`;
const cashedCheque = `import-cashed-${suffix}`;
const knownReceipts = [`import-known1-${suffix}`, `import-known2-${suffix}`, `import-known3-${suffix}`];
let token: string;

async function request(body: unknown, year = '2026-2027', auth = token) {
  const response = await server.fetch(new Request('http://school.local/api/fees/import', {
    method: 'POST', headers: { 'content-type': 'application/json', 'X-Academic-Year': year,
      ...(auth ? { Authorization: `Bearer ${auth}` } : {}) }, body: JSON.stringify(body),
  }));
  return { status: response.status, body: await response.json() as Record<string, any> };
}

const body = {
  studentId: 'history-student-08',
  fees: [
    { feeTypeId: typeId, schedule: 'oneTime', baseAmount: 400, effectiveDate: '2026-09-01' },
    { feeTypeId: typeId, schedule: 'oneTime', baseAmount: 450, effectiveDate: '2026-10-01' },
  ],
  payments: [
    { receiptNumber: receipt, myskoolPlusReceipt: '40 /26', paymentDate: '2026-08-24', paymentMethod: 'bankTransfer', allocations: [
      { feeTypeId: typeId, month: '2026-09', amount: 200 }, { feeTypeId: typeId, month: '2026-10', amount: 50 },
    ] },
    { receiptNumber: cheque, paymentDate: '2026-09-02', paymentMethod: 'check', allocations: [{ feeTypeId: typeId, month: '2026-09', amount: 50 }] },
    { receiptNumber: cheque2, paymentDate: '2026-09-03', paymentMethod: 'check', allocations: [{ feeTypeId: typeId, month: '2026-09', amount: 50 }] },
  ],
};

beforeAll(async () => {
  await db.insert(feeTypes).values([typeId, extraTypeId].map(id => ({ id, name: `Import test ${id}`, category: 'tuition', amount: '400', paymentType: 'recurring' as const, status: 'active' as const })));
  await server.listen(5537);
  const response = await server.fetch(new Request('http://school.local/api/auth/login', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'admin@history.example.test', password }),
  }));
  const result = await response.json() as Record<string, any>;
  expect(response.status).toBe(200);
  token = result.data?.accessToken ?? result.accessToken;
});

afterAll(async () => {
  await server.stop();
  const importedFees = await db.select({ id: fees.id }).from(fees).where(inArray(fees.feeTypeId, [typeId, extraTypeId]));
  const receipts = await db.select({ id: payments.id }).from(payments).where(inArray(payments.receiptNumber, [receipt, cheque, cheque2, failedReceipt, cashedCheque, ...knownReceipts]));
  const ids = [...importedFees, ...receipts].map(item => item.id);
  if (ids.length) await db.delete(financialAuditLogs).where(inArray(financialAuditLogs.entityId, ids));
  if (importedFees.length) {
    await db.delete(paymentAllocations).where(inArray(paymentAllocations.feeId, importedFees.map(item => item.id)));
    await db.delete(feeInstallments).where(inArray(feeInstallments.feeId, importedFees.map(item => item.id)));
    await db.delete(fees).where(inArray(fees.id, importedFees.map(item => item.id)));
  }
  if (receipts.length) await db.delete(payments).where(inArray(payments.id, receipts.map(item => item.id)));
  await db.delete(feeTypes).where(inArray(feeTypes.id, [typeId, extraTypeId]));
});

describe('student financial import through authenticated transport', () => {
  it('imports one receipt with multiple allocations, exact monthly amounts, and unknown cheque metadata', async () => {
    const result = await request(body);
    expect(result.status).toBe(200);
    expect(result.body.data).toMatchObject({ createdFees: 1, createdPayments: 3 });
    const [fee] = await db.select().from(fees).where(eq(fees.feeTypeId, typeId));
    expect(fee.netAmount).toBe('850.00');
    expect(fee.paidAmount).toBe('250.00');
    expect(fee.schedule).toBe('monthly');
    const installments = await db.select().from(feeInstallments).where(eq(feeInstallments.feeId, fee.id)).orderBy(feeInstallments.number);
    expect(installments.map(item => [item.dueDate, item.amount])).toEqual([['2026-09-01', '400.00'], ['2026-10-01', '450.00']]);
    const [payment] = await db.select().from(payments).where(eq(payments.receiptNumber, receipt));
    expect(payment.amount).toBe('250.00');
    expect(payment.paymentDate).toBe('2026-08-24');
    expect(payment.transactionRef).toBe('40 /26');
    expect(await db.select().from(paymentAllocations).where(eq(paymentAllocations.paymentId, payment.id))).toHaveLength(2);
    const [check] = await db.select().from(payments).where(eq(payments.receiptNumber, cheque));
    expect(check.checkNumber).toBe('NON SAISI');
    expect(check.checkDueDate).toBe('2026-09-02');
    expect(check.notes).toBe('Échéance non connue (reprise MyskoolPlus)\nN° de chèque non saisi dans MyskoolPlus');
    expect(check.status).toBe('pending');
  });

  it('retries concurrently without duplicating fees or receipts', async () => {
    // Older records can store no discount as NULL rather than zero.
    await db.update(fees).set({ discountAmount: null }).where(eq(fees.feeTypeId, typeId));
    const responses = await Promise.all([request(body), request(body)]);
    for (const result of responses) {
      expect(result.status).toBe(200);
      expect(result.body.data).toMatchObject({ createdFees: 0, createdPayments: 0, reusedFees: 1, reusedPayments: 3 });
    }
    expect(await db.select().from(fees).where(eq(fees.feeTypeId, typeId))).toHaveLength(1);
    expect(await db.select().from(payments).where(inArray(payments.receiptNumber, [receipt, cheque, cheque2]))).toHaveLength(3);
  });

  it('settles cheques the file says were cashed, on their own day, new or imported earlier as pending', async () => {
    const settled: Omit<typeof body, 'payments'> & { payments: Array<Record<string, unknown>> } = structuredClone(body);
    settled.payments[1] = { ...settled.payments[1], settledDate: '2026-09-10' };
    settled.payments.push({ receiptNumber: cashedCheque, paymentDate: '2026-09-05', paymentMethod: 'check', settledDate: '2026-09-06',
      allocations: [{ feeTypeId: typeId, month: '2026-09', amount: 20 }] });
    const result = await request(settled);
    expect(result.status).toBe(200);
    expect(result.body.data).toMatchObject({ createdPayments: 1, reusedPayments: 3, settledPayments: 1 });
    const rows = await db.select().from(payments).where(inArray(payments.receiptNumber, [cheque, cheque2, cashedCheque]));
    const state = Object.fromEntries(rows.map(row => [row.receiptNumber, [row.status, row.settledDate]]));
    expect(state).toEqual({ [cheque]: ['completed', '2026-09-10'], [cheque2]: ['pending', null], [cashedCheque]: ['completed', '2026-09-06'] });
    const [fee] = await db.select().from(fees).where(eq(fees.feeTypeId, typeId));
    expect(fee.paidAmount).toBe('320.00');
    expect((await request(settled)).body.data).toMatchObject({ createdPayments: 0, reusedPayments: 4, settledPayments: 0 });
  });

  it('rolls back new charges when a receipt allocation cannot find its month', async () => {
    const result = await request({ ...body, fees: [{ ...body.fees[0], feeTypeId: extraTypeId }],
      payments: [{ ...body.payments[0], receiptNumber: failedReceipt, allocations: [{ feeTypeId: extraTypeId, month: '2027-06', amount: 10 }] }] });
    expect(result.status).toBe(409);
    expect(await db.select().from(fees).where(eq(fees.feeTypeId, extraTypeId))).toHaveLength(0);
    expect(await db.select().from(payments).where(eq(payments.receiptNumber, failedReceipt))).toHaveLength(0);
  });

  it('preserves legacy receipts that share a cheque number while ordinary entry still refuses a duplicate cheque', async () => {
    const result = await request({ studentId: body.studentId, fees: [], payments: knownReceipts.slice(0, 2).map(receiptNumber => ({
      receiptNumber, paymentDate: '2026-09-04', paymentMethod: 'check', checkNumber: '252',
      allocations: [{ feeTypeId: typeId, month: '2026-10', amount: 10 }],
    })) });
    expect(result.status).toBe(200);
    expect(result.body.data.createdPayments).toBe(2);
    const [fee] = await db.select().from(fees).where(eq(fees.feeTypeId, typeId));
    const response = await server.fetch(new Request('http://school.local/api/payments', {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'content-type': 'application/json', 'X-Academic-Year': '2026-2027' },
      body: JSON.stringify({ studentId: body.studentId, amount: 10, paymentDate: '2026-09-04', paymentMethod: 'check',
        checkNumber: '252', checkDueDate: '2026-09-04', receiptNumber: knownReceipts[2], allocations: [{ feeId: fee.id, number: 2, amount: 10 }] }),
    }));
    expect(response.status).toBe(409);
  });

  it('refuses changed receipts, another charged year, missing authentication and another year roster', async () => {
    const changed = structuredClone(body);
    changed.payments[0].allocations[0].amount = 199;
    expect((await request(changed)).status).toBe(409);
    expect((await request({ ...body, fees: [{ ...body.fees[0], baseAmount: 401 }] })).status).toBe(409);
    expect((await request({ ...body, fees: [{ ...body.fees[0], academicYear: '2025-2026' }] })).status).toBe(409);
    expect((await request(body, '2026-2027', '')).status).toBe(401);
    expect((await request(body, '2024-2025')).status).toBe(409);
  });
});
