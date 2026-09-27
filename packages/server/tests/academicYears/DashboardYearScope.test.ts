import { describe, expect, it } from 'bun:test';
import { drizzle } from 'drizzle-orm/pg-proxy';
import { DashboardService } from '../../src/modules/dashboard/DashboardService';
import { dashboardYearQuery } from '../../src/modules/dashboard/DashboardDto';
import { AttendanceRepository } from '../../src/modules/attendance/AttendanceRepository';
import { StudentRepository } from '../../src/modules/students/StudentRepository';

const oldYear = { id: 'year-old', label: '2019-2020', reportingStartsOn: '2019-09-01', reportingEndsOn: '2020-08-31' };
// Holds any date this suite can run on, so "today" always falls inside it.
const yearHoldingToday = { id: 'year-now', label: '2000-2001', reportingStartsOn: '2000-01-01', reportingEndsOn: '2999-12-31' };

function dashboard(parts: {
  students?: Record<string, unknown>;
  attendance?: Record<string, unknown>;
}) {
  return new DashboardService(
    (parts.students ?? {}) as any,
    { getCount: async () => ({ count: 7 }) } as any,
    { getCount: async () => ({ count: 9 }) } as any,
    { getTotalRevenue: async () => 100 } as any,
    { getTotalExpenses: async () => 40 } as any,
    (parts.attendance ?? {}) as any,
    {} as any,
    {} as any,
  );
}

const currentFigureQueries = (calls: unknown[]) => ({
  getAbsentLateCountsInRange: async () => { calls.push('today'); return { absent: 2, late: 1 }; },
  getPresentCountInRange: async () => { calls.push('week'); return 10; },
});

describe('dashboard year query', () => {
  it('accepts no year or a well-formed consecutive year only', () => {
    expect(dashboardYearQuery.parse({})).toEqual({});
    expect(dashboardYearQuery.parse({ academicYear: '2025-2026' })).toEqual({ academicYear: '2025-2026' });
    expect(() => dashboardYearQuery.parse({ academicYear: 'all' })).toThrow();
    expect(() => dashboardYearQuery.parse({ academicYear: '2025-2027' })).toThrow();
  });
});

describe('students by gender for a year', () => {
  it("counts the resolved year's enrollments", async () => {
    const calls: unknown[] = [];
    const service = dashboard({
      students: { getStudentsByGender: async (year: { id: string }) => { calls.push(year.id); return ['year']; } },
    });
    expect<unknown>(await service.getStudentsByGender(oldYear as any)).toEqual(['year']);
    expect(calls).toEqual(['year-old']);
  });
});

describe('monthly attendance for a year', () => {
  it('reads the year months and, for the year holding today, today and this week', async () => {
    const calls: unknown[] = [];
    const service = dashboard({
      attendance: {
        getMonthlyStatsForYear: async (type: string, year: { id: string }) => { calls.push(['months', type, year.id]); return ['m']; },
        ...currentFigureQueries(calls),
      },
    });
    const result = await service.getAttendanceMonthly('student', yearHoldingToday as any);
    expect(calls).toContainEqual(['months', 'student', 'year-now']);
    expect(result).toMatchObject({ monthly: ['m'], today: 3, todayAbsent: 2, todayLate: 1, thisWeek: 10, lastWeek: 10 });
  });

  it('reports no today or week figures for a year that does not hold today', async () => {
    const calls: unknown[] = [];
    const service = dashboard({
      attendance: {
        getMonthlyStatsForYear: async () => ['m'],
        ...currentFigureQueries(calls),
      },
    });
    expect<unknown>(await service.getAttendanceMonthly('staff', oldYear as any)).toEqual({
      monthly: ['m'], today: null, todayAbsent: null, todayLate: null,
      thisWeek: null, lastWeek: null, weeklyChangePct: null,
    });
    expect(calls).toEqual([]);
  });
});

describe('dashboard year SQL', () => {
  it('counts attendance by the stored year, else a legacy date, over the year months', async () => {
    let captured = { sql: '', params: [] as unknown[] };
    const repo: any = new AttendanceRepository();
    repo.db = drizzle(async (sql, params) => {
      captured = { sql, params };
      return { rows: [['2019-10', '5', '2', '1', '8'], ['2021-01', '9', '9', '9', '27']] };
    });
    const months = await repo.getMonthlyStatsForYear('student', oldYear);
    expect(captured.sql).toContain(
      '"attendance"."type" = $1 and ("attendance"."academic_year_id" = $2 or ("attendance"."academic_year_id" is null and ("attendance"."date" >= $3 and "attendance"."date" <= $4)))',
    );
    expect(captured.params).toEqual(['student', 'year-old', '2019-09-01', '2020-08-31']);
    expect(months.map((m: { month: string }) => m.month)).toEqual([
      '2019-09', '2019-10', '2019-11', '2019-12', '2020-01', '2020-02',
      '2020-03', '2020-04', '2020-05', '2020-06', '2020-07', '2020-08',
    ]);
    expect(months[1]).toEqual({ month: '2019-10', present: 5, absent: 2, late: 1, total: 8 });
    expect(months[0]).toEqual({ month: '2019-09', present: 0, absent: 0, late: 0, total: 0 });
  });

  async function studentStatement(method: 'getCount' | 'getStudentsByGender') {
    let captured = { sql: '', params: [] as unknown[] };
    const repo: any = new StudentRepository();
    repo.db = drizzle(async (sql, params) => { captured = { sql, params }; return { rows: [] }; });
    await repo[method]('year-old');
    return captured;
  }

  it('counts one year of enrollments, not the current student rows', async () => {
    const count = await studentStatement('getCount');
    expect(count.sql).toContain('from "student_enrollments" where "student_enrollments"."academic_year_id" = $1');
    expect(count.params).toEqual(['year-old']);

    const gender = await studentStatement('getStudentsByGender');
    expect(gender.sql).toContain('from "student_enrollments" inner join "students"');
    expect(gender.sql).toContain('where "student_enrollments"."academic_year_id" = $1 group by "students"."gender"');
    expect(gender.sql).not.toContain('"students"."status"');
    expect(gender.params).toEqual(['year-old']);
  });
});
