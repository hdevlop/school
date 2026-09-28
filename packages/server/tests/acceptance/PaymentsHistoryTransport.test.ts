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
const { server } = await import('../../src/index');
const suffix = crypto.randomUUID().slice(0, 8);
const typeId = `history-payments-rest-type-${suffix}`;
const oldFee = `history-payments-rest-old-${suffix}`;
const newFee = `history-payments-rest-new-${suffix}`;
const oldInst = `history-payments-rest-old-inst-${suffix}`;
const newInst = `history-payments-rest-new-inst-${suffix}`;
const receiptId = `history-payments-rest-receipt-${suffix}`;
const port = 5509;
const base = 'http://school.local/api';
let token: string;

async function request(path: string, year?: string, method = 'GET', body?: unknown) {
  const response = await server.fetch(new Request(`${base}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(year ? { 'X-Academic-Year': year } : {}),
      ...(body ? { 'content-type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  }));
  return { status: response.status, body: await response.json() as Record<string, any> };
}

beforeAll(async () => {
  await db.insert(feeTypes).values({ id: typeId, name: `History payment transport ${suffix}`,
    category: 'tuition', amount: '100', paymentType: 'oneTime', status: 'active' });
  await db.insert(fees).values([
    { id: oldFee, studentId: 'history-student-08', feeTypeId: typeId, academicYear: '2025-2026',
      effectiveDate: '2025-10-01', baseAmount: '100', grossAmount: '100', netAmount: '100' },
    { id: newFee, studentId: 'history-student-08', feeTypeId: typeId, academicYear: '2026-2027',
      effectiveDate: '2026-09-01', baseAmount: '100', grossAmount: '100', netAmount: '100' },
  ]);
  await db.insert(feeInstallments).values([
    { id: oldInst, feeId: oldFee, number: 1, dueDate: '2026-06-01', amount: '100' },
    { id: newInst, feeId: newFee, number: 1, dueDate: '2026-09-01', amount: '100' },
  ]);
  await db.insert(payments).values({ id: receiptId, studentId: 'history-student-08',
    amount: '51.00', paymentDate: '2026-09-10', paymentMethod: 'cash',
    status: 'completed', settledDate: '2026-09-10' });
  await db.insert(paymentAllocations).values([
    { id: `history-payments-rest-old-alloc-${suffix}`, paymentId: receiptId,
      feeId: oldFee, installmentId: oldInst, amount: '30.25', type: 'installment' },
    { id: `history-payments-rest-new-alloc-${suffix}`, paymentId: receiptId,
      feeId: newFee, installmentId: newInst, amount: '20.75', type: 'installment' },
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
  await db.delete(paymentAllocations).where(eq(paymentAllocations.paymentId, receiptId));
  await db.delete(payments).where(eq(payments.id, receiptId));
  await db.delete(feeInstallments).where(inArray(feeInstallments.id, [oldInst, newInst]));
  await db.delete(fees).where(inArray(fees.id, [oldFee, newFee]));
  await db.delete(feeTypes).where(eq(feeTypes.id, typeId));
});

describe('authenticated mixed-year receipt', () => {
  it('shows allocated portions by fee year and retains one shared receipt', async () => {
    const old = (await request('/payments', '2025-2026')).body.data
      .find((row: { id: string }) => row.id === receiptId);
    const current = (await request('/payments', '2026-2027')).body.data
      .find((row: { id: string }) => row.id === receiptId);
    expect(old.yearAllocatedAmount).toBe('30.25');
    expect(current.yearAllocatedAmount).toBe('20.75');
    expect(old.amount).toBe('51.00');
    expect(old.paymentDate).toBe('2026-09-10');
    expect((await request(`/payments/${receiptId}`, '2025-2026')).body.data.id).toBe(receiptId);
    expect((await request(`/payments/${receiptId}`, '2026-2027')).body.data.id).toBe(receiptId);
    expect((await request(`/payments/fee/${oldFee}`, '2025-2026')).body.data
      .find((row: { id: string }) => row.id === receiptId)?.yearAllocatedAmount).toBe('30.25');
    expect((await request(`/payments/fee/${oldFee}`, '2026-2027')).status).toBe(404);
    expect((await request('/payments', '2024-2025')).body.data
      .some((row: { id: string }) => row.id === receiptId)).toBe(false);
    expect((await request('/payments/stats/revenue', '2025-2026', 'POST', {})).status).toBe(200);

    const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
    const { StreamableHTTPClientTransport } = await import('@modelcontextprotocol/sdk/client/streamableHttp.js');
    const client = new Client({ name: 'school-payment-history-test', version: '1.0.0' });
    const transport = new StreamableHTTPClientTransport(new URL(`http://localhost:${port}/api/mcp`), {
      requestInit: { headers: { Authorization: `Bearer ${token}` } },
    });
    await client.connect(transport);
    try {
      const tools = await client.listTools();
      const list = tools.tools.find((item) => item.name === 'payments_get_all');
      expect(list?.inputSchema.properties).toHaveProperty('academicYear');
      const result = (await client.callTool({ name: list!.name, arguments: { academicYear: '2025-2026' } })) as {
        content: Array<{ text: string }>; isError?: boolean;
      };
      expect(result.isError).not.toBe(true);
      expect((JSON.parse(result.content[0].text) as Array<{ id: string }>).map((row) => row.id)).toContain(receiptId);
    } finally { await transport.close(); }
  });
});
