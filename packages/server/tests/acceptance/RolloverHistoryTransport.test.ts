import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { and, eq, inArray, sql } from 'drizzle-orm';

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
// Two fee types per scenario, so each run writes two fees for history-student-01.
const raceTypeIds = [`history-rollover-race-a-${suffix}`, `history-rollover-race-b-${suffix}`];
const crashTypeIds = [`history-rollover-crash-a-${suffix}`, `history-rollover-crash-b-${suffix}`];
const scenarioTypeIds = [...raceTypeIds, ...crashTypeIds];
const scenarioRunIds: string[] = [];
const crashTrigger = `history_rollover_crash_${suffix.replaceAll('-', '_')}`;
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
  await db.insert(feeTypes).values(scenarioTypeIds.map((id, index) => ({
    id, name: `History rollover scenario ${index} ${suffix}`,
    category: 'tuition' as const, amount: '25', paymentType: 'oneTime' as const, status: 'active' as const,
  })));
  await db.insert(fees).values(scenarioTypeIds.map((id) => ({
    id: `${id}-source`, studentId: 'history-student-01', feeTypeId: id,
    academicYear: '2025-2026', effectiveDate: '2025-10-01',
    baseAmount: '25', grossAmount: '25', netAmount: '25',
  })));
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
  await db.execute(sql.raw(`DROP TRIGGER IF EXISTS ${crashTrigger} ON fees`));
  await db.execute(sql.raw(`DROP FUNCTION IF EXISTS ${crashTrigger}()`));
  const scenarioFeeIds = (await db.select({ id: fees.id }).from(fees)
    .where(inArray(fees.feeTypeId, scenarioTypeIds))).map((row) => row.id);
  if (scenarioRunIds.length) {
    await db.delete(rolloverRunItems).where(inArray(rolloverRunItems.runId, scenarioRunIds));
    await db.delete(financialAuditLogs).where(inArray(financialAuditLogs.entityId, [...scenarioRunIds, ...scenarioFeeIds]));
    await db.delete(rolloverRuns).where(inArray(rolloverRuns.id, scenarioRunIds));
  }
  if (scenarioFeeIds.length) {
    await db.delete(feeInstallments).where(inArray(feeInstallments.feeId, scenarioFeeIds));
    await db.delete(fees).where(inArray(fees.id, scenarioFeeIds));
  }
  await db.delete(feeTypes).where(inArray(feeTypes.id, scenarioTypeIds));
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

  async function previewScenario(feeTypeIds: string[]) {
    const scenario = { ...payload, feeTypeIds, idempotencyKey: crypto.randomUUID() };
    const preview = await request('/rollover/preview', '2026-2027', 'POST', scenario);
    expect(preview.status).toBe(200);
    expect(preview.body.data.preview.proposedFees).toBe(2);
    scenarioRunIds.push(preview.body.data.id);
    return { ...scenario, runId: preview.body.data.id as string, confirmSettingsUpdate: false };
  }

  async function targetFees(feeTypeIds: string[]) {
    return db.select({ id: fees.id }).from(fees)
      .where(and(inArray(fees.feeTypeId, feeTypeIds), eq(fees.academicYear, '2026-2027')));
  }

  it('commits one preview once when two commits of it race', async () => {
    const commit = await previewScenario(raceTypeIds);
    const [first, second] = await Promise.all([
      request('/rollover/commit', '2026-2027', 'POST', commit),
      request('/rollover/commit', '2026-2027', 'POST', commit),
    ]);
    expect([first.status, second.status]).toEqual([200, 200]);
    // One commit writes the run; the other waits on the year lock and reads it.
    const statuses = [first.body.data.status ?? first.body.data.run?.status,
      second.body.data.status ?? second.body.data.run?.status];
    expect(statuses).toEqual(['committed', 'committed']);
    expect(await targetFees(raceTypeIds)).toHaveLength(2);
    const items = await db.select().from(rolloverRunItems).where(eq(rolloverRunItems.runId, commit.runId));
    expect(items.map((item) => item.status)).toEqual(['success', 'success']);
    const [run] = await db.select().from(rolloverRuns).where(eq(rolloverRuns.id, commit.runId));
    expect(run.status).toBe('committed');
    expect(run.totalFees).toBe(2);
  });

  it('rolls back the whole run when a write fails midway, and a retry bills it once', async () => {
    const commit = await previewScenario(crashTypeIds);
    const [a, b] = crashTypeIds;
    // Fails whichever of the run's two fee inserts comes second, after the
    // first has been written in the same transaction.
    await db.execute(sql.raw(`
      CREATE FUNCTION ${crashTrigger}() RETURNS trigger AS $$
      BEGIN
        IF NEW.fee_type_id IN ('${a}', '${b}') AND EXISTS (
          SELECT 1 FROM fees WHERE student_id = NEW.student_id
            AND academic_year = NEW.academic_year AND fee_type_id IN ('${a}', '${b}')
        ) THEN RAISE EXCEPTION 'injected rollover failure'; END IF;
        RETURN NEW;
      END $$ LANGUAGE plpgsql`));
    await db.execute(sql.raw(`CREATE TRIGGER ${crashTrigger} BEFORE INSERT ON fees
      FOR EACH ROW EXECUTE FUNCTION ${crashTrigger}()`));
    try {
      const failed = await request('/rollover/commit', '2026-2027', 'POST', commit);
      expect(failed.status).toBe(500);
      expect(await targetFees(crashTypeIds)).toHaveLength(0);
      expect(await db.select().from(rolloverRunItems).where(eq(rolloverRunItems.runId, commit.runId)))
        .toHaveLength(0);
      const [run] = await db.select().from(rolloverRuns).where(eq(rolloverRuns.id, commit.runId));
      expect(run.status).toBe('previewed');
    } finally {
      await db.execute(sql.raw(`DROP TRIGGER IF EXISTS ${crashTrigger} ON fees`));
      await db.execute(sql.raw(`DROP FUNCTION IF EXISTS ${crashTrigger}()`));
    }

    const retried = await request('/rollover/commit', '2026-2027', 'POST', commit);
    expect(retried.status).toBe(200);
    expect(retried.body.data.status).toBe('committed');
    expect(retried.body.data.successCount).toBe(2);
    expect(await targetFees(crashTypeIds)).toHaveLength(2);
  });
});
