import { describe, expect, it } from 'bun:test';
import { drizzle } from 'drizzle-orm/pg-proxy';
import { AttendanceService } from '../../src/modules/attendance/AttendanceService';
import { AttendanceRepository } from '../../src/modules/attendance/AttendanceRepository';
import { typeQueryParam } from '../../src/modules/attendance/AttendanceDto';

const year2025 = {
  id: 'year-2025',
  label: '2025-2026',
  reportingStartsOn: '2025-09-01',
  reportingEndsOn: '2026-08-31',
};

function service(repository: Record<string, unknown>, validator: Record<string, unknown> = {}) {
  return new AttendanceService(repository as any, validator as any, {} as any, {} as any);
}

describe('attendance list query', () => {
  it('validates the attendance type without duplicating year tool input', () => {
    expect(typeQueryParam.parse({ type: 'student' })).toEqual({ type: 'student' });
    expect(typeQueryParam.parse({})).toEqual({});
  });
});

describe('normal attendance year scope', () => {
  it('passes the type plainly to the scoped list read', async () => {
    const calls: unknown[] = [];
    await service({ getAll: async (filters: unknown) => { calls.push(filters); return []; } })
      .getAll({ type: 'student' });
    expect(calls).toEqual([{ type: 'student' }]);
  });

  it('checks the student before reading their attendance in the year', async () => {
    const calls: unknown[] = [];
    await service(
      { getAll: async (filters: unknown) => { calls.push(['read', filters]); return []; } },
      { ensureStudentExists: async (id: string) => { calls.push(['student', id]); } },
    ).getAll({ studentId: 'student-1' });
    expect(calls).toEqual([['student', 'student-1'], ['read', { studentId: 'student-1' }]]);
  });

  it('scopes the staff and teacher lists the same way', async () => {
    const calls: unknown[] = [];
    const attendance = service(
      {
        getAll: async (filters: unknown) => { calls.push(['staff', filters]); return []; },
        getByTeacher: async (id: string) => { calls.push(['teacher', id]); return []; },
      },
      { ensureStaffExists: async () => {}, ensureTeacherExists: async () => {} },
    );
    await attendance.getAll({ staffId: 'staff-1' });
    await attendance.getByTeacher('teacher-1');
    expect(calls).toEqual([
      ['staff', { staffId: 'staff-1' }],
      ['teacher', 'teacher-1'],
    ]);
  });

  it('delegates today to the scoped repository', async () => {
    const attendance = service({ getToday: async (type: string) => [{ type }] });
    expect<unknown>(await attendance.getToday('student')).toEqual([{ type: 'student' }]);
  });
});

describe('year-scoped attendance query', () => {
  async function statement(role: string, run: (repo: any) => Promise<unknown>) {
    const statements: Array<{ sql: string; params: unknown[] }> = [];
    const repo: any = new AttendanceRepository();
    repo.db = drizzle(async (sql, params) => { statements.push({ sql, params }); return { rows: [] }; });
    repo._scopeCtx = { hasActiveContext: () => true, getUser: () => ({ id: 'user-1', role }) };
    Object.defineProperty(repo, 'year', { value: year2025 });
    await run(repo);
    return statements.at(-1)!;
  }

  it('keeps a teacher\'s ownership, the type and the year in one WHERE', async () => {
    const { sql, params } = await statement('teacher', (repo) => repo.getAll({ type: 'student' }));
    expect(sql.match(/"attendance"\."id" in \(select/g)).toHaveLength(3);
    expect(sql).toContain('and ("attendance"."academic_year_id" = $4 or ("attendance"."academic_year_id" is null and ("attendance"."date" >= $5 and "attendance"."date" <= $6))) and "attendance"."type" = $7)');
    expect(params).toEqual(['user-1', 'user-1', 'user-1', 'year-2025', '2025-09-01', '2026-08-31', 'student']);
  });

  it('dates a parent\'s view of one child by the same year rule', async () => {
    const { sql, params } = await statement('parent', (repo) => repo.getAll({ studentId: 'student-1' }));
    expect(sql).toContain('and ("attendance"."academic_year_id" = $2 or');
    expect(sql).toContain('and ("attendance"."student_id" = $5 and "attendance"."type" = $6))');
    expect(params).toEqual(['user-1', 'year-2025', '2025-09-01', '2026-08-31', 'student-1', 'student']);
  });
});
