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
const oldSecret = process.env.FINANCIAL_CRON_SECRET;
const cronSecret = crypto.randomUUID();
process.env.FINANCIAL_CRON_SECRET = cronSecret;

const { db } = await import('../../src/database/db');
const { financialNotificationDeliveries } = await import('../../src/modules/financial/notifications/notificationSchema');
const { feeTypes } = await import('../../src/modules/financial/feeTypes/feeTypeSchema');
const { fees, feeInstallments } = await import('../../src/modules/financial/fees/feeSchema');
const { server } = await import('../../src/index');
const suffix = crypto.randomUUID().slice(0, 8);
const ids = [`history-notif-old-${suffix}`, `history-notif-current-${suffix}`];
const typeId = `history-notif-transport-type-${suffix}`;
const feeId = `history-notif-transport-fee-${suffix}`;
const installmentId = `history-notif-transport-inst-${suffix}`;
const port = 5508;
const base = 'http://school.local/api';
let token: string;

beforeAll(async () => {
  await db.insert(feeTypes).values({ id: typeId, name: `History reminder transport ${suffix}`,
    category: 'tuition', amount: '30', paymentType: 'oneTime', status: 'active' });
  await db.insert(fees).values({ id: feeId, studentId: 'history-student-08', feeTypeId: typeId,
    academicYear: '2025-2026', effectiveDate: '2025-10-01',
    baseAmount: '30', grossAmount: '30', netAmount: '30' });
  await db.insert(feeInstallments).values({ id: installmentId, feeId, number: 1,
    dueDate: '2026-06-01', amount: '30' });
  await db.insert(financialNotificationDeliveries).values([
    { id: ids[0], kind: `installment_overdue:2025-2026:${suffix}`,
      studentId: 'history-student-08', businessDate: '2026-09-24', payload: { academicYear: '2025-2026' } },
    { id: ids[1], kind: `installment_overdue:2026-2027:${suffix}`,
      studentId: 'history-student-08', businessDate: '2026-09-24', payload: { academicYear: '2026-2027' } },
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
  await db.delete(financialNotificationDeliveries).where(inArray(financialNotificationDeliveries.id, ids));
  await db.delete(feeInstallments).where(eq(feeInstallments.id, installmentId));
  await db.delete(fees).where(eq(fees.id, feeId));
  await db.delete(feeTypes).where(eq(feeTypes.id, typeId));
  if (oldSecret === undefined) delete process.env.FINANCIAL_CRON_SECRET;
  else process.env.FINANCIAL_CRON_SECRET = oldSecret;
});

describe('financial notification operational history', () => {
  it('keeps admin delivery history all-year and dry-runs old debt through cron', async () => {
    const recent = await server.fetch(new Request(`${base}/financial-notifications/recent`, {
      headers: { Authorization: `Bearer ${token}`, 'X-Academic-Year': '2026-2027' },
    }));
    expect(recent.status).toBe(200);
    const recentBody = await recent.json() as Record<string, any>;
    expect(recentBody.data.map((row: { id: string }) => row.id)).toContain(ids[0]);
    expect(recentBody.data.map((row: { id: string }) => row.id)).toContain(ids[1]);

    const denied = await server.fetch(new Request(`${base}/financial-notifications/cron/overdue`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ businessDate: '2026-09-27', dryRun: true }),
    }));
    expect(denied.status).toBe(401);
    const cron = await server.fetch(new Request(`${base}/financial-notifications/cron/overdue`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-cron-secret': cronSecret,
        'X-Academic-Year': '2026-2027' },
      body: JSON.stringify({ businessDate: '2026-09-27', dryRun: true }),
    }));
    expect(cron.status).toBe(200);
    const body = await cron.json() as Record<string, any>;
    expect(body.data.results.some((row: { payload: { academicYear: string }; status: string }) =>
      row.payload.academicYear === '2025-2026' && row.status === 'skipped')).toBe(true);
  });
});
