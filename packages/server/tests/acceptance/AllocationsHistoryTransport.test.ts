import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { eq, inArray } from 'drizzle-orm';

const rawUrl = process.env.SCHOOL_HISTORY_TEST_DB_URL;
const adminPassword = process.env.SCHOOL_HISTORY_ADMIN_PASSWORD;
const principalPassword = process.env.SCHOOL_HISTORY_PRINCIPAL_PASSWORD;
if (!rawUrl || !adminPassword || !principalPassword) throw new Error('History fixture env is required');
const target = new URL(rawUrl);
if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)
  || target.pathname !== '/school_history_test') throw new Error('Expected local school_history_test');
process.env.DB_URL = rawUrl;

const { db } = await import('../../src/database/db');
const { feeTypes } = await import('../../src/modules/financial/feeTypes/feeTypeSchema');
const { fees, feeInstallments } = await import('../../src/modules/financial/fees/feeSchema');
const { payments } = await import('../../src/modules/financial/payments/paymentSchema');
const { paymentAllocations } = await import('../../src/modules/financial/allocations/allocationSchema');
const { financialAuditLogs } = await import('../../src/modules/financial/auditLog/auditLogSchema');
const { server } = await import('../../src/index');

const suffix = crypto.randomUUID().slice(0, 8);
const fixture = {
  feeType: `history-allocation-type-${suffix}`,
  oldFee: `history-allocation-old-fee-${suffix}`,
  newFee: `history-allocation-new-fee-${suffix}`,
  oldInstallment: `history-allocation-old-inst-${suffix}`,
  newInstallment: `history-allocation-new-inst-${suffix}`,
  payment: `history-allocation-payment-${suffix}`,
  oldAllocation: `history-allocation-old-${suffix}`,
  newAllocation: `history-allocation-new-${suffix}`,
};
const base = 'http://school.local/api';
const port = 5500;
let adminToken: string;
let principalToken: string;
let recordedPaymentId: string | undefined;

async function request(path: string, year?: string, method = 'GET', token = adminToken, data?: unknown) {
  const response = await server.fetch(new Request(`${base}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(year ? { 'X-Academic-Year': year } : {}),
      ...(data ? { 'content-type': 'application/json' } : {}) },
    ...(data ? { body: JSON.stringify(data) } : {}),
  }));
  return { status: response.status, body: await response.json() as Record<string, any> };
}

beforeAll(async () => {
  await db.insert(feeTypes).values({ id: fixture.feeType, name: `History allocation ${suffix}`,
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
  await db.insert(payments).values({ id: fixture.payment, studentId: 'history-student-01',
    amount: '150', paymentDate: '2026-10-01', paymentMethod: 'cash', status: 'completed' });
  await db.insert(paymentAllocations).values([
    { id: fixture.oldAllocation, paymentId: fixture.payment, feeId: fixture.oldFee,
      installmentId: fixture.oldInstallment, amount: '75', type: 'installment' },
    { id: fixture.newAllocation, paymentId: fixture.payment, feeId: fixture.newFee,
      installmentId: fixture.newInstallment, amount: '75', type: 'installment' },
  ]);
  await server.listen(port);
  const response = await server.fetch(new Request(`${base}/auth/login`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'admin@history.example.test', password: adminPassword }),
  }));
  const body = await response.json() as Record<string, any>;
  expect(response.status).toBe(200);
  adminToken = body.data?.accessToken ?? body.accessToken ?? body.data?.tokens?.accessToken;
  expect(typeof adminToken).toBe('string');
  const principalResponse = await server.fetch(new Request(`${base}/auth/login`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'principal@history.example.test', password: principalPassword }),
  }));
  const principalBody = await principalResponse.json() as Record<string, any>;
  expect(principalResponse.status).toBe(200);
  principalToken = principalBody.data?.accessToken ?? principalBody.accessToken
    ?? principalBody.data?.tokens?.accessToken;
  expect(typeof principalToken).toBe('string');
});

afterAll(async () => {
  await server.stop();
  if (recordedPaymentId) {
    const generated = await db.select({ id: paymentAllocations.id }).from(paymentAllocations)
      .where(eq(paymentAllocations.paymentId, recordedPaymentId));
    const entityIds = [recordedPaymentId, ...generated.map((row) => row.id)];
    await db.delete(financialAuditLogs).where(inArray(financialAuditLogs.entityId, entityIds));
    await db.delete(paymentAllocations).where(eq(paymentAllocations.paymentId, recordedPaymentId));
    await db.delete(payments).where(eq(payments.id, recordedPaymentId));
  }
  await db.delete(paymentAllocations).where(eq(paymentAllocations.paymentId, fixture.payment));
  await db.delete(payments).where(eq(payments.id, fixture.payment));
  await db.delete(feeInstallments).where(eq(feeInstallments.feeId, fixture.oldFee));
  await db.delete(feeInstallments).where(eq(feeInstallments.feeId, fixture.newFee));
  await db.delete(fees).where(eq(fees.feeTypeId, fixture.feeType));
  await db.delete(feeTypes).where(eq(feeTypes.id, fixture.feeType));
  expect(await db.select({ id: paymentAllocations.id }).from(paymentAllocations)
    .where(eq(paymentAllocations.paymentId, fixture.payment))).toEqual([]);
});

describe('authenticated allocation year scope on the marked PostgreSQL fixture', () => {
  it('returns only the selected part of a mixed-year receipt and protects deletion', async () => {
    const oldList = await request('/payment-allocations', '2025-2026');
    const newList = await request('/payment-allocations', '2026-2027');
    const activeList = await request('/payment-allocations');
    expect(oldList.status).toBe(200);
    expect(newList.status).toBe(200);
    expect(activeList.status).toBe(200);
    expect(oldList.body.data.map((row: { id: string }) => row.id)).toContain(fixture.oldAllocation);
    expect(oldList.body.data.map((row: { id: string }) => row.id)).not.toContain(fixture.newAllocation);
    expect(newList.body.data.map((row: { id: string }) => row.id)).toContain(fixture.newAllocation);
    expect(newList.body.data.map((row: { id: string }) => row.id)).not.toContain(fixture.oldAllocation);
    expect(activeList.body.data.map((row: { id: string }) => row.id)).toContain(fixture.newAllocation);
    expect(activeList.body.data.map((row: { id: string }) => row.id)).not.toContain(fixture.oldAllocation);
    expect((await request('/payment-allocations', '2025-2026', 'GET', principalToken)).body.data
      .map((row: { id: string }) => row.id)).toContain(fixture.oldAllocation);
    expect((await request(`/payment-allocations/${fixture.oldAllocation}`, '2026-2027')).status).toBe(404);
    expect((await request(`/payment-allocations/payment/${fixture.payment}`, '2025-2026')).body.data)
      .toEqual([expect.objectContaining({ id: fixture.oldAllocation, amount: '75.00' })]);
    expect((await request('/payment-allocations/student/history-student-01', '2025-2026')).body.data
      .map((row: { id: string }) => row.id)).not.toContain(fixture.newAllocation);
    expect((await request(`/payment-allocations/${fixture.oldAllocation}`, '2026-2027', 'DELETE')).status).toBe(404);
    expect((await request(`/payment-allocations/${fixture.oldAllocation}`, '2025-2026')).status).toBe(200);
    expect((await request('/payment-allocations?academicYear=2026-2027', '2025-2026')).status).toBe(400);
    expect((await request('/payment-allocations', '2099-2100')).status).toBe(404);
  });

  it('resolves the same year for the MCP allocation list', async () => {
    const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
    const { StreamableHTTPClientTransport } = await import('@modelcontextprotocol/sdk/client/streamableHttp.js');
    const list = async (year: string) => {
      const client = new Client({ name: 'school-allocation-history-test', version: '1.0.0' });
      const transport = new StreamableHTTPClientTransport(new URL(`http://localhost:${port}/api/mcp`), {
        requestInit: { headers: { Authorization: `Bearer ${adminToken}` } },
      });
      await client.connect(transport);
      try {
        const tools = await client.listTools();
        const tool = tools.tools.find((item) => item.name === 'payment-allocations_get_all');
        expect(tool?.inputSchema.properties).toHaveProperty('academicYear');
        const result = await client.callTool({ name: tool!.name, arguments: { academicYear: year } });
        const { content, isError } = result as { content: Array<{ text: string }>; isError?: boolean };
        expect(isError).not.toBe(true);
        return JSON.parse(content[0].text) as Array<{ id: string }>;
      } finally { await transport.close(); }
    };
    expect((await list('2025-2026')).map((row) => row.id)).toContain(fixture.oldAllocation);
    expect((await list('2025-2026')).map((row) => row.id)).not.toContain(fixture.newAllocation);
    expect((await request(`/payment-allocations/${fixture.oldAllocation}`, '2025-2026', 'DELETE')).status).toBe(200);
    expect((await request(`/payment-allocations/${fixture.oldAllocation}`, '2025-2026')).status).toBe(404);
    expect((await request(`/payment-allocations/${fixture.newAllocation}`, '2026-2027')).status).toBe(200);
  });

  it('keeps fee-year portions when the normal payment write creates a mixed-year receipt', async () => {
    const recorded = await request('/payments', undefined, 'POST', adminToken, {
      studentId: 'history-student-01', amount: 20, paymentMethod: 'cash', paymentDate: '2026-10-02',
      allocations: [
        { feeId: fixture.oldFee, number: 1, amount: 10 },
        { feeId: fixture.newFee, number: 1, amount: 10 },
      ],
    });
    expect(recorded.status).toBe(200);
    recordedPaymentId = recorded.body.data?.id;
    expect(typeof recordedPaymentId).toBe('string');
    const oldYear = await request(`/payment-allocations/payment/${recordedPaymentId}`, '2025-2026');
    const newYear = await request(`/payment-allocations/payment/${recordedPaymentId}`, '2026-2027');
    expect(oldYear.status).toBe(200);
    expect(newYear.status).toBe(200);
    expect(oldYear.body.data).toEqual([expect.objectContaining({ feeId: fixture.oldFee, amount: '10.00' })]);
    expect(newYear.body.data).toEqual([expect.objectContaining({ feeId: fixture.newFee, amount: '10.00' })]);
  });
});
