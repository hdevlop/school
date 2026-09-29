import { describe, expect, it } from 'bun:test';
import { drizzle } from 'drizzle-orm/pg-proxy';
import { teacherStudentsQuery } from '../../src/modules/teachers/TeacherDto';
import { TeacherService } from '../../src/modules/teachers/TeacherService';
import { TeacherValidator } from '../../src/modules/teachers/TeacherValidator';
import { TeacherRepository } from '../../src/modules/teachers/TeacherRepository';

const year = {
  id: 'year-1', label: '2025-2026', reportingStartsOn: '2025-09-01', reportingEndsOn: '2026-08-31',
} as any;

function harness() {
  const calls: string[] = [];
  const service = new TeacherService(
    {
      getStudents: async (_id: string, date?: string) => {
        calls.push(`${year.id}:${year.label}:${date ?? 'year'}`);
        return [{ id: 'student-1', enrollmentId: 'enrollment-1', placementId: 'placement-1' }];
      },
    } as any,
    Object.assign(new TeacherValidator({} as any, {} as any, {} as any, {} as any, {} as any), {
      ensureExists: async () => ({ id: 'teacher-1' }),
    }) as any,
    {} as any, {} as any, {} as any, {} as any,
  );
  Object.defineProperty(service, 'year', { get: () => year });
  return { service, calls };
}

describe('teacher students in a year', () => {
  it('accepts a real date and leaves year selection to the request scope', () => {
    expect(teacherStudentsQuery.safeParse({ onDate: '2026-02-01' }).success).toBe(true);
    expect(teacherStudentsQuery.safeParse({ onDate: '2026-02-30' }).success).toBe(false);
    expect('academicYear' in teacherStudentsQuery.shape).toBe(false);
  });

  it("lists the year's placed students without a date, for any role the route allows", async () => {
    const { service, calls } = harness();
    await service.getStudents('teacher-1', undefined, 'teacher');
    expect(calls).toEqual(['year-1:2025-2026:year']);
  });

  it('does not grant a teacher the unreviewed dated roster', async () => {
    const { service, calls } = harness();
    await expect(service.getStudents('teacher-1', '2026-02-01', 'teacher')).rejects.toThrow();
    expect(calls).toEqual([]);
  });

  it('checks the reporting interval and routes administrator review through dated placements', async () => {
    const { service, calls } = harness();
    await expect(service.getStudents('teacher-1', '2026-09-01', 'admin')).rejects.toThrow();
    expect(calls).toEqual([]);

    const roster = await service.getStudents('teacher-1', '2026-02-01', 'admin');
    expect(roster).toHaveLength(1);
    expect(calls).toEqual(['year-1:2025-2026:2026-02-01']);
  });
});

describe('teacher students query', () => {
  async function statement(onDate?: string) {
    let captured = { sql: '', params: [] as unknown[] };
    const repo: any = new TeacherRepository();
    repo.db = drizzle(async (sql, params) => { captured = { sql, params }; return { rows: [] }; });
    Object.defineProperty(repo, 'year', { get: () => year });
    await repo.getStudents('teacher-1', onDate);
    return captured;
  }

  it("never reads a student's current section: class and placement both belong to the year", async () => {
    const { sql, params } = await statement();
    expect(sql).not.toContain('"students"."section_id"');
    expect(sql).toContain('"classes"."academic_year" = $2');
    expect(sql).toContain('"student_enrollments"."academic_year_id" = $3');
    expect(sql).not.toContain('"student_enrollment_placements"."valid_from" <=');
    expect(params).toEqual(['teacher-1', '2025-2026', 'year-1']);
  });

  it('narrows to the placements covering the date when one is given', async () => {
    const { sql } = await statement('2026-02-01');
    expect(sql).toContain('"student_enrollment_placements"."valid_from" <=');
    expect(sql).toContain('"student_enrollments"."left_on" is null or "student_enrollments"."left_on" >');
  });
});
