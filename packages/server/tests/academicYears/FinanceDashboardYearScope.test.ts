import { describe, expect, it } from 'bun:test';
import { drizzle } from 'drizzle-orm/pg-proxy';
import { FinanceDashboardRepository } from '../../src/modules/dashboard/finance/FinanceDashboardRepository';
import { FinanceDashboardService } from '../../src/modules/dashboard/finance/FinanceDashboardService';

type Statement = { sql: string; params: unknown[] };

function recordingRepository(rowsFor: (sql: string) => unknown[][] = () => []) {
  const statements: Statement[] = [];
  const repo: any = new FinanceDashboardRepository();
  repo.db = drizzle(async (sql, params) => {
    statements.push({ sql, params });
    return { rows: rowsFor(sql) };
  });
  return { repo, statements };
}

// A registered calendar that differs from the September–August default, so a
// read that still derived its window from the label would miss it.
const customYear = { label: '2019-2020', reportingStartsOn: '2019-08-15', reportingEndsOn: '2020-07-31' };

describe('finance KPIs for a year', () => {
  it('adds the whole year cash next to the month, over the registered reporting dates', async () => {
    const { repo, statements } = recordingRepository((sql) => {
      if (sql.includes('"payments"')) return [['1000.50']];
      if (sql.includes('"expenses"')) return [['200']];
      if (sql.includes('"payslips"')) return [['100']];
      return [['0', '0']];
    });
    const kpis = await repo.getKpis(customYear);
    const yearReads = statements.filter((s) => s.params.includes('2019-08-15') && s.params.includes('2020-07-31'));
    expect(yearReads.map((s) => s.sql.match(/from "(\w+)"/)?.[1]).sort()).toEqual(['expenses', 'payments', 'payslips']);
    expect(statements.some((s) => s.params.includes('2019-09-01') || s.params.includes('2020-08-31'))).toBe(false);
    const collection = statements.find((s) => s.sql.includes('"fee_installments"'));
    expect(collection?.params).toContain('2019-2020');
    expect(kpis).toMatchObject({
      incomeYear: 1000.5,
      expensesYear: 300,
      netBalanceYear: 700.5,
      incomeMonth: 1000.5,
      expensesMonth: 300,
      netBalance: 700.5,
    });
  });
});

describe('finance trend and expenses over a registered calendar', () => {
  it('charts one month per month of the reporting interval', async () => {
    const { repo, statements } = recordingRepository((sql) => (
      sql.includes('"payments"') && sql.includes('TO_CHAR') ? [['2019-08', '50']] : []
    ));
    const trend = await repo.getTrend(customYear);
    expect(trend.monthly.map((m: { month: string }) => m.month)).toEqual([
      '2019-08', '2019-09', '2019-10', '2019-11', '2019-12', '2020-01',
      '2020-02', '2020-03', '2020-04', '2020-05', '2020-06', '2020-07',
    ]);
    expect(trend.monthly[0]).toEqual({ month: '2019-08', income: 50, expenses: 0 });
    const windowed = statements.filter((s) => s.sql.includes('TO_CHAR'));
    expect(windowed).toHaveLength(3);
    for (const statement of windowed) expect(statement.params).toEqual(expect.arrayContaining(['2019-08-15', '2020-07-31']));
  });

  it('breaks expenses down over the same dates', async () => {
    const { repo, statements } = recordingRepository();
    await repo.getExpenseBreakdown(customYear);
    expect(statements).toHaveLength(2);
    for (const statement of statements) expect(statement.params).toEqual(expect.arrayContaining(['2019-08-15', '2020-07-31']));
  });
});

describe('finance reads of the resolved year', () => {
  it('passes the resolved year to the KPI, trend and expense reads', async () => {
    const calls: string[] = [];
    const finance = new FinanceDashboardService(
      {
        getKpis: async (year: { label: string }) => { calls.push(`kpis ${year.label}`); return {}; },
        getTrend: async (year: { label: string }) => { calls.push(`trend ${year.label}`); return []; },
        getExpenseBreakdown: async (year: { label: string }) => { calls.push(`expenses ${year.label}`); return []; },
      } as any,
      {} as any,
      {} as any,
    );
    const year = { id: 'year-old', ...customYear } as any;
    await finance.getKpis(year);
    await finance.getTrend(year);
    await finance.getExpenseBreakdown(year);
    expect(calls).toEqual(['kpis 2019-2020', 'trend 2019-2020', 'expenses 2019-2020']);
  });
});

describe('collection by class for a year', () => {
  async function statementFor(context: { academicYearId: string | null; isActiveYear: boolean }) {
    const { repo, statements } = recordingRepository();
    await repo.getCollectionByClass('2019-2020', context);
    return statements[0];
  }

  it('takes another year class only from that year placements', async () => {
    const { sql, params } = await statementFor({ academicYearId: 'year-old', isActiveYear: false });
    expect(sql).toContain('select distinct on ("student_enrollment_placements"."enrollment_id")');
    expect(sql).toContain('left join "classes" on ("classes"."id" = "collection_last_placement"."class_id" and "classes"."academic_year" = $');
    expect(sql).not.toContain('"students"."class_id"');
    expect(params).toContain('year-old');
    expect(params).toContain('2019-2020');
  });

  it('lets only the active year fall back to the current class, still of that year', async () => {
    const { sql } = await statementFor({ academicYearId: 'year-now', isActiveYear: true });
    expect(sql).toContain('"classes"."id" = COALESCE("collection_last_placement"."class_id", "students"."class_id") and "classes"."academic_year" = $');
  });

  it('matches no enrollment for an unregistered label', async () => {
    const { params } = await statementFor({ academicYearId: null, isActiveYear: false });
    expect(params.filter((param) => param === '')).toHaveLength(2);
  });
});

describe('collection by class year context', () => {
  it('passes the year id and marks the active year by the Settings pointer', async () => {
    const calls: unknown[] = [];
    const finance = new FinanceDashboardService(
      { getCollectionByClass: async (...args: unknown[]) => { calls.push(args); return []; } } as any,
      { getPublicSettings: async () => ({ activeAcademicYearId: 'year-now', currentAcademicYear: '2026-2027' }) } as any,
      {} as any,
    );
    await finance.getCollectionByClass({ id: 'year-now', label: '2026-2027' } as any);
    await finance.getCollectionByClass({ id: 'year-old', label: '2025-2026' } as any);
    expect(calls).toEqual([
      ['2026-2027', { academicYearId: 'year-now', isActiveYear: true }],
      ['2025-2026', { academicYearId: 'year-old', isActiveYear: false }],
    ]);
  });
});

describe('year-specific aging and reminders', () => {
  it('filters installment balances by fee year and completed allocations', async () => {
    const { repo, statements } = recordingRepository();
    await repo.getAging('2025-2026');
    await repo.getOverdue(6, '2025-2026');
    await repo.getAgingDetail('2025-2026');

    expect(statements).toHaveLength(3);
    for (const statement of statements) {
      expect(statement.sql).toContain('"fees"."academic_year" = $');
      expect(statement.sql).toContain('"payments"."status" = $');
      expect(statement.sql).toContain('"payment_allocations"."installment_id"');
      expect(statement.sql).toContain('GREATEST(');
      expect(statement.params).toContain('2025-2026');
      expect(statement.params).toContain('completed');
      expect(statement.params).toContain('cancelled');
      expect(statement.sql).not.toContain('"students"."class_id"');
    }
  });

  it('reads aging, overdue and aging detail of the resolved year only', async () => {
    const calls: string[] = [];
    const finance = new FinanceDashboardService(
      {
        getAging: async (label: string) => { calls.push(`aging ${label}`); return {}; },
        getOverdue: async (limit: number, label: string) => { calls.push(`overdue ${limit} ${label}`); return []; },
        getAgingDetail: async (label: string) => { calls.push(`detail ${label}`); return []; },
      } as any,
      {} as any,
      { listYearPlacements: async () => [] } as any,
    );
    const year = { id: 'year-old', label: '2025-2026' } as any;
    await finance.getAging(year);
    await finance.getOverdue(6, year);
    await finance.getAgingDetail(year);
    expect(calls).toEqual(['aging 2025-2026', 'overdue 6 2025-2026', 'detail 2025-2026']);
  });

  it('shows the latest dated placement and leaves fee-only students without a class', async () => {
    const finance = new FinanceDashboardService(
      { getAgingDetail: async () => [
        { studentId: 's1', total: 40 },
        { studentId: 's2', total: 20 },
      ] } as any,
      {} as any,
      { listYearPlacements: async () => [
        { studentId: 's1', classId: 'old', className: 'Old', validFrom: '2025-09-01' },
        { studentId: 's1', classId: 'new', className: 'New', validFrom: '2026-01-01' },
      ] } as any,
    );
    const rows = await finance.getAgingDetail({ id: 'y1', label: '2025-2026' } as any);
    expect(rows.map((row) => ({
      studentId: row.studentId, total: row.total,
      classId: row.classId, className: row.className,
    }))).toEqual([
      { studentId: 's1', total: 40, classId: 'new', className: 'New' },
      { studentId: 's2', total: 20, classId: null, className: 'No class' },
    ]);
  });
});
