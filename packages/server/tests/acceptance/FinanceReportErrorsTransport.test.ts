import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it, spyOn } from 'bun:test';
import { sql } from 'drizzle-orm';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { Err } from 'najm-core';

const rawUrl = process.env.SCHOOL_HISTORY_TEST_DB_URL;
const adminPassword = process.env.SCHOOL_HISTORY_ADMIN_PASSWORD;
if (!rawUrl || !adminPassword) throw new Error('History fixture env is required');
const target = new URL(rawUrl);
if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)
  || target.pathname !== '/school_history_test') throw new Error('Expected local school_history_test');
process.env.DB_URL = rawUrl;

const { db } = await import('../../src/database/db');
const { FinanceDashboardRepository } = await import('../../src/modules/dashboard/finance/FinanceDashboardRepository');
const { server } = await import('../../src/index');
const base = 'http://localhost:5541/api';
const year = '2026-2027';
let token: string;
let client: Client;
let transport: StreamableHTTPClientTransport;

async function readReport() {
  return server.fetch(new Request(`${base}/dashboard/finance/reports/expense-breakdown`, {
    headers: { Authorization: `Bearer ${token}`, 'X-Academic-Year': year },
  }));
}

beforeAll(async () => {
  const marker = await db.execute<{ id: string }>(sql`select id from school_history_fixture_marker`);
  expect(marker).toHaveLength(1);
  expect(marker[0]?.id).toBe('academic-history-alerts-v1');
  await server.listen(5541);
  const response = await server.fetch(new Request(`${base}/auth/login`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'admin@history.example.test', password: adminPassword }),
  }));
  expect(response.status).toBe(200);
  const body = await response.json() as Record<string, any>;
  token = body.data?.accessToken ?? body.accessToken ?? body.data?.tokens?.accessToken;
  expect(typeof token).toBe('string');
  client = new Client({ name: 'school-finance-error-acceptance', version: '1.0.0' });
  transport = new StreamableHTTPClientTransport(new URL(`${base}/mcp`), {
    requestInit: { headers: { Authorization: `Bearer ${token}` } },
  });
  await client.connect(transport);
});

afterAll(async () => {
  if (transport) await transport.close();
  await server.stop();
});

describe('finance errors at the production response boundary', () => {
  for (const kind of ['database', 'explicit-server-error'] as const) {
    it(`masks ${kind} details in REST and MCP and recovers after the fault`, async () => {
      const previousMode = process.env.NODE_ENV;
      const errors = spyOn(console, 'error').mockImplementation(() => {});
      const fault = spyOn(FinanceDashboardRepository.prototype, 'getExpenseBreakdown')
        .mockImplementation(async () => {
          if (kind === 'database') {
            // Real PostgreSQL error; a nonexistent column, with no data writes.
            await db.execute(sql`select report_error_masking_canary from pg_catalog.pg_class limit 1`);
          }
          return Err(500, 'report_error_masking_canary: internal query details');
        });
      try {
        // Boot uses the marked local fixture. Only response handling runs in
        // production mode; this is not a full production startup/deploy test.
        process.env.NODE_ENV = 'production';
        const response = await readReport();
        expect(response.status).toBe(500);
        const body = await response.text();
        expect(body).toContain('Internal Server Error');
        for (const privateDetail of ['report_error_masking_canary', 'pg_catalog', 'Failed query', 'stack']) {
          expect(body).not.toContain(privateDetail);
        }
        const result = await client.callTool({ name: 'finance-dashboard_get_expense_breakdown',
          arguments: { academicYear: year } });
        expect(result.isError).toBe(true);
        expect(JSON.stringify(result)).toContain('Tool execution failed');
        expect(JSON.stringify(result)).not.toContain('report_error_masking_canary');
        expect(fault).toHaveBeenCalledTimes(2);
        expect(errors).toHaveBeenCalled();
      } finally {
        fault.mockRestore();
        errors.mockRestore();
        if (previousMode === undefined) delete process.env.NODE_ENV;
        else process.env.NODE_ENV = previousMode;
      }
      expect((await readReport()).status).toBe(200);
    });
  }

  it('preserves REST client errors and safely refuses the same MCP call', async () => {
    const previousMode = process.env.NODE_ENV;
    const fault = spyOn(FinanceDashboardRepository.prototype, 'getExpenseBreakdown')
      .mockImplementation(async () => Err(409, 'The report period is unavailable'));
    try {
      process.env.NODE_ENV = 'production';
      const response = await readReport();
      expect(response.status).toBe(409);
      expect(await response.text()).toContain('The report period is unavailable');
      const result = await client.callTool({ name: 'finance-dashboard_get_expense_breakdown',
        arguments: { academicYear: year } });
      expect(result.isError).toBe(true);
      // Najm MCP currently generalizes ordinary domain errors as well as
      // internal failures. Do not enable exposeErrorDetails to bypass this.
      expect(JSON.stringify(result)).toContain('Tool execution failed');
    } finally {
      fault.mockRestore();
      if (previousMode === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previousMode;
    }
  });
});
