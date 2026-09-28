import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { eq } from 'drizzle-orm';

const rawUrl = process.env.SCHOOL_HISTORY_TEST_DB_URL;
const adminPassword = process.env.SCHOOL_HISTORY_ADMIN_PASSWORD;
if (!rawUrl || !adminPassword) throw new Error('History fixture env is required');
const target = new URL(rawUrl);
if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)
  || target.pathname !== '/school_history_test') throw new Error('Expected local school_history_test');
process.env.DB_URL = rawUrl;

const { db } = await import('../../src/database/db');
const { feeTypes } = await import('../../src/modules/financial/feeTypes/feeTypeSchema');
const { server } = await import('../../src/index');
const suffix = crypto.randomUUID().slice(0, 8);
const name = `History shared fee type ${suffix}`;
const base = 'http://school.local/api';
const port = 5506;
let token: string;
let id: string | undefined;

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
  if (id) await db.delete(feeTypes).where(eq(feeTypes.id, id));
});

describe('authenticated shared fee type catalog', () => {
  it('keeps fee types shared through REST and MCP, with one name rule across years', async () => {
    const created = await request('/fee-types', '2025-2026', 'POST', {
      name, category: 'tuition', amount: 125, paymentType: 'oneTime', status: 'active',
    });
    expect(created.status).toBe(200);
    id = created.body.data?.id;
    expect(typeof id).toBe('string');
    expect((await request(`/fee-types/${id}`, '2026-2027')).body.data.id).toBe(id);
    expect((await request(`/fee-types/${id}`, '2024-2025')).body.data.id).toBe(id);
    expect((await request(`/fee-types/${id}`, '2099-2100')).body.data.id).toBe(id);
    expect((await request('/fee-types', '2026-2027')).body.data
      .map((item: { id: string }) => item.id)).toContain(id);
    expect((await request('/fee-types', '2026-2027', 'POST', {
      name, category: 'tuition', amount: 130, paymentType: 'oneTime',
    })).status).toBe(409);
    expect((await request(`/fee-types/${id}`, '2026-2027', 'PUT', { amount: 140 })).status)
      .toBe(200);
    expect((await request(`/fee-types/${id}`, '2025-2026')).body.data.amount).toBe('140.00');

    const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
    const { StreamableHTTPClientTransport } = await import('@modelcontextprotocol/sdk/client/streamableHttp.js');
    const client = new Client({ name: 'school-fee-type-history-test', version: '1.0.0' });
    const transport = new StreamableHTTPClientTransport(new URL(`http://localhost:${port}/api/mcp`), {
      requestInit: { headers: { Authorization: `Bearer ${token}`, 'X-Academic-Year': '2025-2026' } },
    });
    await client.connect(transport);
    try {
      const tools = await client.listTools();
      const list = tools.tools.find((item) => item.name === 'fee-types_get_all');
      expect(list).toBeDefined();
      expect(list?.inputSchema.properties).not.toHaveProperty('academicYear');
      const result = await client.callTool({ name: list!.name }) as {
        content: Array<{ text: string }>; isError?: boolean;
      };
      expect(result.isError).not.toBe(true);
      expect((JSON.parse(result.content[0].text) as Array<{ id: string }>).map((row) => row.id))
        .toContain(id);
    } finally { await transport.close(); }
    expect((await request(`/fee-types/${id}`, '2024-2025', 'DELETE')).status).toBe(200);
    expect((await request(`/fee-types/${id}`, '2026-2027')).status).toBe(404);
  });
});
