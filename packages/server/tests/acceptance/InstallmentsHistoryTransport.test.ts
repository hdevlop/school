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
const { server } = await import('../../src/index');
const suffix = crypto.randomUUID().slice(0, 8);
const typeId = `history-installment-rest-type-${suffix}`;
const oldFee = `history-installment-rest-old-fee-${suffix}`;
const newFee = `history-installment-rest-new-fee-${suffix}`;
const oldId = `history-installment-rest-old-${suffix}`;
const newId = `history-installment-rest-new-${suffix}`;
const base = 'http://school.local/api';
const port = 5507;
let token: string;

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
  await db.insert(feeTypes).values({ id: typeId, name: `History installment transport ${suffix}`,
    category: 'tuition', amount: '100', paymentType: 'oneTime', status: 'active' });
  await db.insert(fees).values([
    { id: oldFee, studentId: 'history-student-01', feeTypeId: typeId, academicYear: '2025-2026',
      effectiveDate: '2025-10-01', baseAmount: '100', grossAmount: '100', netAmount: '100' },
    { id: newFee, studentId: 'history-student-01', feeTypeId: typeId, academicYear: '2026-2027',
      effectiveDate: '2026-09-01', baseAmount: '100', grossAmount: '100', netAmount: '100' },
  ]);
  await db.insert(feeInstallments).values([
    { id: oldId, feeId: oldFee, number: 1, dueDate: '2026-06-01', amount: '100' },
    { id: newId, feeId: newFee, number: 1, dueDate: '2026-09-01', amount: '100' },
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
  await db.delete(feeInstallments).where(inArray(feeInstallments.feeId, [oldFee, newFee]));
  await db.delete(fees).where(inArray(fees.id, [oldFee, newFee]));
  await db.delete(feeTypes).where(eq(feeTypes.id, typeId));
});

describe('authenticated installment charged year', () => {
  it('scopes lists, detail, writes and MCP by the fee year', async () => {
    expect((await request('/installments', '2025-2026')).body.data.map((row: { id: string }) => row.id)).toContain(oldId);
    expect((await request('/installments', '2026-2027')).body.data.map((row: { id: string }) => row.id)).not.toContain(oldId);
    expect((await request(`/installments/${oldId}`, '2026-2027')).status).toBe(404);
    expect((await request(`/installments/${oldId}`, '2025-2026')).body.data.id).toBe(oldId);
    expect((await request(`/installments/fee/${oldFee}`, '2026-2027')).status).toBe(404);
    expect((await request('/installments/overdue', '2025-2026')).body.data
      .map((row: { id: string }) => row.id)).toContain(oldId);
    expect((await request(`/installments/${oldId}`, '2026-2027', 'PUT', { amount: 80 })).status).toBe(404);
    expect((await request(`/installments/${oldId}`, '2026-2027', 'DELETE')).status).toBe(404);
    expect((await request('/installments', '2026-2027', 'POST', {
      feeId: oldFee, number: 2, dueDate: '2026-05-01', amount: 50,
    })).status).toBe(404);
    expect((await request(`/installments/${oldId}`, '2025-2026', 'PUT', { amount: 90 })).status).toBe(200);
    expect(Number((await request(`/installments/${oldId}`, '2025-2026')).body.data.amount)).toBe(90);

    const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
    const { StreamableHTTPClientTransport } = await import('@modelcontextprotocol/sdk/client/streamableHttp.js');
    const client = new Client({ name: 'school-installment-history-test', version: '1.0.0' });
    const transport = new StreamableHTTPClientTransport(new URL(`http://localhost:${port}/api/mcp`), {
      requestInit: { headers: { Authorization: `Bearer ${token}` } },
    });
    await client.connect(transport);
    try {
      const tools = await client.listTools();
      const list = tools.tools.find((item) => item.name === 'installments_get_all');
      expect(list?.inputSchema.properties).toHaveProperty('academicYear');
      const result = (await client.callTool({ name: list!.name, arguments: { academicYear: '2025-2026' } })) as { content: Array<{ text: string }>; isError?: boolean };
      expect(result.isError).not.toBe(true);
      expect((JSON.parse(result.content[0].text) as Array<{ id: string }>).map((row) => row.id)).toContain(oldId);
    } finally { await transport.close(); }
  });
});
