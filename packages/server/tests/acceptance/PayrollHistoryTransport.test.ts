import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { inArray } from 'drizzle-orm';

const rawUrl = process.env.SCHOOL_HISTORY_TEST_DB_URL;
const adminPassword = process.env.SCHOOL_HISTORY_ADMIN_PASSWORD;
if (!rawUrl || !adminPassword) throw new Error('History fixture env is required');
const target = new URL(rawUrl);
if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)
  || target.pathname !== '/school_history_test') throw new Error('Expected local school_history_test');
process.env.DB_URL = rawUrl;

const { db } = await import('../../src/database/db');
const { payslips } = await import('../../src/modules/financial/payroll/payrollSchema');
const { financialAuditLogs } = await import('../../src/modules/financial/auditLog/auditLogSchema');
const { server } = await import('../../src/index');
const suffix = crypto.randomUUID().slice(0, 8);
const oldId = `history-payroll-rest-old-${suffix}`;
const newId = `history-payroll-rest-new-${suffix}`;
const ids = [oldId, newId];
const base = 'http://school.local/api';
const port = 5510;
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
  await db.insert(payslips).values([
    { id: oldId, staffId: 'history-staff-teacher', staffName: 'History Teacher', staffRole: 'teacher',
      period: '2026-07', baseSalary: '100', grossAmount: '100', netAmount: '100',
      status: 'paid', paymentMethod: 'bankTransfer', paymentDate: '2026-09-10' },
    { id: newId, staffId: 'history-staff-teacher', staffName: 'History Teacher', staffRole: 'teacher',
      period: '2026-09', baseSalary: '110', grossAmount: '110', netAmount: '110', status: 'pending' },
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
  await db.delete(financialAuditLogs).where(inArray(financialAuditLogs.entityId, ids));
  await db.delete(payslips).where(inArray(payslips.id, ids));
});

describe('authenticated payroll period history', () => {
  it('scopes period/detail/writes while preserving a later cash date', async () => {
    expect((await request('/payroll', '2025-2026')).body.data
      .map((row: { id: string }) => row.id)).toContain(oldId);
    expect((await request('/payroll', '2026-2027')).body.data
      .map((row: { id: string }) => row.id)).not.toContain(oldId);
    expect((await request(`/payroll/${oldId}`, '2026-2027')).status).toBe(404);
    expect((await request(`/payroll/${oldId}`, '2025-2026')).body.data.paymentDate).toBe('2026-09-10');
    expect((await request('/payroll/period/2026-07', '2025-2026')).body.data.payslips
      .map((row: { id: string }) => row.id)).toContain(oldId);
    expect((await request('/payroll/period/2026-07', '2026-2027')).body.data.summary.count).toBe(0);
    expect((await request(`/payroll/${oldId}`, '2026-2027', 'PUT', { notes: 'wrong year' })).status)
      .toBe(404);
    expect((await request(`/payroll/${oldId}`, '2026-2027', 'DELETE')).status).toBe(404);
    expect((await request('/payroll/run', '2026-2027', 'POST', { period: '2026-07' })).status)
      .toBe(409);
    expect((await request('/payroll/pay-staff', '2026-2027', 'POST', {
      staffId: 'history-staff-teacher', period: '2026-07', paymentMethod: 'bankTransfer',
    })).status).toBe(409);
    expect((await request(`/payroll/${oldId}`, '2025-2026', 'PUT', { notes: 'Historical correction' })).status)
      .toBe(200);
    expect((await request(`/payroll/${oldId}`, '2025-2026')).body.data.notes)
      .toBe('Historical correction');

    const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
    const { StreamableHTTPClientTransport } = await import('@modelcontextprotocol/sdk/client/streamableHttp.js');
    const client = new Client({ name: 'school-payroll-history-test', version: '1.0.0' });
    const transport = new StreamableHTTPClientTransport(new URL(`http://localhost:${port}/api/mcp`), {
      requestInit: { headers: { Authorization: `Bearer ${token}` } },
    });
    await client.connect(transport);
    try {
      const tools = await client.listTools();
      const list = tools.tools.find((item) => item.name === 'payroll_get_all');
      expect(list?.inputSchema.properties).toHaveProperty('academicYear');
      const result = (await client.callTool({ name: list!.name, arguments: { academicYear: '2025-2026' } })) as {
        content: Array<{ text: string }>; isError?: boolean;
      };
      expect(result.isError).not.toBe(true);
      expect((JSON.parse(result.content[0].text) as Array<{ id: string }>).map((row) => row.id)).toContain(oldId);
    } finally { await transport.close(); }
  });
});
