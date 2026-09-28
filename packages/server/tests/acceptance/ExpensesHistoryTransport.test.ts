import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { and, eq, inArray } from 'drizzle-orm';

const rawUrl = process.env.SCHOOL_HISTORY_TEST_DB_URL;
const adminPassword = process.env.SCHOOL_HISTORY_ADMIN_PASSWORD;
if (!rawUrl || !adminPassword) throw new Error('History fixture env is required');
const target = new URL(rawUrl);
if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)
  || target.pathname !== '/school_history_test') throw new Error('Expected local school_history_test');
process.env.DB_URL = rawUrl;

const { db } = await import('../../src/database/db');
const { expenses } = await import('../../src/modules/financial/expenses/expenseSchema');
const { financialAuditLogs } = await import('../../src/modules/financial/auditLog/auditLogSchema');
const { server } = await import('../../src/index');
const base = 'http://school.local/api';
const port = 5504;
const suffix = crypto.randomUUID().slice(0, 8);
const title = `History expense ${suffix}`;
let token: string;
const ids: string[] = [];

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
  if (ids.length) {
    await db.delete(financialAuditLogs).where(and(eq(financialAuditLogs.entityType, 'expense'),
      inArray(financialAuditLogs.entityId, ids)));
    await db.delete(expenses).where(inArray(expenses.id, ids));
  }
});

describe('authenticated expense year scope', () => {
  it('keeps dated expenses and corrections in the selected year over REST and MCP', async () => {
    const oldInvoice = `history-expense-${suffix}-old`;
    const create = (year: string, date: string, invoiceNumber: string) =>
      request('/expenses', year, 'POST', { category: 'supplies', title, amount: 31,
        expenseDate: date, invoiceNumber });
    const old = await create('2025-2026', '2026-07-10', oldInvoice);
    expect(old.status).toBe(200);
    const oldId = old.body.data?.id as string;
    expect(typeof oldId).toBe('string');
    ids.push(oldId);
    const current = await create('2026-2027', '2026-09-12', `history-expense-${suffix}-new`);
    expect(current.status).toBe(200);
    const currentId = current.body.data?.id as string;
    expect(typeof currentId).toBe('string');
    ids.push(currentId);

    const visibleIds = async (year?: string) => (await request('/expenses', year)).body.data
      .filter((row: { title: string }) => row.title === title)
      .map((row: { id: string }) => row.id);
    expect(await visibleIds('2025-2026')).toEqual([oldId]);
    expect(await visibleIds('2026-2027')).toEqual([currentId]);
    expect(await visibleIds()).toEqual([currentId]);
    expect((await request(`/expenses/${oldId}`, '2026-2027')).status).toBe(404);
    expect((await request(`/expenses/${oldId}`, '2025-2026')).body.data.expenseDate).toBe('2026-07-10');
    expect((await request('/expenses/pending', '2025-2026')).body.data.map((row: { id: string }) => row.id))
      .toContain(oldId);

    expect((await create('2026-2027', '2026-07-11', `history-expense-${suffix}-bad-date`)).status)
      .toBe(409);
    expect((await create('2026-2027', '2026-09-13', oldInvoice)).status).toBe(409);
    expect((await request(`/expenses/${oldId}`, '2026-2027', 'PUT', { title: 'wrong year' })).status)
      .toBe(404);
    expect((await request(`/expenses/${oldId}`, '2025-2026', 'PUT', { expenseDate: '2026-09-13' })).status)
      .toBe(409);
    expect((await request(`/expenses/${oldId}/approve`, '2026-2027', 'POST', { action: 'approve' })).status)
      .toBe(404);
    expect((await request(`/expenses/${oldId}/approve`, '2025-2026', 'POST', { action: 'approve' })).status)
      .toBe(200);
    expect((await request(`/expenses/${oldId}/payment`, '2025-2026', 'POST',
      { paymentMethod: 'cash', paymentDate: '2026-09-15' })).status).toBe(200);
    const paid = await request(`/expenses/${oldId}`, '2025-2026');
    expect(paid.body.data).toMatchObject({ status: 'paid', paymentDate: '2026-09-15' });
    expect((await request(`/expenses/${oldId}`, '2026-2027', 'DELETE')).status).toBe(404);

    const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
    const { StreamableHTTPClientTransport } = await import('@modelcontextprotocol/sdk/client/streamableHttp.js');
    const client = new Client({ name: 'school-expense-history-test', version: '1.0.0' });
    const transport = new StreamableHTTPClientTransport(new URL(`http://localhost:${port}/api/mcp`), {
      requestInit: { headers: { Authorization: `Bearer ${token}` } },
    });
    await client.connect(transport);
    try {
      const tools = await client.listTools();
      const tool = tools.tools.find((item) => item.name === 'expenses_get_expenses');
      expect(tool?.inputSchema.properties).toHaveProperty('academicYear');
      const result = await client.callTool({ name: tool!.name, arguments: { academicYear: '2025-2026' } });
      const { content, isError } = result as { content: Array<{ text: string }>; isError?: boolean };
      expect(isError).not.toBe(true);
      expect((JSON.parse(content[0].text) as Array<{ id: string }>).map((row) => row.id)).toContain(oldId);
    } finally { await transport.close(); }
    expect((await request(`/expenses/${oldId}`, '2025-2026', 'DELETE')).status).toBe(200);
    expect(await visibleIds('2025-2026')).toEqual([]);
    expect(await visibleIds('2026-2027')).toEqual([currentId]);
  });
});
