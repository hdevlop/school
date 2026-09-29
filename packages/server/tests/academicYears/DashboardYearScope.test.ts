import { describe, expect, it } from 'bun:test';
import { drizzle } from 'drizzle-orm/pg-proxy';
import { DashboardService } from '../../src/modules/dashboard/DashboardService';
import { AcademicDashboardService } from '../../src/modules/dashboard/academic/AcademicDashboardService';
import { OperationsDashboardService } from '../../src/modules/dashboard/operations/OperationsDashboardService';
import { AttendanceRepository } from '../../src/modules/attendance/AttendanceRepository';
import { StudentRepository } from '../../src/modules/students/StudentRepository';
import { holdsDay } from '../../src/modules/academicYears/academicRecordYear';

const oldYear = { id: 'year-old', label: '2019-2020', reportingStartsOn: '2019-09-01', reportingEndsOn: '2020-08-31' };
// Holds any date this suite can run on, so "today" always falls inside it.
const yearHoldingToday = { id: 'year-now', label: '2000-2001', reportingStartsOn: '2000-01-01', reportingEndsOn: '2999-12-31' };

// Outside a request the @Year() getter is not installed; give the instance
// the year a request scope would resolve.
function inYear<T extends object>(instance: T, year: object): T {
  Object.defineProperty(instance, 'year', { value: year, configurable: true });
  return instance;
}

function dashboard(year: object, parts: {
  students?: Record<string, unknown>;
  attendance?: Record<string, unknown>;
  payments?: Record<string, unknown>;
  expenses?: Record<string, unknown>;
  fees?: Record<string, unknown>;
  events?: Record<string, unknown>;
}) {
  return inYear(new DashboardService(
    (parts.students ?? {}) as any,
    { getCount: async () => ({ count: 7 }) } as any,
    { getCount: async () => ({ count: 9 }) } as any,
    (parts.payments ?? { getTotalRevenue: async () => 100 }) as any,
    (parts.expenses ?? { getTotalExpenses: async () => 40 }) as any,
    (parts.attendance ?? {}) as any,
    (parts.fees ?? {}) as any,
    (parts.events ?? {}) as any,
  ), year);
}

const currentFigureQueries = (calls: unknown[]) => ({
  getAbsentLateCountsInRange: async () => { calls.push('today'); return { absent: 2, late: 1 }; },
  getPresentCountInRange: async () => { calls.push('week'); return 10; },
});

describe('the year that holds a day', () => {
  it('includes both ends of the reporting interval and nothing outside it', () => {
    expect(holdsDay(oldYear, '2019-09-01')).toBe(true);
    expect(holdsDay(oldYear, '2020-08-31')).toBe(true);
    expect(holdsDay(oldYear, '2019-08-31')).toBe(false);
    expect(holdsDay(oldYear, '2020-09-01')).toBe(false);
  });
});

describe('students of the selected year', () => {
  it('counts the gender chart from the selected year enrollments', async () => {
    const calls: unknown[] = [];
    const service = dashboard(oldYear, {
      students: { getStudentsByGender: async (...args: unknown[]) => { calls.push(args); return ['year']; } },
    });
    expect<unknown>(await service.getStudentsByGender()).toEqual(['year']);
    expect(calls).toEqual([[]]);
  });
});

describe('monthly attendance for the selected year', () => {
  it('reads the year months and, for the year holding today, today and this week', async () => {
    const calls: unknown[] = [];
    const service = dashboard(yearHoldingToday, {
      attendance: {
        getMonthlyStats: async (type: string) => { calls.push(['months', type]); return ['m']; },
        ...currentFigureQueries(calls),
      },
    });
    const result = await service.getAttendanceMonthly('student');
    expect(calls).toContainEqual(['months', 'student']);
    expect(result).toMatchObject({ monthly: ['m'], today: 3, todayAbsent: 2, todayLate: 1, thisWeek: 10, lastWeek: 10 });
  });

  it('reports no today or week figures for a year that does not hold today', async () => {
    const calls: unknown[] = [];
    const service = dashboard(oldYear, {
      attendance: {
        getMonthlyStats: async () => ['m'],
        ...currentFigureQueries(calls),
      },
    });
    expect<unknown>(await service.getAttendanceMonthly('staff')).toEqual({
      monthly: ['m'], today: null, todayAbsent: null, todayLate: null,
      thisWeek: null, lastWeek: null, weeklyChangePct: null,
    });
    expect(calls).toEqual([]);
  });
});

describe("the admin's today snapshot", () => {
  const overdue = { overdueCount: 2, overdueAmount: '50.00', affectedStudents: 1 };

  it('reports only the fee year overdue in a year that does not hold today', async () => {
    const calls: string[] = [];
    const record = (name: string, value: unknown) => async () => { calls.push(name); return value; };
    const service = dashboard(oldYear, {
      attendance: { getToday: record('attendance', []) },
      payments: { getToday: record('payments', { summary: { total: 5, count: 1 } }) },
      expenses: { getToday: record('expenses', { summary: { total: 3, count: 1 } }) },
      fees: { getOverdueSummary: record('overdue', overdue) },
      events: { getTodayEvents: record('events', []) },
    });
    expect<unknown>(await service.getTodaySnapshot()).toEqual({
      attendance: null, income: null, expenses: null, overdueFees: overdue, events: null,
    });
    expect(calls).toEqual(['overdue']);
  });

  it("reads today's attendance, cash and events in the year holding today", async () => {
    const service = dashboard(yearHoldingToday, {
      attendance: { getToday: async (type: string) => [type] },
      payments: { getToday: async () => ({ summary: { total: 5, count: 1 } }) },
      expenses: { getToday: async () => ({ summary: { total: 3, count: 1 } }) },
      fees: { getOverdueSummary: async () => overdue },
      events: { getTodayEvents: async () => ['event'] },
    });
    expect<unknown>(await service.getTodaySnapshot()).toEqual({
      attendance: { students: ['student'], staff: ['staff'] },
      income: { total: 5, count: 1 },
      expenses: { total: 3, count: 1 },
      overdueFees: overdue,
      events: ['event'],
    });
  });

  it('lets a failed read fail rather than report nothing', async () => {
    const service = dashboard(yearHoldingToday, {
      attendance: { getToday: async () => [] },
      payments: { getToday: async () => { throw new Error('payments down'); } },
      expenses: { getToday: async () => ({ summary: {} }) },
      fees: { getOverdueSummary: async () => overdue },
      events: { getTodayEvents: async () => [] },
    });
    await expect(service.getTodaySnapshot()).rejects.toThrow('payments down');
  });
});

describe('academic KPIs for the selected year', () => {
  function academic(year: object, todayMarks: Array<{ status: string }> | Error, calls: string[] = []) {
    return inYear(new AcademicDashboardService(
      { getCount: async () => { calls.push('students'); return { count: 8 }; } } as any,
      { getCount: async () => ({ count: 3 }) } as any,
      { getToday: async () => {
        calls.push('attendance');
        if (todayMarks instanceof Error) throw todayMarks;
        return todayMarks;
      } } as any,
      { getAll: async () => [{ marksObtained: '10' }, { marksObtained: '20' }, { marksObtained: null }] } as any,
    ), year);
  }

  it('reports no attendance rate in a year that does not hold today', async () => {
    const calls: string[] = [];
    expect(await academic(oldYear, [], calls).getKpis()).toEqual({
      totalStudents: 8, totalTeachers: 3, attendanceRate: null, avgGPA: 15, totalGrades: 3,
    });
    expect(calls).toEqual(['students']);
  });

  it("rates today's marks in the year holding today, and none without a mark", async () => {
    const marks = [{ status: 'present' }, { status: 'present' }, { status: 'absent' }];
    expect((await academic(yearHoldingToday, marks).getKpis()).attendanceRate).toBe(67);
    expect((await academic(yearHoldingToday, []).getKpis()).attendanceRate).toBeNull();
  });

  it('lets a failed read fail rather than report zero', async () => {
    await expect(academic(yearHoldingToday, new Error('attendance down')).getKpis()).rejects.toThrow('attendance down');
  });
});

describe('operations KPIs for the selected year', () => {
  function operations(year: object, calls: string[]) {
    return inYear(new OperationsDashboardService(
      { getTodayEvents: async () => { calls.push('events'); return ['a', 'b']; } } as any,
      { getActiveAlerts: async () => ['a'], getCriticalAlerts: async () => [] } as any,
      { getPublished: async () => ['x', 'y', 'z'] } as any,
    ), year);
  }

  it("counts today's events only in the year holding today", async () => {
    const calls: string[] = [];
    expect(await operations(oldYear, calls).getKpis()).toEqual({
      activeEventsToday: null, activeAlertsCount: 1, criticalAlertsCount: 0, activeAnnouncementsCount: 3,
    });
    expect(calls).toEqual([]);
    expect((await operations(yearHoldingToday, calls).getKpis()).activeEventsToday).toBe(2);
  });
});

describe('dashboard year SQL', () => {
  it('counts attendance by the stored year, else a legacy date, over the selected year months', async () => {
    let captured = { sql: '', params: [] as unknown[] };
    const repo: any = inYear(new AttendanceRepository(), oldYear);
    repo.db = drizzle(async (sql, params) => {
      captured = { sql, params };
      return { rows: [['2019-10', '5', '2', '1', '8'], ['2021-01', '9', '9', '9', '27']] };
    });
    const months = await repo.getMonthlyStats('student');
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
    Object.defineProperty(repo, 'year', { value: oldYear });
    repo.db = drizzle(async (sql, params) => { captured = { sql, params }; return { rows: [] }; });
    await repo[method]();
    return captured;
  }

  it('counts one year of enrollments, not the current student rows', async () => {
    const count = await studentStatement('getCount');
    expect(count.sql).toContain('where "student_enrollments"."academic_year_id" = $1');
    expect(count.params).toEqual(['year-old']);

    const gender = await studentStatement('getStudentsByGender');
    expect(gender.sql).toContain('from "student_enrollments" inner join "students"');
    expect(gender.sql).toContain('where "student_enrollments"."academic_year_id" = $1 group by "students"."gender"');
    expect(gender.sql).not.toContain('"students"."status"');
    expect(gender.params).toEqual(['year-old']);
  });
});
