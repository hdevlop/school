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
const { feeTypes } = await import('../../src/modules/financial/feeTypes/feeTypeSchema');
const { fees, feeInstallments } = await import('../../src/modules/financial/fees/feeSchema');
const { payments } = await import('../../src/modules/financial/payments/paymentSchema');
const { paymentAllocations } = await import('../../src/modules/financial/allocations/allocationSchema');
const { studentCreditLots, studentCreditApplications } = await import('../../src/modules/financial/credits/creditSchema');
const { financialAuditLogs } = await import('../../src/modules/financial/auditLog/auditLogSchema');
const { server } = await import('../../src/index');

const suffix = crypto.randomUUID().slice(0, 8);
const fixture = {
  feeType: `history-credit-type-${suffix}`,
  oldFee: `history-credit-old-fee-${suffix}`,
  newFee: `history-credit-new-fee-${suffix}`,
  oldInstallment: `history-credit-old-inst-${suffix}`,
  newInstallment: `history-credit-new-inst-${suffix}`,
};
const base = 'http://school.local/api';
const port = 5502;
let token: string;
let paymentId: string | undefined;
let lotId: string | undefined;

async function request(path: string, year?: string, method = 'GET', data?: unknown) {
  const response = await server.fetch(new Request(`${base}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(year ? { 'X-Academic-Year': year } : {}),
      ...(data ? { 'content-type': 'application/json' } : {}) },
    ...(data ? { body: JSON.stringify(data) } : {}),
  }));
  return { status: response.status, body: await response.json() as Record<string, any> };
}

beforeAll(async () => {
  await db.insert(feeTypes).values({ id: fixture.feeType, name: `History credit ${suffix}`,
    category: 'tuition', amount: '100', paymentType: 'oneTime', status: 'active' });
  await db.insert(fees).values([
    { id: fixture.oldFee, studentId: 'history-student-01', feeTypeId: fixture.feeType,
      academicYear: '2025-2026', baseAmount: '100', grossAmount: '100', netAmount: '100' },
    { id: fixture.newFee, studentId: 'history-student-01', feeTypeId: fixture.feeType,
      academicYear: '2026-2027', baseAmount: '100', grossAmount: '100', netAmount: '100' },
  ]);
  await db.insert(feeInstallments).values([
    { id: fixture.oldInstallment, feeId: fixture.oldFee, number: 1, dueDate: '2026-06-01', amount: '100' },
    { id: fixture.newInstallment, feeId: fixture.newFee, number: 1, dueDate: '2027-06-01', amount: '100' },
  ]);
  await server.listen(port);
  const response = await server.fetch(new Request(`${base}/auth/login`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'admin@history.example.test', password: adminPassword }),
  }));
  const body = await response.json() as Record<string, any>;
  expect(response.status).toBe(200);
  token = body.data?.accessToken ?? body.accessToken ?? body.data?.tokens?.accessToken;
  expect(typeof token).toBe('string');
});

afterAll(async () => {
  await server.stop();
  if (paymentId) {
    const allocations = await db.select({ id: paymentAllocations.id }).from(paymentAllocations)
      .where(eq(paymentAllocations.paymentId, paymentId));
    const allocationIds = allocations.map((row) => row.id);
    const auditRows = await db.select({ id: financialAuditLogs.id, entityId: financialAuditLogs.entityId,
      action: financialAuditLogs.action, after: financialAuditLogs.after }).from(financialAuditLogs);
    const auditIds = auditRows.filter((row) => row.entityId === paymentId
      || row.entityId === lotId || allocationIds.includes(row.entityId)
      || (row.action === 'creditLot.applied' && lotId && JSON.stringify(row.after).includes(lotId)))
      .map((row) => row.id);
    if (auditIds.length) await db.delete(financialAuditLogs).where(inArray(financialAuditLogs.id, auditIds));
    if (allocations.length) {
      await db.delete(studentCreditApplications).where(inArray(studentCreditApplications.paymentAllocationId,
        allocationIds));
    }
    await db.delete(paymentAllocations).where(eq(paymentAllocations.paymentId, paymentId));
    await db.delete(studentCreditLots).where(eq(studentCreditLots.sourcePaymentId, paymentId));
    await db.delete(payments).where(eq(payments.id, paymentId));
  }
  await db.delete(feeInstallments).where(eq(feeInstallments.feeId, fixture.oldFee));
  await db.delete(feeInstallments).where(eq(feeInstallments.feeId, fixture.newFee));
  await db.delete(fees).where(eq(fees.feeTypeId, fixture.feeType));
  await db.delete(feeTypes).where(eq(feeTypes.id, fixture.feeType));
});

describe('student credit shared balance and selected target year', () => {
  it('creates unallocated credit and applies it to old and current fee years explicitly', async () => {
    const recorded = await request('/payments', undefined, 'POST', {
      studentId: 'history-student-01', amount: 150, paymentMethod: 'cash', paymentDate: '2026-10-02',
      allocations: [{ feeId: fixture.newFee, number: 1, amount: 50 }], keepRemainderAsCredit: true,
    });
    expect(recorded.status).toBe(200);
    paymentId = recorded.body.data?.id;
    expect(typeof paymentId).toBe('string');

    const lots = await request('/student-credits/student/history-student-01', '2025-2026');
    expect(lots.status).toBe(200);
    const lot = lots.body.data.find((row: { sourcePaymentId: string }) => row.sourcePaymentId === paymentId);
    lotId = lot?.id;
    expect(lot).toMatchObject({ originalAmount: '100.00', remainingAmount: '100.00', status: 'available' });
    expect((await request('/student-credits/student/history-student-01', '2026-2027')).body.data)
      .toContainEqual(expect.objectContaining({ id: lot.id }));

    const wrongTarget = await request('/student-credits/apply', '2024-2025', 'POST',
      { studentId: 'history-student-01', amount: 30 });
    expect(wrongTarget.status).toBe(400);
    expect((await db.select().from(studentCreditLots).where(eq(studentCreditLots.id, lot.id)))[0].remainingAmount)
      .toBe('100.00');

    const oldApply = await request('/student-credits/apply', '2025-2026', 'POST',
      { studentId: 'history-student-01', amount: 30 });
    expect(oldApply.status).toBe(200);
    const oldPortions = await request(`/payment-allocations/payment/${paymentId}`, '2025-2026');
    expect(oldPortions.body.data).toEqual([expect.objectContaining({ feeId: fixture.oldFee, amount: '30.00' })]);
    expect((await request(`/payment-allocations/${oldPortions.body.data[0].id}`, '2025-2026', 'DELETE')).status)
      .toBe(409);
    expect((await request(`/payment-allocations/payment/${paymentId}`, '2025-2026')).body.data)
      .toContainEqual(expect.objectContaining({ id: oldPortions.body.data[0].id }));
    expect((await request('/student-credits/student/history-student-01', '2026-2027')).body.data)
      .toContainEqual(expect.objectContaining({ id: lot.id, remainingAmount: '70.00' }));

    const newApply = await request('/student-credits/apply', '2026-2027', 'POST',
      { studentId: 'history-student-01', amount: 20 });
    expect(newApply.status).toBe(200);
    const newPortions = await request(`/payment-allocations/payment/${paymentId}`, '2026-2027');
    expect(newPortions.body.data.map((row: { feeId: string; amount: string }) => [row.feeId, row.amount]).sort())
      .toEqual([[fixture.newFee, '20.00'], [fixture.newFee, '50.00']]);
    expect((await request('/student-credits/student/history-student-01', '2025-2026')).body.data)
      .toContainEqual(expect.objectContaining({ id: lot.id, remainingAmount: '50.00' }));

    const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
    const { StreamableHTTPClientTransport } = await import('@modelcontextprotocol/sdk/client/streamableHttp.js');
    const client = new Client({ name: 'school-credit-history-test', version: '1.0.0' });
    const transport = new StreamableHTTPClientTransport(new URL(`http://localhost:${port}/api/mcp`), {
      requestInit: { headers: { Authorization: `Bearer ${token}` } },
    });
    await client.connect(transport);
    try {
      const tools = await client.listTools();
      const tool = tools.tools.find((item) => item.name === 'student-credits_apply');
      expect(tool?.inputSchema.properties).toHaveProperty('academicYear');
      const result = await client.callTool({ name: tool!.name,
        arguments: { studentId: 'history-student-01', amount: 10, academicYear: '2025-2026' } });
      expect((result as { isError?: boolean }).isError).not.toBe(true);
    } finally { await transport.close(); }
    expect((await request(`/payment-allocations/payment/${paymentId}`, '2025-2026')).body.data
      .map((row: { amount: string }) => row.amount).sort()).toEqual(['10.00', '30.00']);
    expect((await request('/student-credits/student/history-student-01', '2026-2027')).body.data)
      .toContainEqual(expect.objectContaining({ id: lot.id, remainingAmount: '40.00' }));
  });
});
