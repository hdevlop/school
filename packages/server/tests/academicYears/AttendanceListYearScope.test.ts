import { describe, expect, it } from 'bun:test';
import { drizzle } from 'drizzle-orm/pg-proxy';
import { AttendanceService } from '../../src/modules/attendance/AttendanceService';
import { AttendanceRepository } from '../../src/modules/attendance/AttendanceRepository';
import { attendanceListQuery, attendanceYearQuery } from '../../src/modules/attendance/AttendanceDto';

const year2025 = {
  id: 'year-2025',
  label: '2025-2026',
  reportingStartsOn: '2025-09-01',
  reportingEndsOn: '2026-08-31',
};

function service(repository: Record<string, unknown>, validator: Record<string, unknown> = {}) {
  return new AttendanceService(repository as any, validator as any, {} as any, {} as any);
}

describe('attendance list year query', () => {
  it('validates the optional year beside the attendance type', () => {
    expect(attendanceListQuery.parse({ type: 'student', academicYear: '2025-2026' }))
      .toEqual({ type: 'student', academicYear: '2025-2026' });
    expect(attendanceYearQuery.parse({})).toEqual({});
    expect(() => attendanceYearQuery.parse({ academicYear: '2025' })).toThrow();
  });
});

describe('normal attendance year scope', () => {
  it('passes the resolved year with the type to the list read', async () => {
    const calls: unknown[] = [];
    await service({ getAll: async (filters: unknown) => { calls.push(filters); return []; } })
      .getAll(year2025 as any, { type: 'student' });
    expect(calls).toEqual([{ year: year2025, type: 'student' }]);
  });

  it('checks the student before reading their attendance in the year', async () => {
    const calls: unknown[] = [];
    await service(
      { getAll: async (filters: unknown) => { calls.push(['read', filters]); return []; } },
      { ensureStudentExists: async (id: string) => { calls.push(['student', id]); } },
    ).getAll(year2025 as any, { studentId: 'student-1' });
    expect(calls).toEqual([['student', 'student-1'], ['read', { year: year2025, studentId: 'student-1' }]]);
  });

  it('scopes the staff and teacher lists the same way', async () => {
    const calls: unknown[] = [];
    const attendance = service(
      {
        getAll: async (filters: unknown) => { calls.push(['staff', filters]); return []; },
        getByTeacher: async (id: string, year?: unknown) => { calls.push(['teacher', id, year]); return []; },
      },
      { ensureStaffExists: async () => {}, ensureTeacherExists: async () => {} },
    );
    await attendance.getAll(year2025 as any, { staffId: 'staff-1' });
    await attendance.getByTeacher('teacher-1', year2025 as any);
    expect(calls).toEqual([
      ['staff', { year: year2025, staffId: 'staff-1' }],
      ['teacher', 'teacher-1', year2025],
    ]);
  });

  it('keeps the marks of today to the year that holds today', async () => {
    const today = [
      { id: 'in-year', academicYearId: 'year-2025', date: '2026-01-10' },
      { id: 'legacy-in-year', academicYearId: null, date: '2026-01-10' },
      { id: 'other-year', academicYearId: 'year-2026', date: '2026-01-10' },
    ];
    const attendance = service({ getToday: async () => today });
    expect((await attendance.getToday(year2025 as any)).map((row: any) => row.id)).toEqual(['in-year', 'legacy-in-year']);
    const earlier = { ...year2025, id: 'year-2024', reportingStartsOn: '2024-09-01', reportingEndsOn: '2025-08-31' };
    expect(await attendance.getToday(earlier as any)).toEqual([]);
  });
});

describe('year-scoped attendance query', () => {
  async function statement(role: string, run: (repo: any) => Promise<unknown>) {
    const statements: Array<{ sql: string; params: unknown[] }> = [];
    const repo: any = new AttendanceRepository();
    repo.db = drizzle(async (sql, params) => { statements.push({ sql, params }); return { rows: [] }; });
    repo._scopeCtx = { hasActiveContext: () => true, getUser: () => ({ id: 'user-1', role }) };
    await run(repo);
    return statements.at(-1)!;
  }

  it('keeps a teacher\'s ownership, the type and the year in one WHERE', async () => {
    const { sql, params } = await statement('teacher', (repo) => repo.getAll({ year: year2025, type: 'student' }));
    expect(sql.match(/"attendance"\."id" in \(select/g)).toHaveLength(3);
    expect(sql).toContain('and ("attendance"."academic_year_id" = $4 or ("attendance"."academic_year_id" is null and ("attendance"."date" >= $5 and "attendance"."date" <= $6))) and "attendance"."type" = $7)');
    expect(params).toEqual(['user-1', 'user-1', 'user-1', 'year-2025', '2025-09-01', '2026-08-31', 'student']);
  });

  it('dates a parent\'s view of one child by the same year rule', async () => {
    const { sql, params } = await statement('parent', (repo) => repo.getAll({ year: year2025, studentId: 'student-1' }));
    expect(sql).toContain('and ("attendance"."academic_year_id" = $2 or');
    expect(sql).toContain('and ("attendance"."student_id" = $5 and "attendance"."type" = $6))');
    expect(params).toEqual(['user-1', 'year-2025', '2025-09-01', '2026-08-31', 'student-1', 'student']);
  });
});
