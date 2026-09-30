import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { inArray } from 'drizzle-orm';

const rawUrl = process.env.SCHOOL_HISTORY_TEST_DB_URL;
const adminPassword = process.env.SCHOOL_HISTORY_ADMIN_PASSWORD;
const principalPassword = process.env.SCHOOL_HISTORY_PRINCIPAL_PASSWORD;
if (!rawUrl || !adminPassword || !principalPassword) throw new Error('History fixture env is required');
const target = new URL(rawUrl);
if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)
  || target.pathname !== '/school_history_test') throw new Error('Expected local school_history_test');
process.env.DB_URL = rawUrl;

const { db } = await import('../../src/database/db');
const { financialAuditLogs } = await import('../../src/modules/financial/auditLog/auditLogSchema');
const { server } = await import('../../src/index');
const base = 'http://school.local/api';
const port = 5501;
const suffix = crypto.randomUUID().slice(0, 8);
const action = `history.audit.${suffix}`;
let adminToken: string;
let principalToken: string;
let ids: string[] = [];

async function login(email: string, password: string) {
  const response = await server.fetch(new Request(`${base}/auth/login`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  }));
  const body = await response.json() as Record<string, any>;
  expect(response.status).toBe(200);
  const token = body.data?.accessToken ?? body.accessToken ?? body.data?.tokens?.accessToken;
  expect(typeof token).toBe('string');
  return token as string;
}

async function request(path: string, token: string, year?: string, method = 'GET', data?: unknown) {
  const response = await server.fetch(new Request(`${base}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(year ? { 'X-Academic-Year': year } : {}),
      ...(data ? { 'content-type': 'application/json' } : {}) },
    ...(data ? { body: JSON.stringify(data) } : {}),
  }));
  return { status: response.status, body: await response.json() as Record<string, any> };
}

beforeAll(async () => {
  const rows = await db.insert(financialAuditLogs).values([
    { entityType: 'fee', entityId: `history-audit-old-${suffix}`, action,
      after: { academicYear: '2025-2026' } },
    { entityType: 'fee', entityId: `history-audit-new-${suffix}`, action,
      after: { academicYear: '2026-2027' } },
  ]).returning({ id: financialAuditLogs.id });
  ids = rows.map((row) => row.id);
  await server.listen(port);
  adminToken = await login('admin@history.example.test', adminPassword);
  principalToken = await login('principal@history.example.test', principalPassword);
});

afterAll(async () => {
  await server.stop();
  if (ids.length) await db.delete(financialAuditLogs).where(inArray(financialAuditLogs.id, ids));
});

describe('authenticated financial audit remains all-year', () => {
  it('returns both years under either selected-year header and keeps admin-only access', async () => {
    const listing = async (year?: string) => request('/financial-audit-logs/list', adminToken, year, 'POST', { action });
    for (const year of [undefined, '2025-2026', '2026-2027', '2099-2100']) {
      const result = await listing(year);
      expect(result.status).toBe(200);
      expect(result.body.data.total).toBe(2);
      expect(result.body.data.items.map((row: { id: string }) => row.id).sort()).toEqual([...ids].sort());
    }
    const detail = await request(`/financial-audit-logs/${ids[0]}`, adminToken, '2026-2027');
    expect(detail.status).toBe(200);
    expect(detail.body.data.id).toBe(ids[0]);
    const principal = await request('/financial-audit-logs/list', principalToken, '2025-2026', 'POST', { action });
    expect(principal.status).toBe(403);
  });

  it('keeps the audit list all-year over MCP', async () => {
    const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
    const { StreamableHTTPClientTransport } = await import('@modelcontextprotocol/sdk/client/streamableHttp.js');
    const client = new Client({ name: 'school-audit-history-test', version: '1.0.0' });
    const transport = new StreamableHTTPClientTransport(new URL(`http://localhost:${port}/api/mcp`), {
      requestInit: { headers: { Authorization: `Bearer ${adminToken}`, 'X-Academic-Year': '2025-2026' } },
    });
    await client.connect(transport);
    try {
      const tools = await client.listTools();
      const tool = tools.tools.find((item) => item.name === 'audit-logs_list');
      expect(tool).toBeDefined();
      expect(tool?.inputSchema.properties).not.toHaveProperty('academicYear');
      const result = await client.callTool({ name: tool!.name, arguments: { action } });
      const { content, isError } = result as { content: Array<{ text: string }>; isError?: boolean };
      expect(isError).not.toBe(true);
      const payload = JSON.parse(content[0].text) as { items: Array<{ id: string }>; total: number };
      expect(payload.total).toBe(2);
      expect(payload.items.map((row) => row.id).sort()).toEqual([...ids].sort());
    } finally { await transport.close(); }
  });
});
