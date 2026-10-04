import { describe, expect, it } from 'bun:test';
import { drizzle } from 'drizzle-orm/pg-proxy';
import { FinanceDashboardRepository } from '../../src/modules/dashboard/finance/FinanceDashboardRepository';
import { FinanceDashboardService } from '../../src/modules/dashboard/finance/FinanceDashboardService';
import { getBusinessDateOnly } from '../../src/shared/businessDate';

type Statement = { sql: string; params: unknown[] };

// A registered calendar that differs from the September–August default, so a
// read that still derived its window from the label would miss it.
const customYear = { id: 'year-old', label: '2019-2020', reportingStartsOn: '2019-08-15', reportingEndsOn: '2020-07-31' };
// Holds any date this suite can run on, so "today" always falls inside it.
const yearHoldingToday = { id: 'year-now', label: '2000-2001', reportingStartsOn: '2000-01-01', reportingEndsOn: '2999-12-31' };

// Outside a request the @Year() getter is not installed; give the instance
// the year a request scope would resolve.
function inYear<T extends object>(instance: T, year: object): T {
  Object.defineProperty(instance, 'year', { value: year, configurable: true });
  return instance;
}

function recordingRepository(rowsFor: (sql: string) => unknown[][] = () => [], year: object = customYear) {
  const statements: Statement[] = [];
  const repo: any = inYear(new FinanceDashboardRepository(), year);
  repo.db = drizzle(async (sql, params) => {
    statements.push({ sql, params });
    return { rows: rowsFor(sql) };
  });
  return { repo, statements };
}

function financeService(repo: Record<string, unknown>, year: object, extra: {
  settings?: Record<string, unknown>;
  enrollments?: Record<string, unknown>;
} = {}) {
  return inYear(new FinanceDashboardService(
    repo as any,
    (extra.settings ?? {}) as any,
    (extra.enrollments ?? {}) as any,
  ), year);
}

const table = (statement: Statement) => statement.sql.match(/from "(\w+)"/)?.[1];

describe('cash over a date range', () => {
  it('counts completed receipts, paid expenses and paid payroll', async () => {
    const { repo, statements } = recordingRepository((sql) => {
      if (sql.includes('"payments"')) return [['1000.50']];
      if (sql.includes('"expenses"')) return [['200']];
      if (sql.includes('"payslips"')) return [['100']];
      return [];
    });
    expect(await repo.getCashTotals('2019-08-15', '2020-07-31')).toEqual({ income: 1000.5, expenses: 300 });
    expect(statements.map(table)).toEqual(['payments', 'expenses', 'payslips']);
    for (const statement of statements) {
      expect(statement.params).toEqual(expect.arrayContaining(['2019-08-15', '2020-07-31']));
    }
    const [receipts, spent, payroll] = statements;
    expect(receipts.sql).toContain('COALESCE("payments"."settled_date", "payments"."payment_date") >= $');
    expect(receipts.params).toContain('completed');
    // Rejected, cancelled and unpaid expenses were never spent.
    expect(spent.sql).toContain('"expenses"."status" = $');
    expect(spent.params).toContain('paid');
    expect(payroll.params).toContain('paid');
  });
});

describe('finance KPIs for the selected year', () => {
  function kpiService(year: object) {
    const ranges: Array<[string, string]> = [];
    const service = financeService({
      getCashTotals: async (from: string, to: string) => {
        ranges.push([from, to]);
        return from === (year as typeof customYear).reportingStartsOn
          ? { income: 1000.5, expenses: 300 }
          : { income: 40, expenses: 10 };
      },
      getCollectionTotals: async () => ({ due: 200, paid: 50 }),
    }, year);
    return { service, ranges };
  }

  it('reports the whole year cash and no month in a year that does not hold today', async () => {
    const { service, ranges } = kpiService(customYear);
    expect(await service.getKpis()).toEqual({
      incomeMonth: null,
      expensesMonth: null,
      netBalance: null,
      collectionRateYTD: 25,
      incomeYear: 1000.5,
      expensesYear: 300,
      netBalanceYear: 700.5,
    });
    expect(ranges).toEqual([['2019-08-15', '2020-07-31']]);
  });

  it("adds today's calendar month in the year holding today", async () => {
    const { service, ranges } = kpiService(yearHoldingToday);
    const kpis = await service.getKpis();
    const today = getBusinessDateOnly();
    const [calendarYear, month] = today.split('-').map(Number);
    const lastDay = String(new Date(Date.UTC(calendarYear, month, 0)).getUTCDate()).padStart(2, '0');
    expect(ranges).toEqual([
      ['2000-01-01', '2999-12-31'],
      [`${today.slice(0, 7)}-01`, `${today.slice(0, 7)}-${lastDay}`],
    ]);
    expect(kpis).toMatchObject({ incomeMonth: 40, expensesMonth: 10, netBalance: 30, incomeYear: 1000.5 });
  });

  it('keeps "this month" inside the reporting interval when the year starts mid-month', async () => {
    const today = getBusinessDateOnly();
    const startingToday = { ...yearHoldingToday, reportingStartsOn: today };
    const { service, ranges } = kpiService(startingToday);
    await service.getKpis();
    expect(ranges[1][0]).toBe(today);
  });
});

describe('finance trend for the selected year', () => {
  it('charts one month per month of the reporting interval', async () => {
    const { repo, statements } = recordingRepository((sql) => (
      sql.includes('"payments"') && sql.includes('TO_CHAR') ? [['2019-08', '50']] : []
    ));
    const monthly = await repo.getMonthlyCash();
    expect(monthly.map((m: { month: string }) => m.month)).toEqual([
      '2019-08', '2019-09', '2019-10', '2019-11', '2019-12', '2020-01',
      '2020-02', '2020-03', '2020-04', '2020-05', '2020-06', '2020-07',
    ]);
    expect(monthly[0]).toEqual({ month: '2019-08', income: 50, expenses: 0 });
    expect(statements).toHaveLength(3);
    for (const statement of statements) {
      expect(statement.params).toEqual(expect.arrayContaining(['2019-08-15', '2020-07-31']));
    }
    expect(statements.find((s) => table(s) === 'expenses')?.params).toContain('paid');
  });

  it("adds today's cash only in the year holding today", async () => {
    const calls: Array<[string, string]> = [];
    const repo = {
      getMonthlyCash: async () => ['m'],
      getCashTotals: async (from: string, to: string) => { calls.push([from, to]); return { income: 7, expenses: 2 }; },
    };
    expect<unknown>(await financeService(repo, customYear).getTrend()).toEqual({
      monthly: ['m'], today: null, todayIncome: null, todayExpenses: null,
    });
    expect(calls).toEqual([]);

    const today = getBusinessDateOnly();
    expect<unknown>(await financeService(repo, yearHoldingToday).getTrend()).toEqual({
      monthly: ['m'], today: 5, todayIncome: 7, todayExpenses: 2,
    });
    expect(calls).toEqual([[today, today]]);
  });

  it('breaks paid expenses down over the same dates', async () => {
    const { repo, statements } = recordingRepository();
    await repo.getExpenseBreakdown();
    expect(statements).toHaveLength(2);
    for (const statement of statements) {
      expect(statement.params).toEqual(expect.arrayContaining(['2019-08-15', '2020-07-31', 'paid']));
    }
  });

  it('lists recent receipts by cash date inside the selected year', async () => {
    const { repo, statements } = recordingRepository();
    await repo.getRecentPayments(6);
    const [statement] = statements;
    expect(statement.sql).toContain('COALESCE("payments"."settled_date", "payments"."payment_date") >= $');
    expect(statement.sql).toContain('order by COALESCE("payments"."settled_date", "payments"."payment_date") desc');
    expect(statement.params).toEqual(expect.arrayContaining(['completed', '2019-08-15', '2020-07-31', 6]));
  });
});

describe('fee-year balances and collection', () => {
  it('reads balances and collection from completed allocations on uncancelled installments', async () => {
    const { repo, statements } = recordingRepository();
    await repo.getAging();
    await repo.getOverdue(6);
    await repo.getAgingDetail();
    await repo.getCollectionTotals();
    await repo.getCollectionByClass(false);

    expect(statements).toHaveLength(5);
    for (const statement of statements) {
      expect(statement.sql).toContain('"fees"."academic_year" = $');
      expect(statement.sql).toContain('"payments"."status" = $');
      expect(statement.sql).toContain('"payment_allocations"."installment_id"');
      expect(statement.sql).toContain('"fee_installments"."status" <> $');
      expect(statement.sql).toContain('GREATEST(');
      expect(statement.sql).not.toContain('"fee_installments"."paid_amount"');
      expect(statement.params).toEqual(expect.arrayContaining(['2019-2020', 'completed', 'cancelled']));
    }
    // Only a class of this year's placements; no current class for another year.
    for (const statement of statements) expect(statement.sql).not.toContain('"students"."class_id"');
  });

  it('counts collection over installments due by today', async () => {
    const { repo, statements } = recordingRepository(() => [['300', '120.5']]);
    expect(await repo.getCollectionTotals()).toEqual({ due: 300, paid: 120.5 });
    expect(statements[0].sql).toContain('"year_installments"."due_date" <= $');
    expect(statements[0].params).toContain(getBusinessDateOnly());
  });

  it('returns the student code and counts days overdue from the business date', async () => {
    const today = getBusinessDateOnly();
    const tenDaysBefore = new Date(Date.parse(today) - 10 * 86_400_000).toISOString().slice(0, 10);
    const { repo } = recordingRepository(() => [['s1', 'Salma', 'ST-001', null, 'F', '44.75', tenDaysBefore]]);
    expect(await repo.getOverdue(6)).toEqual([{
      studentId: 's1', studentName: 'Salma', studentCode: 'ST-001', studentImage: null, gender: 'F',
      totalOverdue: 44.75, daysOverdue: 10, oldestDueDate: tenDaysBefore,
    }]);
  });
});

describe('collection by class for the selected year', () => {
  async function statementFor(isActiveYear: boolean) {
    const { repo, statements } = recordingRepository();
    await repo.getCollectionByClass(isActiveYear);
    return statements[0];
  }

  it("takes another year's class only from that year's placements", async () => {
    const { sql, params } = await statementFor(false);
    expect(sql).toContain('select distinct on ("student_enrollment_placements"."enrollment_id")');
    expect(sql).toContain('left join "classes" on ("classes"."id" = "collection_last_placement"."class_id" and "classes"."academic_year" = $');
    expect(params).toEqual(expect.arrayContaining(['year-old', '2019-2020']));
  });

  it('lets only the active year fall back to the current class, still of that year', async () => {
    const { sql } = await statementFor(true);
    expect(sql).toContain('"classes"."id" = COALESCE("collection_last_placement"."class_id", "students"."class_id") and "classes"."academic_year" = $');
  });

  it('marks the active year by the Settings pointer', async () => {
    const calls: unknown[] = [];
    const repo = { getCollectionByClass: async (isActive: boolean) => { calls.push(isActive); return []; } };
    const settings = { getPublicSettings: async () => ({ activeAcademicYearId: 'year-now', currentAcademicYear: '2026-2027' }) };
    await financeService(repo, { id: 'year-now', label: '2026-2027' }, { settings }).getCollectionByClass();
    await financeService(repo, { id: 'year-old', label: '2025-2026' }, { settings }).getCollectionByClass();
    expect(calls).toEqual([true, false]);
  });
});

describe('finance student placement', () => {
  it('gives overdue reminders the latest class and section in the selected year', async () => {
    const requests: unknown[] = [];
    const rows = await financeService(
      { getOverdue: async () => [
        { studentId: 's1', studentCode: 'ST-001', totalOverdue: 40 },
        { studentId: 's2', studentCode: 'ST-002', totalOverdue: 20 },
      ] },
      { id: 'y1', label: '2025-2026' },
      { enrollments: { listYearPlacements: async (yearId: string, ids: string[]) => {
        requests.push({ yearId, ids });
        return [
          { studentId: 's1', classId: 'new', className: 'New', sectionId: 'b', sectionName: 'B', validFrom: '2026-01-01' },
          { studentId: 's1', classId: 'old', className: 'Old', sectionId: 'a', sectionName: 'A', validFrom: '2025-09-01' },
        ];
      } } },
    ).getOverdue(100);
    expect(requests).toEqual([{ yearId: 'y1', ids: ['s1', 's2'] }]);
    expect<unknown>(rows).toEqual([
      { studentId: 's1', studentCode: 'ST-001', totalOverdue: 40, classId: 'new', className: 'New', sectionId: 'b', sectionName: 'B' },
      { studentId: 's2', studentCode: 'ST-002', totalOverdue: 20, classId: null, className: 'No class', sectionId: null, sectionName: null },
    ]);
  });

  it("shows the selected year's latest dated placement and leaves fee-only students without a class", async () => {
    const years: unknown[] = [];
    const rows = await financeService(
      { getAgingDetail: async () => [
        { studentId: 's1', total: 40 },
        { studentId: 's2', total: 20 },
      ] },
      { id: 'y1', label: '2025-2026' },
      { enrollments: { listYearPlacements: async (yearId: string) => {
        years.push(yearId);
        return [
          { studentId: 's1', classId: 'old', className: 'Old', validFrom: '2025-09-01' },
          { studentId: 's1', classId: 'new', className: 'New', validFrom: '2026-01-01' },
        ];
      } } },
    ).getAgingDetail();
    expect(years).toEqual(['y1']);
    expect(rows.map((row) => ({
      studentId: row.studentId, total: row.total,
      classId: row.classId, className: row.className,
    }))).toEqual([
      { studentId: 's1', total: 40, classId: 'new', className: 'New' },
      { studentId: 's2', total: 20, classId: null, className: 'No class' },
    ]);
  });
});
