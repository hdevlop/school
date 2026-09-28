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
const { financialAuditLogs } = await import('../../src/modules/financial/auditLog/auditLogSchema');
const { server } = await import('../../src/index');
const suffix = crypto.randomUUID().slice(0, 8);
const feeTypeId = `history-fee-rest-type-${suffix}`;
const oldId = `history-fee-rest-old-${suffix}`;
const currentId = `history-fee-rest-new-${suffix}`;
const feeIds = [oldId, currentId];
const base = 'http://school.local/api';
const port = 5505;
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
  await db.insert(feeTypes).values({ id: feeTypeId, name: `History transport fee ${suffix}`,
    category: 'tuition', amount: '100', paymentType: 'oneTime', status: 'active' });
  await db.insert(fees).values([
    { id: oldId, studentId: 'history-student-01', feeTypeId, academicYear: '2025-2026',
      effectiveDate: '2025-10-01', baseAmount: '100', grossAmount: '100', netAmount: '100' },
    { id: currentId, studentId: 'history-student-01', feeTypeId, academicYear: '2026-2027',
      effectiveDate: '2026-09-01', baseAmount: '100', grossAmount: '100', netAmount: '100' },
  ]);
  await db.insert(feeInstallments).values([
    { id: `history-fee-rest-old-inst-${suffix}`, feeId: oldId, number: 1, dueDate: '2026-06-01', amount: '100' },
    { id: `history-fee-rest-new-inst-${suffix}`, feeId: currentId, number: 1, dueDate: '2026-09-01', amount: '100' },
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
  await db.delete(financialAuditLogs).where(inArray(financialAuditLogs.entityId, feeIds));
  await db.delete(feeInstallments).where(inArray(feeInstallments.feeId, feeIds));
  await db.delete(fees).where(inArray(fees.id, feeIds));
  await db.delete(feeTypes).where(eq(feeTypes.id, feeTypeId));
});

describe('authenticated fee year scope', () => {
  it('keeps fee views, corrections and MCP input on the selected charged year', async () => {
    const studentId = 'history-student-01';
    const listIds = async (year?: string) => (await request('/fees', year)).body.data
      .flatMap((row: { fees: Array<{ id: string }> }) => row.fees.map((fee) => fee.id));
    expect(await listIds('2025-2026')).toContain(oldId);
    expect(await listIds('2025-2026')).not.toContain(currentId);
    expect(await listIds('2026-2027')).toContain(currentId);
    expect(await listIds()).not.toContain(oldId);
    expect((await request(`/fees/${oldId}`, '2026-2027')).status).toBe(404);
    expect((await request(`/fees/${oldId}`, '2025-2026')).body.data.id).toBe(oldId);
    expect((await request(`/fees/student/${studentId}`, '2025-2026')).body.data.fees
      .map((fee: { id: string }) => fee.id)).toContain(oldId);
    expect((await request('/fees/overdue', '2025-2026')).body.data
      .map((fee: { id: string }) => fee.id)).toContain(oldId);
    expect((await request('/fees/overdue/summary', '2025-2026')).body.data.overdueCount)
      .toBeGreaterThan(0);
    expect((await request(`/fees/${oldId}`, '2026-2027', 'PUT', { notes: 'wrong year' })).status)
      .toBe(404);
    expect((await request(`/fees/${oldId}`, '2026-2027', 'DELETE')).status).toBe(404);
    expect((await request(`/fees/recalculate/${oldId}`, '2026-2027', 'POST')).status).toBe(404);
    expect((await request(`/fees/${oldId}`, '2025-2026', 'PUT', { notes: 'Historical correction' })).status)
      .toBe(200);
    expect((await request(`/fees/${oldId}`, '2025-2026')).body.data.notes)
      .toBe('Historical correction');
    expect((await request('/fees', '2026-2027', 'POST', {
      studentId: 'history-student-02', feeTypeId, schedule: 'oneTime',
      academicYear: '2025-2026', effectiveDate: '2025-10-01',
    })).status).toBe(409);

    const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
    const { StreamableHTTPClientTransport } = await import('@modelcontextprotocol/sdk/client/streamableHttp.js');
    const client = new Client({ name: 'school-fee-history-test', version: '1.0.0' });
    const transport = new StreamableHTTPClientTransport(new URL(`http://localhost:${port}/api/mcp`), {
      requestInit: { headers: { Authorization: `Bearer ${token}` } },
    });
    await client.connect(transport);
    try {
      const tools = await client.listTools();
      const list = tools.tools.find((item) => item.name === 'fees_get_fees');
      expect(list?.inputSchema.properties).toHaveProperty('academicYear');
      const result = await client.callTool({ name: list!.name, arguments: { academicYear: '2025-2026' } });
      const { content, isError } = result as { content: Array<{ text: string }>; isError?: boolean };
      expect(isError).not.toBe(true);
      expect((JSON.parse(content[0].text) as Array<{ fees: Array<{ id: string }> }>)
        .flatMap((row) => row.fees.map((fee) => fee.id))).toContain(oldId);
      const create = tools.tools.find((item) => item.name === 'fees_create');
      expect(create?.inputSchema.properties).toHaveProperty('academicYear');
      const created = await client.callTool({ name: create!.name, arguments: {
        studentId: 'history-student-02', feeTypeId, schedule: 'oneTime',
        academicYear: '2025-2026', effectiveDate: '2025-10-01',
      } }) as { content: Array<{ text: string }>; isError?: boolean };
      expect(created.isError).not.toBe(true);
      const createdId = (JSON.parse(created.content[0].text) as { id: string }).id;
      feeIds.push(createdId);
      expect((await request(`/fees/${createdId}`, '2025-2026')).status).toBe(200);
      expect((await request(`/fees/${createdId}`, '2026-2027')).status).toBe(404);
    } finally { await transport.close(); }
  });
});
