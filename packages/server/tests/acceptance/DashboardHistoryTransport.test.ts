import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { and, count, eq, inArray } from 'drizzle-orm';

const rawUrl = process.env.SCHOOL_HISTORY_TEST_DB_URL;
const adminPassword = process.env.SCHOOL_HISTORY_ADMIN_PASSWORD;
const principalPassword = process.env.SCHOOL_HISTORY_PRINCIPAL_PASSWORD;
if (!rawUrl || !adminPassword || !principalPassword) throw new Error('History fixture env is required');
const target = new URL(rawUrl);
if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)
  || target.pathname !== '/school_history_test') throw new Error('Expected local school_history_test');
process.env.DB_URL = rawUrl;
// A controlled business day inside 2026-2027, independent of the machine clock.
process.env.APP_BUSINESS_DATE = '2026-09-27';

const { db } = await import('../../src/database/db');
const { roles, users, students, studentEnrollments } = await import('../../src/database/schema');
const { feeTypes } = await import('../../src/modules/financial/feeTypes/feeTypeSchema');
const { fees, feeInstallments } = await import('../../src/modules/financial/fees/feeSchema');
const { payments } = await import('../../src/modules/financial/payments/paymentSchema');
const { paymentAllocations } = await import('../../src/modules/financial/allocations/allocationSchema');
const { expenses } = await import('../../src/modules/financial/expenses/expenseSchema');
const { yearScopedModules } = await import('../../src/config/yearScope');
const { server } = await import('../../src/index');

const base = 'http://school.local/api';
const port = 5525;
const suffix = crypto.randomUUID().slice(0, 8);
const id = (name: string) => `history-dashboard-rest-${name}-${suffix}`;
const OMAR = 'history-student-05';
const limited = { roleId: id('role'), userId: id('user'), email: `dashboard-${suffix}@history.example.test`,
  password: crypto.randomUUID() };
const typeId = id('type');
const feeIds = [id('old'), id('new')];
const installmentIds = [id('old-1'), id('old-2'), id('new-1'), id('new-2')];
const paymentIds = { march: id('march'), mixed: id('mixed'), today: id('today'), check: id('check') };
const expenseIds = [id('paid'), id('rejected')];
const cents = (value: number) => Math.round(value * 100);
let adminToken: string;
let principalToken: string;
let limitedToken: string;

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

async function request(path: string, token?: string, year?: string) {
  const response = await server.fetch(new Request(`${base}${path}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(year ? { 'X-Academic-Year': year } : {}),
    },
  }));
  return { status: response.status, body: await response.json() as Record<string, any> };
}

async function data(path: string, year?: string, token = adminToken) {
  const response = await request(path, token, year);
  expect(response.status, `${path} ${year} ${JSON.stringify(response.body)}`).toBe(200);
  return response.body.data;
}

// Everything the finance and admin dashboards show for one year.
async function finance(year: string) {
  return {
    kpis: await data('/dashboard/finance/kpis', year),
    trend: await data('/dashboard/finance/trend', year),
    aging: await data('/dashboard/finance/aging', year),
    overdue: await data('/dashboard/finance/overdue?limit=100', year) as Array<Record<string, any>>,
    byClass: await data('/dashboard/finance/reports/collection-by-class', year) as Array<Record<string, any>>,
    detail: await data('/dashboard/finance/reports/aging-detail', year) as Array<Record<string, any>>,
    recent: await data('/dashboard/finance/recent-payments?limit=100', year) as Array<{ paymentId: string }>,
    breakdown: await data('/dashboard/finance/reports/expense-breakdown', year) as Array<Record<string, any>>,
    today: await data('/dashboard/today', year),
  };
}

async function insertCases() {
  await db.insert(feeTypes).values({ id: typeId, name: `History dashboard transport ${suffix}`,
    category: 'tuition', amount: '100', paymentType: 'oneTime', status: 'active' });
  await db.insert(fees).values([
    { id: feeIds[0], studentId: OMAR, feeTypeId: typeId, academicYear: '2025-2026',
      effectiveDate: '2025-10-01', baseAmount: '140', grossAmount: '140', netAmount: '140' },
    { id: feeIds[1], studentId: OMAR, feeTypeId: typeId, academicYear: '2026-2027',
      effectiveDate: '2026-09-01', baseAmount: '200', grossAmount: '200', netAmount: '200' },
  ]);
  await db.insert(feeInstallments).values([
    { id: installmentIds[0], feeId: feeIds[0], number: 1, dueDate: '2026-06-01', amount: '100' },
    { id: installmentIds[1], feeId: feeIds[0], number: 2, dueDate: '2026-07-01', amount: '40',
      paidAmount: '10', status: 'cancelled' },
    { id: installmentIds[2], feeId: feeIds[1], number: 1, dueDate: '2026-09-01', amount: '100' },
    { id: installmentIds[3], feeId: feeIds[1], number: 2, dueDate: '2026-10-01', amount: '100' },
  ]);
  await db.insert(payments).values([
    { id: paymentIds.march, studentId: OMAR, amount: '25.00', paymentDate: '2026-03-15',
      paymentMethod: 'cash', status: 'completed', settledDate: '2026-03-15' },
    { id: paymentIds.mixed, studentId: OMAR, amount: '61.00', paymentDate: '2026-09-10',
      paymentMethod: 'cash', status: 'completed', settledDate: '2026-09-10' },
    { id: paymentIds.today, studentId: OMAR, amount: '7.00', paymentDate: '2026-09-27',
      paymentMethod: 'cash', status: 'completed', settledDate: '2026-09-27' },
    { id: paymentIds.check, studentId: OMAR, amount: '15.00', paymentDate: '2026-09-11',
      paymentMethod: 'check', status: 'pending', checkNumber: id('check-number'), checkDueDate: '2026-09-30' },
  ]);
  const allocate = (name: string, paymentId: string, fee: number, installment: number, amount: string) => ({
    id: id(name), paymentId, feeId: feeIds[fee], installmentId: installmentIds[installment], amount, type: 'installment',
  });
  await db.insert(paymentAllocations).values([
    allocate('a1', paymentIds.march, 0, 0, '25.00'),
    allocate('a2', paymentIds.mixed, 0, 0, '30.25'),
    allocate('a3', paymentIds.mixed, 1, 2, '20.75'),
    allocate('a4', paymentIds.mixed, 0, 1, '10.00'),
    allocate('a5', paymentIds.today, 1, 3, '7.00'),
    allocate('a6', paymentIds.check, 0, 0, '15.00'),
  ]);
  await db.insert(expenses).values([
    { id: expenseIds[0], category: 'supplies', title: 'History dashboard paid supplies', amount: '12.50',
      expenseDate: '2026-03-20', status: 'paid', paymentMethod: 'cash', paymentDate: '2026-03-20' },
    { id: expenseIds[1], category: 'supplies', title: 'History dashboard rejected supplies', amount: '99.00',
      expenseDate: '2026-03-21', status: 'rejected' },
  ]);
}

async function removeCases() {
  const receiptIds = Object.values(paymentIds);
  await db.delete(paymentAllocations).where(inArray(paymentAllocations.paymentId, receiptIds));
  await db.delete(payments).where(inArray(payments.id, receiptIds));
  await db.delete(feeInstallments).where(inArray(feeInstallments.id, installmentIds));
  await db.delete(fees).where(inArray(fees.id, feeIds));
  await db.delete(feeTypes).where(eq(feeTypes.id, typeId));
  await db.delete(expenses).where(inArray(expenses.id, expenseIds));
}

beforeAll(async () => {
  // A signed-in role outside every dashboard audience.
  await db.insert(roles).values({ id: limited.roleId, name: `history-dashboard-${suffix}` });
  await db.insert(users).values({
    id: limited.userId, name: 'History dashboard outsider', email: limited.email,
    password: await Bun.password.hash(limited.password, { algorithm: 'bcrypt', cost: 10 }),
    roleId: limited.roleId, status: 'active', emailVerified: true,
  });
  await server.listen(port);
  adminToken = await login('admin@history.example.test', adminPassword);
  principalToken = await login('principal@history.example.test', principalPassword);
  limitedToken = await login(limited.email, limited.password);
});

afterAll(async () => {
  await server.stop();
  await removeCases();
  await db.delete(users).where(eq(users.id, limited.userId));
  await db.delete(roles).where(eq(roles.id, limited.roleId));
  const [left] = await db.select({ count: count() }).from(payments).where(inArray(payments.id, Object.values(paymentIds)));
  expect(left.count).toBe(0);
});

describe('dashboards over the history fixture', () => {
  it("shows each year's finances by fee year and cash date, with today only in the year holding it", async () => {
    expect(Object.keys(yearScopedModules)).toContain('finance-dashboard');
    const before = { oldest: await finance('2024-2025'), old: await finance('2025-2026'), current: await finance('2026-2027') };
    await insertCases();
    const after = { oldest: await finance('2024-2025'), old: await finance('2025-2026'), current: await finance('2026-2027') };
    const delta = (field: (figures: typeof before.old) => number | undefined, year: 'oldest' | 'old' | 'current') =>
      cents((field(after[year]) ?? 0) - (field(before[year]) ?? 0));
    const omar = (rows: Array<Record<string, any>>) => rows.find((row) => row.studentId === OMAR);
    const classRow = (classId: string) => (figures: typeof before.old) =>
      figures.byClass.find((row) => row.classId === classId);

    // 2025-2026 does not hold today: no month or today figures, only its year.
    expect(after.old.kpis).toMatchObject({ incomeMonth: null, expensesMonth: null, netBalance: null });
    expect(after.old.trend).toMatchObject({ today: null, todayIncome: null, todayExpenses: null });
    expect(after.old.today).toMatchObject({ attendance: null, income: null, expenses: null, events: null });
    expect(after.old.today.overdueFees.overdueCount - before.old.today.overdueFees.overdueCount).toBe(1);
    expect(delta((f) => f.kpis.incomeYear, 'old')).toBe(2500);
    expect(delta((f) => f.kpis.expensesYear, 'old')).toBe(1250);
    expect(delta((f) => f.aging.d60plus, 'old')).toBe(4475);
    expect(omar(after.old.overdue)).toMatchObject({ totalOverdue: 44.75, oldestDueDate: '2026-06-01', daysOverdue: 118 });
    expect(omar(after.old.detail)).toMatchObject({
      total: 44.75, d60plus: 44.75, classId: 'history-class-2025', className: 'History 2025-2026',
    });
    expect(delta((f) => classRow('history-class-2025')(f)?.due, 'old')).toBe(10000);
    expect(delta((f) => classRow('history-class-2025')(f)?.paid, 'old')).toBe(5525);
    expect(delta((f) => f.breakdown.find((row) => row.category === 'supplies')?.total, 'old')).toBe(1250);
    expect(delta((f) => f.trend.monthly.find((row: { month: string }) => row.month === '2026-03')?.income, 'old')).toBe(2500);
    const oldRecent = after.old.recent.map((row) => row.paymentId);
    expect(oldRecent).toContain(paymentIds.march);
    for (const other of [paymentIds.mixed, paymentIds.today, paymentIds.check]) expect(oldRecent).not.toContain(other);

    // 2026-2027 holds today: this month's and today's cash, today's snapshot.
    expect(delta((f) => f.kpis.incomeMonth, 'current')).toBe(6800);
    expect(delta((f) => f.kpis.incomeYear, 'current')).toBe(6800);
    expect(delta((f) => f.kpis.expensesMonth, 'current')).toBe(0);
    expect(delta((f) => f.trend.todayIncome, 'current')).toBe(700);
    expect(delta((f) => f.trend.today, 'current')).toBe(700);
    expect(delta((f) => f.today.income.total, 'current')).toBe(700);
    expect(after.current.today.income.count - before.current.today.income.count).toBe(1);
    expect(after.current.today.attendance).toEqual(expect.objectContaining({
      students: expect.any(Array), staff: expect.any(Array),
    }));
    expect(delta((f) => f.aging.d1_30, 'current')).toBe(7925);
    expect(delta((f) => f.aging.current, 'current')).toBe(9300);
    expect(omar(after.current.overdue)).toMatchObject({ totalOverdue: 79.25, oldestDueDate: '2026-09-01', daysOverdue: 26 });
    expect(delta((f) => classRow('history-class-2026')(f)?.due, 'current')).toBe(10000);
    expect(delta((f) => classRow('history-class-2026')(f)?.paid, 'current')).toBe(2075);
    const currentRecent = after.current.recent.map((row) => row.paymentId);
    expect(currentRecent.indexOf(paymentIds.today)).toBeGreaterThanOrEqual(0);
    expect(currentRecent.indexOf(paymentIds.today)).toBeLessThan(currentRecent.indexOf(paymentIds.mixed));
    for (const other of [paymentIds.march, paymentIds.check]) expect(currentRecent).not.toContain(other);

    // The collection rate reads the same installments as the class report.
    for (const year of ['old', 'current'] as const) {
      const due = after[year].byClass.reduce((sum, row) => sum + row.due, 0);
      const paid = after[year].byClass.reduce((sum, row) => sum + row.paid, 0);
      expect(after[year].kpis.collectionRateYTD).toBeCloseTo(due > 0 ? (paid / due) * 100 : 0, 6);
    }

    // 2024-2025 sees none of it.
    for (const field of ['kpis', 'aging', 'byClass', 'recent', 'breakdown'] as const) {
      expect(after.oldest[field]).toEqual(before.oldest[field]);
    }
  });

  it('counts enrolled students by year and keeps each dashboard to its audience', async () => {
    const studentsCard = (widgets: Array<{ icon: string; value: number }>) =>
      widgets.find((widget) => widget.icon === 'studentImage')?.value;
    expect(studentsCard(await data('/dashboard/widgets', '2024-2025'))).toBe(7);
    expect(studentsCard(await data('/dashboard/widgets', '2025-2026'))).toBe(8);
    expect(studentsCard(await data('/dashboard/widgets', '2026-2027'))).toBe(8);
    expect(studentsCard(await data('/dashboard/widgets'))).toBe(8);
    // The principal's finance cards used to receive no figures at all.
    expect(studentsCard(await data('/dashboard/widgets', '2025-2026', principalToken))).toBe(8);

    for (const [label, yearId] of [['2024-2025', 'history-year-2024'], ['2025-2026', 'history-year-2025']]) {
      const [expected] = await db.select({ count: count() }).from(studentEnrollments)
        .innerJoin(students, eq(studentEnrollments.studentId, students.id))
        .where(and(eq(studentEnrollments.academicYearId, yearId), inArray(students.gender, ['M', 'F'])));
      const chart = await data('/dashboard/students-by-gender', label) as Array<{ value: number }>;
      expect(chart.reduce((sum, slice) => sum + slice.value, 0)).toBe(expected.count);
    }

    const academicOld = await data('/dashboard/academic/kpis', '2024-2025');
    expect(academicOld).toMatchObject({ totalStudents: 7, attendanceRate: null });
    expect((await data('/dashboard/academic/kpis', '2026-2027', principalToken)).totalStudents).toBe(8);
    expect((await data('/dashboard/operations/kpis', '2024-2025')).activeEventsToday).toBeNull();
    expect(typeof (await data('/dashboard/operations/kpis', '2026-2027')).activeEventsToday).toBe('number');

    const monthlyOld = await data('/dashboard/attendance/students-monthly', '2025-2026');
    expect(monthlyOld.monthly.map((row: { month: string }) => row.month)).toHaveLength(12);
    expect(monthlyOld.monthly[0].month).toBe('2025-09');
    expect(monthlyOld.today).toBeNull();
    expect(typeof (await data('/dashboard/attendance/staff-monthly', '2026-2027')).today).toBe('number');

    for (const path of ['/dashboard/widgets', '/dashboard/finance/kpis', '/dashboard/academic/kpis',
      '/dashboard/today', '/dashboard/students-by-gender']) {
      expect((await request(path, limitedToken)).status, path).toBe(401);
    }
    expect((await request('/dashboard/finance/kpis')).status).toBe(401);

    expect((await request('/dashboard/finance/kpis', adminToken, 'twenty')).status).toBe(400);
    expect((await request('/dashboard/finance/kpis?academicYear=2024-2025', adminToken, '2025-2026')).status).toBe(400);
    expect((await request('/dashboard/finance/kpis', adminToken, '2019-2020')).status).toBe(404);
  });

  it('gives MCP the same year selection, once per tool', async () => {
    const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
    const { StreamableHTTPClientTransport } = await import('@modelcontextprotocol/sdk/client/streamableHttp.js');
    const call = async (name: string, headerYear?: string, toolYear?: string) => {
      const client = new Client({ name: 'school-dashboard-history-test', version: '1.0.0' });
      const transport = new StreamableHTTPClientTransport(new URL(`http://localhost:${port}/api/mcp`), {
        requestInit: { headers: { Authorization: `Bearer ${adminToken}`,
          ...(headerYear ? { 'X-Academic-Year': headerYear } : {}) } },
      });
      await client.connect(transport);
      try {
        const tools = await client.listTools();
        const financeTools = tools.tools.filter((tool) => tool.name.startsWith('finance-dashboard_'));
        expect(financeTools).toHaveLength(8);
        for (const tool of financeTools) expect(tool.inputSchema.properties).toHaveProperty('academicYear');
        const result = await client.callTool({ name, arguments: toolYear ? { academicYear: toolYear } : {} });
        return result as { content: Array<{ text: string }>; isError?: boolean };
      } finally { await transport.close(); }
    };
    const [byInput, byHeader, snapshot, conflict] = await Promise.all([
      call('finance-dashboard_get_kpis', undefined, '2025-2026'),
      call('finance-dashboard_get_kpis', '2026-2027'),
      call('dashboard_get_today_snapshot', undefined, '2024-2025'),
      call('finance-dashboard_get_kpis', '2025-2026', '2026-2027'),
    ]);
    for (const result of [byInput, byHeader, snapshot]) expect(result.isError).not.toBe(true);
    expect(JSON.parse(byInput.content[0].text).incomeMonth).toBeNull();
    expect(typeof JSON.parse(byHeader.content[0].text).incomeMonth).toBe('number');
    expect(JSON.parse(snapshot.content[0].text)).toMatchObject({ income: null, attendance: null, events: null });
    expect(conflict.isError).toBe(true);
  });
});
