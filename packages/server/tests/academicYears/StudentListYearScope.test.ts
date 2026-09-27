import { describe, expect, it } from 'bun:test';
import { drizzle } from 'drizzle-orm/pg-proxy';
import { AcademicYearValidator } from '../../src/modules/academicYears/AcademicYearValidator';
import { StudentService } from '../../src/modules/students/StudentService';
import { StudentValidator } from '../../src/modules/students/StudentValidator';
import { StudentRepository } from '../../src/modules/students/StudentRepository';
import { studentListQuery, studentYearQuery } from '../../src/modules/students/StudentDto';
import { yearRegistry } from './fixtures/yearRegistry';

const years = {
  '2025-2026': { id: 'year-old', label: '2025-2026', status: 'closed' },
  '2026-2027': { id: 'year-active', label: '2026-2027', status: 'open' },
  '2027-2028': { id: 'year-draft', label: '2027-2028', status: 'draft' },
} as const;

function yearService(settings: { activeAcademicYearId?: string | null; currentAcademicYear: string }) {
  return new AcademicYearValidator(yearRegistry(Object.values(years), settings) as any);
}

function studentService(
  repository: Record<string, unknown>,
  validator: Record<string, unknown> = {
    ensureRosterDateWithinYear: StudentValidator.prototype.ensureRosterDateWithinYear,
  },
) {
  return new StudentService(
    repository as any,
    validator as any, {} as any, {} as any, {} as any, {} as any, {} as any,
    {} as any, {} as any,
  );
}

describe('student history year policy', () => {
  const settings = { activeAcademicYearId: 'year-active', currentAcademicYear: '2026-2027' };

  it('gives administrators and accounting any registered year that is not a draft', async () => {
    for (const role of ['admin', 'principal', 'accounting']) {
      expect<unknown>(await yearService(settings).resolve('2025-2026', role)).toEqual(years['2025-2026']);
      expect<unknown>(await yearService(settings).resolve('2026-2027', role)).toEqual(years['2026-2027']);
    }
  });

  it('keeps every other role to the active year', async () => {
    for (const role of ['teacher', 'parent', 'student', 'counselor', undefined]) {
      await expect(yearService(settings).resolve('2025-2026', role)).rejects.toThrow('administrators and accounting only');
      expect<unknown>(await yearService(settings).resolve('2026-2027', role)).toEqual(years['2026-2027']);
      expect<unknown>(await yearService(settings).resolve(undefined, role)).toEqual(years['2026-2027']);
    }
  });

  it('uses the active label when the settings pointer is not set yet', async () => {
    const legacy = { activeAcademicYearId: null, currentAcademicYear: '2026-2027' };
    expect<unknown>(await yearService(legacy).resolve('2026-2027', 'teacher')).toEqual(years['2026-2027']);
    await expect(yearService(legacy).resolve('2025-2026', 'teacher')).rejects.toThrow('administrators and accounting only');
  });

  it('keeps draft years to administrators', async () => {
    await expect(yearService(settings).resolve('2027-2028', 'accounting')).rejects.toThrow('Academic year not found');
    await expect(yearService(settings).resolve('2027-2028', 'teacher')).rejects.toThrow('Academic year not found');
    expect<unknown>(await yearService(settings).resolve('2027-2028', 'principal')).toEqual(years['2027-2028']);
  });
});

describe('normal student list year scope', () => {
  it('validates the optional year query', () => {
    expect(studentListQuery.parse({})).toEqual({});
    expect(studentListQuery.parse({ academicYear: '2025-2026' })).toEqual({ academicYear: '2025-2026' });
    expect(() => studentListQuery.parse({ academicYear: 'all' })).toThrow();
  });

  it('lists the enrollments of the resolved year', async () => {
    const calls: unknown[] = [];
    const service = studentService(
      { getAll: async (filters: unknown) => { calls.push(filters); return [{ id: 'student-1' }]; } },
    );
    expect<unknown>(await service.getAll(years['2025-2026'] as any)).toEqual([{ id: 'student-1' }]);
    expect(calls).toEqual([{ academicYearId: 'year-old', onDate: undefined }]);
  });
});

describe('student profile year scope', () => {
  const current = { id: 'student-1', name: 'Salma', classId: 'class-now', class: { id: 'class-now', name: 'CE6' } };

  it('shows the class of the viewed year', async () => {
    const calls: unknown[] = [];
    const service = studentService(
      {
        getAll: async (filters: unknown) => {
          calls.push(['year', filters]);
          return [{ id: 'student-1', classId: 'class-old', class: { id: 'class-old', name: 'CE5' } }];
        },
      },
      { ensureExists: async (id: string) => { calls.push(['exists', id]); return current; } },
    );
    expect<unknown>(await service.getById('student-1', years['2025-2026'] as any))
      .toEqual({ id: 'student-1', classId: 'class-old', class: { id: 'class-old', name: 'CE5' } });
    expect(calls).toEqual([['exists', 'student-1'], ['year', { academicYearId: 'year-old', studentId: 'student-1' }]]);
  });

  it('keeps the identity but no class when the student was not enrolled that year', async () => {
    const service = studentService(
      { getAll: async () => [] },
      { ensureExists: async () => current },
    );
    expect<unknown>(await service.getById('student-1', years['2025-2026'] as any)).toEqual({
      id: 'student-1', name: 'Salma', classId: null, sectionId: null,
      class: null, section: null, enrollment: null, placement: null,
    });
  });
});

describe('student year list query', () => {
  async function statementFor(role: string, studentId?: string) {
    let captured = { sql: '', params: [] as unknown[] };
    const repo: any = new StudentRepository();
    repo.db = drizzle(async (sql, params) => { captured = { sql, params }; return { rows: [] }; });
    repo._scopeCtx = { hasActiveContext: () => true, getUser: () => ({ id: 'user-1', role }) };
    await repo.getAll({ academicYearId: 'year-old', studentId });
    return captured;
  }

  it('limits one student to that year in the same WHERE as ownership', async () => {
    const { sql, params } = await statementFor('parent', 'student-1');
    expect(sql).toContain('where ("student_enrollments"."academic_year_id" = $1 and "students"."id" = $2 and "students"."id" in (select "students"."id" from "students"');
    expect(params).toEqual(['year-old', 'student-1', 'user-1']);
  });

  it('reads one row per enrollment placed by its latest placement in that year', async () => {
    const { sql, params } = await statementFor('principal');
    expect(sql).toContain('select distinct on ("students"."created_at", "student_enrollments"."id")');
    expect(sql).toContain('from "student_enrollments" inner join "students"');
    expect(sql).toContain('left join "classes" on "student_enrollment_placements"."class_id" = "classes"."id"');
    expect(sql).toContain('"student_enrollment_placements"."class_id", "student_enrollment_placements"."section_id"');
    expect(sql).not.toContain('"students"."class_id"');
    expect(sql).toContain('where "student_enrollments"."academic_year_id" = $1');
    expect(sql).toContain('order by "students"."created_at" desc, "student_enrollments"."id", "student_enrollment_placements"."valid_from" desc');
    expect(params).toEqual(['year-old']);
  });

  it('keeps a parent to their linked children in the same WHERE as the year', async () => {
    const { sql, params } = await statementFor('parent');
    expect(sql).toContain('where ("student_enrollments"."academic_year_id" = $1 and "students"."id" in (select "students"."id" from "students"');
    expect(params).toEqual(['year-old', 'user-1']);
  });

});

describe('student roster on a date', () => {
  const oldYear = { ...years['2025-2026'], reportingStartsOn: '2025-09-01', reportingEndsOn: '2026-08-31' };

  it('accepts a date with or without an explicit year', () => {
    expect(studentListQuery.parse({ academicYear: '2025-2026', onDate: '2025-10-01' }))
      .toEqual({ academicYear: '2025-2026', onDate: '2025-10-01' });
    expect(studentListQuery.parse({ onDate: '2025-10-01' })).toEqual({ onDate: '2025-10-01' });
    expect(() => studentListQuery.parse({ academicYear: '2025-2026', onDate: '2025-02-30' })).toThrow();
  });

  it('keeps the year-only query on the student detail route', () => {
    expect(studentYearQuery.parse({ academicYear: '2025-2026' })).toEqual({ academicYear: '2025-2026' });
    expect(studentYearQuery.safeParse({ academicYear: '2025-2026', onDate: '2025-10-01' }).data)
      .toEqual({ academicYear: '2025-2026' });
  });

  it('reads that day of the resolved year', async () => {
    const calls: unknown[] = [];
    const service = studentService(
      { getAll: async (filters: unknown) => { calls.push(filters); return [{ id: 'student-1' }]; } },
    );
    expect<unknown>(await service.getAll(oldYear as any, '2025-10-01')).toEqual([{ id: 'student-1' }]);
    expect(calls).toEqual([{ academicYearId: 'year-old', onDate: '2025-10-01' }]);
  });

  it('accepts both ends of the reporting interval', async () => {
    const service = studentService({ getAll: async ({ onDate }: { onDate: string }) => [{ date: onDate }] });
    expect<unknown>(await service.getAll(oldYear as any, '2025-09-01')).toEqual([{ date: '2025-09-01' }]);
    expect<unknown>(await service.getAll(oldYear as any, '2026-08-31')).toEqual([{ date: '2026-08-31' }]);
  });

  it('refuses a day outside the year before reading', async () => {
    let read = false;
    const service = studentService({ getAll: async () => { read = true; return []; } });
    await expect(service.getAll(oldYear as any, '2025-08-31')).rejects.toThrow('outside the academic year');
    await expect(service.getAll(oldYear as any, '2026-09-01')).rejects.toThrow('outside the academic year');
    expect(read).toBe(false);
  });

  async function dayStatement(role: string) {
    let captured = { sql: '', params: [] as unknown[] };
    const repo: any = new StudentRepository();
    repo.db = drizzle(async (sql, params) => { captured = { sql, params }; return { rows: [] }; });
    repo._scopeCtx = { hasActiveContext: () => true, getUser: () => ({ id: 'user-1', role }) };
    await repo.getAll({ academicYearId: 'year-old', onDate: '2025-10-01' });
    return captured;
  }

  it('reads only the enrollment and placement covering the day, with half-open ends', async () => {
    const { sql, params } = await dayStatement('principal');
    // Placement class and section are required, so the date conditions on the
    // placement keep exactly the rows an inner join would.
    expect(sql).toContain('left join "student_enrollment_placements" on "student_enrollment_placements"."enrollment_id" = "student_enrollments"."id"');
    expect(sql).toContain('"student_enrollments"."enrolled_on" <= $2');
    expect(sql).toContain('("student_enrollments"."left_on" is null or "student_enrollments"."left_on" > $3)');
    expect(sql).toContain('"student_enrollment_placements"."valid_from" <= $4');
    expect(sql).toContain('("student_enrollment_placements"."valid_to" is null or "student_enrollment_placements"."valid_to" > $5)');
    expect(sql).not.toContain('"students"."class_id"');
    expect(params).toEqual(['year-old', '2025-10-01', '2025-10-01', '2025-10-01', '2025-10-01']);
  });

  it('keeps a teacher to their sections in the same WHERE as the day', async () => {
    const { sql, params } = await dayStatement('teacher');
    expect(sql).toContain('"student_enrollment_placements"."valid_to" > $5) and "students"."id" in (select "students"."id" from "students"');
    expect(params.slice(0, 5)).toEqual(['year-old', '2025-10-01', '2025-10-01', '2025-10-01', '2025-10-01']);
    expect(params).toContain('user-1');
  });
});
