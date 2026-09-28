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
const { rolloverRuns, rolloverRunItems } = await import('../../src/modules/financial/rollover/rolloverSchema');
const { financialAuditLogs } = await import('../../src/modules/financial/auditLog/auditLogSchema');
const { server } = await import('../../src/index');
const suffix = crypto.randomUUID().slice(0, 8);
const typeId = `history-rollover-rest-type-${suffix}`;
const sourceFeeId = `history-rollover-rest-source-${suffix}`;
const conflictTypeId = `history-rollover-conflict-type-${suffix}`;
const conflictSourceId = `history-rollover-conflict-source-${suffix}`;
const conflictTargetId = `history-rollover-conflict-target-${suffix}`;
const conflictKey = crypto.randomUUID();
const key = crypto.randomUUID();
const port = 5511;
const base = 'http://school.local/api';
let token: string;
let runId: string | undefined;
let createdFeeId: string | undefined;
let conflictRunId: string | undefined;

const payload = {
  fromYear: '2025-2026', toYear: '2026-2027',
  feeTypeIds: [typeId], includeOneTimeFees: true, copyDiscounts: false,
  dryRun: true, idempotencyKey: key,
};

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
  await db.insert(feeTypes).values([
    { id: typeId, name: `History rollover transport ${suffix}`,
      category: 'tuition', amount: '60', paymentType: 'oneTime', status: 'active' },
    { id: conflictTypeId, name: `History rollover conflict ${suffix}`,
      category: 'tuition', amount: '40', paymentType: 'oneTime', status: 'active' },
  ]);
  await db.insert(fees).values([
    { id: sourceFeeId, studentId: 'history-student-01', feeTypeId: typeId,
      academicYear: '2025-2026', effectiveDate: '2025-10-01',
      baseAmount: '60', grossAmount: '60', netAmount: '60' },
    { id: conflictSourceId, studentId: 'history-student-01', feeTypeId: conflictTypeId,
      academicYear: '2025-2026', effectiveDate: '2025-10-01',
      baseAmount: '40', grossAmount: '40', netAmount: '40' },
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
  const feeIds = [sourceFeeId, conflictSourceId, conflictTargetId, ...(createdFeeId ? [createdFeeId] : [])];
  if (runId) {
    await db.delete(rolloverRunItems).where(eq(rolloverRunItems.runId, runId));
    await db.delete(financialAuditLogs).where(inArray(financialAuditLogs.entityId, [runId, ...feeIds]));
    await db.delete(rolloverRuns).where(eq(rolloverRuns.id, runId));
  }
  if (conflictRunId) {
    await db.delete(rolloverRunItems).where(eq(rolloverRunItems.runId, conflictRunId));
    await db.delete(financialAuditLogs).where(eq(financialAuditLogs.entityId, conflictRunId));
    await db.delete(rolloverRuns).where(eq(rolloverRuns.id, conflictRunId));
  }
  await db.delete(feeInstallments).where(inArray(feeInstallments.feeId, feeIds));
  await db.delete(fees).where(inArray(fees.id, feeIds));
  await db.delete(feeTypes).where(inArray(feeTypes.id, [typeId, conflictTypeId]));
});

describe('authenticated financial rollover', () => {
  it('previews explicit years, commits under target context and retries without duplicates', async () => {
    expect((await request('/rollover/preview', '2025-2026', 'POST', payload)).status).toBe(409);
    const preview = await request('/rollover/preview', '2026-2027', 'POST', payload);
    expect(preview.status).toBe(200);
    runId = preview.body.data.id;
    expect(preview.body.data.preview.proposedFees).toBe(1);
    expect(preview.body.data.preview.details.proposedFees[0].studentId).toBe('history-student-01');
    expect((await request('/rollover/preview', '2026-2027', 'POST', payload)).body.data.id).toBe(runId);
    expect((await request('/rollover/commit', '2025-2026', 'POST', {
      ...payload, runId, confirmSettingsUpdate: false,
    })).status).toBe(409);
    const committed = await request('/rollover/commit', '2026-2027', 'POST', {
      ...payload, runId, confirmSettingsUpdate: false,
    });
    expect(committed.status).toBe(200);
    expect(committed.body.data.status).toBe('committed');
    expect(committed.body.data.successCount).toBe(1);
    const items = await db.select().from(rolloverRunItems).where(eq(rolloverRunItems.runId, runId!));
    expect(items).toHaveLength(1);
    createdFeeId = items[0].feeId ?? undefined;
    expect((await request(`/fees/${createdFeeId}`, '2026-2027')).status).toBe(200);
    expect((await request(`/fees/${createdFeeId}`, '2025-2026')).status).toBe(404);
    expect((await request('/rollover/commit', '2026-2027', 'POST', {
      ...payload, runId, confirmSettingsUpdate: false,
    })).status).toBe(200);
    expect(await db.select().from(rolloverRunItems).where(eq(rolloverRunItems.runId, runId!)))
      .toHaveLength(1);

    const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
    const { StreamableHTTPClientTransport } = await import('@modelcontextprotocol/sdk/client/streamableHttp.js');
    const client = new Client({ name: 'school-rollover-history-test', version: '1.0.0' });
    const transport = new StreamableHTTPClientTransport(new URL(`http://localhost:${port}/api/mcp`), {
      requestInit: { headers: { Authorization: `Bearer ${token}` } },
    });
    await client.connect(transport);
    try {
      const tools = await client.listTools();
      expect(tools.tools.find((item) => item.name === 'rollover_preview')?.inputSchema.properties)
        .toHaveProperty('academicYear');
    } finally { await transport.close(); }
  });

  it('rolls back a failed fee item and records a stable failed run', async () => {
    const conflictPayload = { ...payload, feeTypeIds: [conflictTypeId], idempotencyKey: conflictKey };
    const preview = await request('/rollover/preview', '2026-2027', 'POST', conflictPayload);
    expect(preview.status).toBe(200);
    conflictRunId = preview.body.data.id;
    expect(preview.body.data.preview.proposedFees).toBe(1);
    await db.insert(fees).values({ id: conflictTargetId, studentId: 'history-student-01',
      feeTypeId: conflictTypeId, academicYear: '2026-2027', effectiveDate: '2026-09-01',
      baseAmount: '40', grossAmount: '40', netAmount: '40' });
    const committed = await request('/rollover/commit', '2026-2027', 'POST', {
      ...conflictPayload, runId: conflictRunId, confirmSettingsUpdate: false,
    });
    expect(committed.status).toBe(200);
    expect(committed.body.data.status).toBe('failed');
    expect(committed.body.data.successCount).toBe(0);
    expect(committed.body.data.errorCount).toBe(1);
    expect(await db.select().from(rolloverRunItems).where(eq(rolloverRunItems.runId, conflictRunId!)))
      .toHaveLength(1);
    const retry = await request('/rollover/commit', '2026-2027', 'POST', {
      ...conflictPayload, runId: conflictRunId, confirmSettingsUpdate: false,
    });
    expect(retry.status).toBe(200);
    expect(retry.body.data.run.status).toBe('failed');
  });
});
