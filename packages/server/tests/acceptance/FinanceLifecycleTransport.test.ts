import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { and, eq, inArray } from 'drizzle-orm';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const rawUrl = process.env.SCHOOL_HISTORY_TEST_DB_URL;
const adminPassword = process.env.SCHOOL_HISTORY_ADMIN_PASSWORD;
if (!rawUrl || !adminPassword) throw new Error('History fixture env is required');
const target = new URL(rawUrl);
if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)
  || target.pathname !== '/school_history_test') throw new Error('Expected local school_history_test');
process.env.DB_URL = rawUrl;

const { db } = await import('../../src/database/db');
const { users, roles } = await import('../../src/database/schema');
const { feeTypes } = await import('../../src/modules/financial/feeTypes/feeTypeSchema');
const { fees, feeInstallments } = await import('../../src/modules/financial/fees/feeSchema');
const { payments } = await import('../../src/modules/financial/payments/paymentSchema');
const { paymentAllocations } = await import('../../src/modules/financial/allocations/allocationSchema');
const { studentCreditLots, studentCreditApplications } = await import('../../src/modules/financial/credits/creditSchema');
const { financialAuditLogs } = await import('../../src/modules/financial/auditLog/auditLogSchema');
const { expenses } = await import('../../src/modules/financial/expenses/expenseSchema');
const { payslips } = await import('../../src/modules/financial/payroll/payrollSchema');
const { staff } = await import('../../src/modules/staff/staffSchema');
const { server } = await import('../../src/index');

const suffix = crypto.randomUUID().slice(0, 8);
const port = 5533;
const base = `http://localhost:${port}/api`;
const studentId = 'history-student-01';
const year = '2026-2027';
const actorId = `finance-accountant-${suffix}`;
const outsiderId = `finance-outsider-${suffix}`;
const roleId = `finance-accounting-role-${suffix}`;
const staffId = `finance-staff-${suffix}`;
const typeIds: string[] = [];
const feeIds: string[] = [];
const paymentIds: string[] = [];
const expenseIds: string[] = [];
const payslipIds: string[] = [];
let adminToken: string;
let accountingToken: string;
let outsiderToken: string;
let client: Client;
let transport: StreamableHTTPClientTransport;

async function request(path: string, method = 'GET', json?: unknown, token: string | null = accountingToken) {
  const response = await fetch(`${base}${path}`, {
    method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'X-Academic-Year': year, 'X-Language': 'en',
      ...(json !== undefined ? { 'content-type': 'application/json' } : {}) },
    ...(json !== undefined ? { body: JSON.stringify(json) } : {}),
  });
  return { status: response.status, body: await response.json() as Record<string, any> };
}

async function login(email: string, password: string) {
  const response = await request('/auth/login', 'POST', { email, password }, null);
  expect(response.status, JSON.stringify(response.body)).toBe(200);
  const token = response.body.data?.accessToken ?? response.body.accessToken ?? response.body.data?.tokens?.accessToken;
  expect(typeof token).toBe('string');
  return token as string;
}

async function newFee(amount = 100, recurring = false) {
  const typeId = `finance-type-${crypto.randomUUID()}`;
  typeIds.push(typeId);
  await db.insert(feeTypes).values({ id: typeId, name: `Scolarite ${typeId}`, category: 'tuition',
    amount: String(amount), paymentType: recurring ? 'recurring' : 'oneTime', status: 'active' });
  // Inspect the registry in beforeAll, then exercise the actual MCP write.
  const result = await client.callTool({ name: 'fees_create', arguments: {
    studentId, feeTypeId: typeId, schedule: recurring ? 'monthly' : 'oneTime',
    academicYear: year, effectiveDate: '2026-09-01', ...(recurring ? { discountAmount: 10 } : {}),
  } }) as { content: Array<{ text: string }>; isError?: boolean };
  expect(result.isError, JSON.stringify(result.content)).not.toBe(true);
  const fee = JSON.parse(result.content[0].text) as { id: string; netAmount: string; discountAmount: string };
  feeIds.push(fee.id);
  const installments = await db.select().from(feeInstallments).where(eq(feeInstallments.feeId, fee.id));
  return { fee, installments };
}

async function record(feeId: string, amount: number, extra: Record<string, unknown> = {}) {
  const response = await request('/payments', 'POST', { studentId, amount,
    paymentMethod: 'cash', paymentDate: '2026-10-03', allocations: [{ feeId, number: 1, amount }], ...extra });
  if (response.status === 200 && response.body.data?.id) paymentIds.push(response.body.data.id);
  return response;
}

async function storedFee(id: string) {
  return (await db.select().from(fees).where(eq(fees.id, id)))[0];
}

async function newExpense() {
  const response = await request('/expenses', 'POST', {
    category: 'supplies', title: `Fournitures ${suffix}`, amount: 100, expenseDate: '2026-10-03',
  });
  expect(response.status, JSON.stringify(response.body)).toBe(200);
  expenseIds.push(response.body.data.id);
  return response.body.data.id as string;
}

beforeAll(async () => {
  const marker = await db.execute<{ id: string }>('select id from school_history_fixture_marker');
  expect(marker[0]?.id).toBe('academic-history-alerts-v1');
  const password = `Fixture-${crypto.randomUUID()}-A1!`;
  const hash = await Bun.password.hash(password, { algorithm: 'bcrypt', cost: 10 });
  await db.insert(roles).values({ id: roleId, name: 'accounting' });
  await db.insert(users).values([
    { id: actorId, name: 'Youssef Bennani', email: `${actorId}@example.test`, password: hash,
      roleId, status: 'active', emailVerified: true },
    { id: outsiderId, name: 'Salma Idrissi', email: `${outsiderId}@example.test`, password: hash,
      status: 'active', emailVerified: true },
  ]);
  await db.insert(staff).values({ id: staffId, employeeCode: staffId, name: 'Nadia El Mansouri',
    role: 'teacher', hireDate: '2024-09-01', salary: '100' });
  await server.listen(port);
  adminToken = await login('admin@history.example.test', adminPassword);
  accountingToken = await login(`${actorId}@example.test`, password);
  outsiderToken = await login(`${outsiderId}@example.test`, password);
  client = new Client({ name: 'school-finance-lifecycle', version: '1.0.0' });
  transport = new StreamableHTTPClientTransport(new URL(`${base}/mcp`), {
    requestInit: { headers: { Authorization: `Bearer ${accountingToken}` } },
  });
  await client.connect(transport);
  const registry = await client.listTools();
  expect(registry.tools.find(tool => tool.name === 'fees_create')?.inputSchema.properties)
    .toHaveProperty('academicYear');
});

afterAll(async () => {
  if (transport) await transport.close();
  await server.stop();
  // Delete only this run's synthetic fixture rows; never touch the school DB.
  if (paymentIds.length) {
    const lots = await db.select({ id: studentCreditLots.id }).from(studentCreditLots)
      .where(inArray(studentCreditLots.sourcePaymentId, paymentIds));
    if (lots.length) await db.delete(studentCreditApplications)
      .where(inArray(studentCreditApplications.creditLotId, lots.map(lot => lot.id)));
    await db.delete(paymentAllocations).where(inArray(paymentAllocations.paymentId, paymentIds));
    await db.delete(studentCreditLots).where(inArray(studentCreditLots.sourcePaymentId, paymentIds));
    await db.delete(payments).where(inArray(payments.id, paymentIds));
  }
  if (feeIds.length) {
    await db.delete(feeInstallments).where(inArray(feeInstallments.feeId, feeIds));
    await db.delete(fees).where(inArray(fees.id, feeIds));
  }
  if (typeIds.length) await db.delete(feeTypes).where(inArray(feeTypes.id, typeIds));
  if (expenseIds.length) await db.delete(expenses).where(inArray(expenses.id, expenseIds));
  if (payslipIds.length) await db.delete(payslips).where(inArray(payslips.id, payslipIds));
  await db.delete(staff).where(eq(staff.id, staffId));
  await db.delete(financialAuditLogs).where(eq(financialAuditLogs.actorId, actorId));
  if (payslipIds.length) await db.delete(financialAuditLogs).where(inArray(financialAuditLogs.entityId, payslipIds));
  await db.delete(users).where(inArray(users.id, [actorId, outsiderId]));
  await db.delete(roles).where(eq(roles.id, roleId));
});

describe('real PostgreSQL finance lifecycle over authenticated HTTP and MCP', () => {
  it('denies finance reads and writes to anonymous and roleless accounts', async () => {
    for (const token of [null, outsiderToken]) {
      for (const path of ['/payments', '/fees', '/expenses', '/student-credits/student/history-student-01']) {
        expect([401, 403]).toContain((await request(path, 'GET', undefined, token)).status);
      }
      expect([401, 403]).toContain((await request('/payments', 'POST', {}, token)).status);
    }
  });

  it('preserves a monthly discount and installment cents on an ordinary MCP edit', async () => {
    const { fee, installments } = await newFee(100, true);
    expect(Number(fee.netAmount)).toBe(900);
    expect(Number(fee.discountAmount)).toBe(100);
    expect(installments).toHaveLength(10);
    const result = await client.callTool({ name: 'fees_update', arguments: {
      id: fee.id, academicYear: year, baseAmount: 100,
    } }) as { isError?: boolean; content: Array<{ text: string }> };
    expect(result.isError, JSON.stringify(result.content)).not.toBe(true);
    const after = await storedFee(fee.id);
    expect(Number(after.netAmount)).toBe(900);
    expect(Number(after.discountAmount)).toBe(100);
    expect((await db.select().from(feeInstallments).where(eq(feeInstallments.feeId, fee.id)))
      .reduce((sum, row) => sum + Math.round(Number(row.amount) * 100), 0)).toBe(90000);
  });

  it('records partial cash, replays idempotently, refuses changed payload and refunds without deleting history', async () => {
    const { fee } = await newFee();
    const idempotencyKey = crypto.randomUUID();
    const paid = await record(fee.id, 40, { idempotencyKey });
    expect(paid.status, JSON.stringify(paid.body)).toBe(200);
    const id = paid.body.data.id;
    expect(await storedFee(fee.id)).toMatchObject({ paidAmount: '40.00' });
    const replay = await record(fee.id, 40, { idempotencyKey });
    expect(replay.status).toBe(200);
    expect(replay.body.data.id).toBe(id);
    expect((await record(fee.id, 41, { idempotencyKey })).status).toBe(409);
    expect((await db.select().from(paymentAllocations).where(eq(paymentAllocations.paymentId, id)))).toHaveLength(1);
    expect((await request(`/payments/${id}/refund`, 'POST', { reason: 'Fixture reversal' })).status).toBe(200);
    expect(await storedFee(fee.id)).toMatchObject({ paidAmount: '0.00' });
    expect((await db.select().from(payments).where(eq(payments.id, id)))[0].status).toBe('refunded');
    expect((await db.select().from(paymentAllocations).where(eq(paymentAllocations.paymentId, id)))).toHaveLength(1);
    expect((await request(`/payments/${id}/refund`, 'POST', {})).status).toBe(400);
    const audit = await db.select().from(financialAuditLogs).where(eq(financialAuditLogs.entityId, id));
    expect(audit.filter(row => row.action === 'payment.completed')).toHaveLength(1);
    expect(audit.filter(row => row.action === 'payment.refunded')).toHaveLength(1);
    expect(audit.every(row => row.actorId === actorId)).toBe(true);
  });

  it('rolls back an underallocated receipt and refuses another student or a cancelled installment', async () => {
    const { fee, installments } = await newFee();
    const key = crypto.randomUUID();
    expect((await record(fee.id, 60, { idempotencyKey: key,
      allocations: [{ feeId: fee.id, number: 1, amount: 40 }] })).status).toBe(400);
    expect(await db.select().from(payments).where(eq(payments.idempotencyKey, key))).toHaveLength(0);
    expect(await db.select().from(paymentAllocations).where(eq(paymentAllocations.feeId, fee.id))).toHaveLength(0);
    expect((await record(fee.id, 10, { studentId: 'history-student-02' })).status).toBe(400);
    await db.update(feeInstallments).set({ status: 'cancelled' }).where(eq(feeInstallments.id, installments[0].id));
    expect((await record(fee.id, 10)).status).toBe(409);
    expect(await storedFee(fee.id)).toMatchObject({ paidAmount: '0.00' });
  });

  it('serializes competing cash allocations without overpaying an installment', async () => {
    const first = await newFee();
    const race = await Promise.all([record(first.fee.id, 80), record(first.fee.id, 80)]);
    expect(race.map(result => result.status).sort()).toEqual([200, 400]);
    expect(await storedFee(first.fee.id)).toMatchObject({ paidAmount: '80.00' });
    expect(await db.select().from(paymentAllocations).where(eq(paymentAllocations.feeId, first.fee.id))).toHaveLength(1);
  });

  it('reserves a pending check, settles after deposit, and releases the balance on bounce', async () => {
    const { fee } = await newFee();
    const check = await record(fee.id, 100, { paymentMethod: 'check', checkNumber: suffix,
      checkDueDate: '2026-10-15' });
    expect(check.status, JSON.stringify(check.body)).toBe(200);
    const id = check.body.data.id;
    expect(check.body.data.status).toBe('pending');
    expect(await storedFee(fee.id)).toMatchObject({ paidAmount: '0.00' });
    expect((await record(fee.id, 1)).status).toBe(400);
    expect((await request(`/payments/${id}/check-status`, 'POST', { status: 'completed' })).status).toBe(409);
    expect((await request(`/payments/${id}/check-status`, 'POST', { status: 'deposited' })).status).toBe(200);
    expect((await request(`/payments/${id}/check-status`, 'POST', { status: 'completed', settledDate: '2026-10-15' })).status).toBe(200);
    expect(await storedFee(fee.id)).toMatchObject({ paidAmount: '100.00', status: 'paid' });
    expect((await request(`/payments/${id}/check-status`, 'POST', { status: 'bounced', reason: 'Fixture bounce' })).status).toBe(200);
    expect(await storedFee(fee.id)).toMatchObject({ paidAmount: '0.00' });
    expect((await record(fee.id, 100)).status).toBe(200);
  });

  it('applies overpayment credit and reverses all its allocations on source refund', async () => {
    const { fee } = await newFee();
    const paid = await record(fee.id, 150, { allocations: [{ feeId: fee.id, number: 1, amount: 100 }],
      keepRemainderAsCredit: true });
    expect(paid.status, JSON.stringify(paid.body)).toBe(200);
    const id = paid.body.data.id;
    const lot = (await db.select().from(studentCreditLots).where(eq(studentCreditLots.sourcePaymentId, id)))[0];
    expect(lot).toMatchObject({ remainingAmount: '50.00', status: 'available' });
    const applied = await request('/student-credits/apply', 'POST', { studentId, amount: 30 });
    expect(applied.status, JSON.stringify(applied.body)).toBe(200);
    expect((await db.select().from(studentCreditLots).where(eq(studentCreditLots.id, lot.id)))[0].remainingAmount).toBe('20.00');
    expect((await request(`/payments/${id}/refund`, 'POST', { reason: 'Fixture reversal' })).status).toBe(200);
    expect((await db.select().from(studentCreditLots).where(eq(studentCreditLots.id, lot.id)))[0].status).toBe('cancelled');
    const applications = await db.select().from(studentCreditApplications).where(eq(studentCreditApplications.creditLotId, lot.id));
    expect(applications.length).toBeGreaterThan(0);
    expect(applications.every(application => application.status === 'reversed')).toBe(true);
    expect(await storedFee(fee.id)).toMatchObject({ paidAmount: '0.00' });
  });

  it('requires expense approval and a valid cash date before recording payment', async () => {
    const id = await newExpense();
    expect((await request(`/expenses/${id}/payment`, 'POST', { paymentMethod: 'cash', paymentDate: '2026-10-03' })).status).toBe(400);
    expect((await request(`/expenses/${id}/approve`, 'POST', { action: 'approve' })).status).toBe(200);
    expect((await request(`/expenses/${id}/payment`, 'POST', { paymentMethod: 'cash', paymentDate: '2026-10-02' })).status).toBe(400);
    expect((await request(`/expenses/${id}/payment`, 'POST', { paymentMethod: 'cash', paymentDate: '2026-10-03' })).status).toBe(200);
    expect((await request(`/expenses/${id}/payment`, 'POST', { paymentMethod: 'cash', paymentDate: '2026-10-03' })).status).toBe(400);
    expect((await db.select().from(expenses).where(eq(expenses.id, id)))[0]).toMatchObject({ status: 'paid', paidBy: actorId });
  });

  it('pays a staff snapshot once and undoes payment without deleting the payslip', async () => {
    const data = { staffId, period: '2026-11', paymentMethod: 'bankTransfer', paymentDate: '2026-11-01' };
    const paid = await request('/payroll/pay-staff', 'POST', data, adminToken);
    expect(paid.status, JSON.stringify(paid.body)).toBe(200);
    const id = paid.body.data.id;
    payslipIds.push(id);
    expect(paid.body.data).toMatchObject({ baseSalary: '100.00', netAmount: '100.00', status: 'paid' });
    expect((await request('/payroll/pay-staff', 'POST', data, adminToken)).status).toBe(400);
    expect((await request('/payroll/unpay-staff', 'POST', { staffId, period: data.period }, adminToken)).status).toBe(200);
    expect((await db.select().from(payslips).where(eq(payslips.id, id)))[0])
      .toMatchObject({ status: 'pending', netAmount: '100.00', paymentDate: null, transactionRef: null });
  });
});

// These are ordinary assertions, deliberately exposing defects found in the
// review. They must pass after the production fix; do not convert them to skips.
describe('finance review regression cases', () => {
  it('replays concurrent identical idempotency keys without returning a server error', async () => {
    const { fee } = await newFee();
    const key = crypto.randomUUID();
    const repeat = await Promise.all([record(fee.id, 50, { idempotencyKey: key }),
      record(fee.id, 50, { idempotencyKey: key })]);
    // The database must retain exactly one receipt even if transport replay fails.
    expect(await db.select().from(payments).where(eq(payments.idempotencyKey, key))).toHaveLength(1);
    expect(await storedFee(fee.id)).toMatchObject({ paidAmount: '50.00' });
    expect(repeat.map(result => result.status), JSON.stringify(repeat)).toEqual([200, 200]);
    expect(repeat[0].body.data.id).toBe(repeat[1].body.data.id);
  });

  it('rejects sub-cent money with a client validation error and no writes', async () => {
    const { fee } = await newFee();
    const response = await record(fee.id, 0.001);
    expect(await db.select().from(paymentAllocations).where(eq(paymentAllocations.feeId, fee.id))).toHaveLength(0);
    expect([400, 422], JSON.stringify(response)).toContain(response.status);
  });

  it('refuses deductions exceeding gross salary', async () => {
    const id = `finance-payslip-${suffix}`;
    payslipIds.push(id);
    await db.insert(payslips).values({ id, staffId, staffName: 'Nadia El Mansouri', staffRole: 'teacher',
      period: '2026-10', baseSalary: '100', grossAmount: '100', netAmount: '100' });
    const response = await request(`/payroll/${id}`, 'PUT', { totalDeductions: 150 }, adminToken);
    expect([400, 409, 422], JSON.stringify(response.body)).toContain(response.status);
    expect((await db.select().from(payslips).where(eq(payslips.id, id)))[0].netAmount).toBe('100.00');
  });

  it('validates an expense payment date against the stored date on a partial edit', async () => {
    const id = await newExpense();
    const response = await request(`/expenses/${id}`, 'PUT', { paymentDate: '2026-10-02' });
    expect([400, 409, 422], JSON.stringify(response.body)).toContain(response.status);
    expect((await db.select().from(expenses).where(eq(expenses.id, id)))[0].paymentDate).toBeNull();
  });

  it('refuses marking an expense paid through the generic edit without approval or payment metadata', async () => {
    const id = await newExpense();
    const response = await request(`/expenses/${id}`, 'PUT', { status: 'paid' });
    expect([400, 409, 422], JSON.stringify(response.body)).toContain(response.status);
    expect((await db.select().from(expenses).where(eq(expenses.id, id)))[0].status).toBe('pending');
    expect(await db.select().from(financialAuditLogs).where(and(eq(financialAuditLogs.entityId, id),
      eq(financialAuditLogs.action, 'expense.paid')))).toHaveLength(0);
  });
});
