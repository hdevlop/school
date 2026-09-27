import { describe, expect, it } from 'bun:test';
import { drizzle } from 'drizzle-orm/pg-proxy';
import { AssessmentService } from '../../src/modules/assessments/AssessmentService';
import { AssessmentRepository } from '../../src/modules/assessments/AssessmentRepository';
import { ExamService } from '../../src/modules/exams/ExamService';
import { GradeService } from '../../src/modules/grades/GradeService';
import { GradeRepository } from '../../src/modules/grades/GradeRepository';
import { inReportingYear } from '../../src/modules/academicYears/academicRecordYear';
import { gradeInReportingYear } from '../../src/modules/grades/GradeRepository';
import { assessments, grades } from '../../src/database/schema';

const year2025 = {
  id: 'year-2025',
  label: '2025-2026',
  reportingStartsOn: '2025-09-01',
  reportingEndsOn: '2026-08-31',
};

const db = drizzle(async () => ({ rows: [] })) as any;

function where(table: any, condition: unknown) {
  const { sql, params } = db.select().from(table).where(condition).toSQL();
  return { sql: sql.slice(sql.indexOf(' where ') + 7), params };
}

describe('academic record year membership', () => {
  it('keeps the stored year authoritative and dates a legacy row within the inclusive interval', () => {
    const { sql, params } = where(assessments, inReportingYear(assessments.academicYearId, assessments.date, year2025));
    expect(sql).toBe('("assessments"."academic_year_id" = $1 or ("assessments"."academic_year_id" is null and ("assessments"."date" >= $2 and "assessments"."date" <= $3)))');
    expect(params).toEqual(['year-2025', '2025-09-01', '2026-08-31']);
  });

  it('dates a legacy grade only through exactly one joined source', () => {
    const { sql, params } = where(grades, gradeInReportingYear(year2025));
    expect(sql).toBe(
      '("grades"."academic_year_id" = $1 or ("grades"."academic_year_id" is null and ('
      + '("grades"."assessment_id" is not null and "grades"."exam_id" is null and ("assessments"."date" >= $2 and "assessments"."date" <= $3))'
      + ' or ("grades"."exam_id" is not null and "grades"."assessment_id" is null and ("exams"."date" >= $4 and "exams"."date" <= $5)))))',
    );
    expect(params).toEqual(['year-2025', '2025-09-01', '2026-08-31', '2025-09-01', '2026-08-31']);
  });
});

function gradeService(repository: Record<string, unknown>, validator: Record<string, unknown> = {}) {
  return new GradeService(
    repository as any, validator as any, {} as any, {} as any, {} as any, {} as any, {} as any,
  );
}

describe('normal academic list year scope', () => {
  it('passes the resolved year and filters to the assessment and exam reads', async () => {
    const received: unknown[] = [];
    const read = async (filters: unknown) => { received.push(filters); return []; };
    const validator = { ensureTeacherExists: async () => {}, ensureSectionExists: async () => {} };
    await new AssessmentService({ getAll: read } as any, validator as any, {} as any).getAll(year2025 as any);
    await new ExamService({ getAll: read } as any, validator as any, {} as any).getAll(year2025 as any, { teacherId: 't1' });
    expect(received).toEqual([{ year: year2025 }, { year: year2025, teacherId: 't1' }]);
  });

  it('checks a filtered record exists before reading the list', async () => {
    let read = false;
    const service = new AssessmentService(
      { getAll: async () => { read = true; return []; } } as any,
      { ensureSectionExists: async () => { throw new Error('Section not found'); } } as any,
      {} as any,
    );
    await expect(service.getAll(year2025 as any, { sectionId: 'missing' })).rejects.toThrow('Section not found');
    expect(read).toBe(false);
  });

  it('passes the resolved grade year to the list read', async () => {
    const received: unknown[] = [];
    await gradeService({ getAll: async (filters: unknown) => { received.push(filters); return []; } }).getAll(year2025 as any);
    expect(received).toEqual([{ year: year2025 }]);
  });

  it("limits one student's grades and report to the year after checking the student", async () => {
    const calls: unknown[] = [];
    const service = gradeService(
      { getAll: async (filters: unknown) => { calls.push(['read', filters]); return []; } },
      { ensureStudentExists: async (id: string) => { calls.push(['exists', id]); } },
    );
    await service.getByStudent('student-1', year2025 as any);
    const report = await service.getStudentReport('student-1', year2025 as any);
    expect(report).toBeDefined();
    expect(calls).toEqual([
      ['exists', 'student-1'], ['read', { year: year2025, studentId: 'student-1' }],
      ['exists', 'student-1'], ['read', { year: year2025, studentId: 'student-1' }],
    ]);
  });

  it("reads a source's grades after checking the role may use the source's year", async () => {
    const calls: unknown[] = [];
    const service = new GradeService(
      { getByAssessment: async (id: string) => { calls.push(['read', id]); return []; } } as any,
      { ensureAssessmentExists: async () => ({}) } as any,
      { getSourceContext: async () => ({ academicYearId: 'year-2025', date: '2025-10-01' }) } as any,
      { resolveRecord: async (id: string, date: string, role?: string) => { calls.push(['year', id, date, role]); return year2025; } } as any,
      {} as any, {} as any, {} as any,
    );
    await service.getByAssessment('assessment-1', 'teacher');
    expect(calls).toEqual([['year', 'year-2025', '2025-10-01', 'teacher'], ['read', 'assessment-1']]);
  });
});

describe('year-scoped academic list queries', () => {
  async function statement(repo: any, role: string) {
    let captured = { sql: '', params: [] as unknown[] };
    repo.db = drizzle(async (sql, params) => { captured = { sql, params }; return { rows: [] }; });
    repo._scopeCtx = { hasActiveContext: () => true, getUser: () => ({ id: 'user-1', role }) };
    await repo.getAll({ year: year2025 });
    return captured;
  }

  it('keeps ownership and the year in one WHERE for assessments', async () => {
    const { sql, params } = await statement(new AssessmentRepository(), 'parent');
    expect(sql).toContain('where ("assessments"."id" in (select "assessments"."id" from "assessments"');
    expect(sql).toContain(') and ("assessments"."academic_year_id" = $2 or ("assessments"."academic_year_id" is null and ("assessments"."date" >= $3 and "assessments"."date" <= $4))))');
    expect(params).toEqual(['user-1', 'year-2025', '2025-09-01', '2026-08-31']);
  });

  it('reads the year school-wide for a principal', async () => {
    const { sql, params } = await statement(new GradeRepository(), 'principal');
    expect(sql).not.toContain('"grades"."id" in (select');
    expect(sql).toContain('where ("grades"."academic_year_id" = $1 or');
    expect(params).toEqual(['year-2025', '2025-09-01', '2026-08-31', '2025-09-01', '2026-08-31']);
  });

  it('keeps ownership, the student and the year in one WHERE for a student\'s grades', async () => {
    let captured = { sql: '', params: [] as unknown[] };
    const repo: any = new GradeRepository();
    repo.db = drizzle(async (sql, params) => { captured = { sql, params }; return { rows: [] }; });
    repo._scopeCtx = { hasActiveContext: () => true, getUser: () => ({ id: 'user-1', role: 'parent' }) };
    await repo.getAll({ year: year2025, studentId: 'student-1' });
    expect(captured.sql).toContain('where ("grades"."id" in (select "grades"."id" from "grades"');
    expect(captured.sql).toContain(') and ("grades"."academic_year_id" = $2 or');
    expect(captured.sql).toContain(') and "grades"."student_id" = $7)');
    expect(captured.sql.match(/ where /g)?.length).toBe(2);
    expect(captured.params).toEqual(['user-1', 'year-2025', '2025-09-01', '2026-08-31', '2025-09-01', '2026-08-31', 'student-1']);
  });
});
