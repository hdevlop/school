import { describe, expect, it } from 'bun:test';
import { getTableColumns } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pg-proxy';
import { AcademicYearRepository } from '../../src/modules/academicYears/AcademicYearRepository';
import { AcademicYearValidator } from '../../src/modules/academicYears/AcademicYearValidator';
import { academicYears } from '../../src/modules/academicYears/AcademicYearSchema';
import { AssessmentService } from '../../src/modules/assessments/AssessmentService';
import { ExamService } from '../../src/modules/exams/ExamService';
import { resolveRequestYear } from '../../src/modules/academicYears/requestYear';
import { USER } from '../../src/najm';
import { yearRegistry } from './fixtures/yearRegistry';

const oldYear = { id: 'year-old', label: '2025-2026', status: 'closed',
  reportingStartsOn: '2025-09-01', reportingEndsOn: '2026-08-31' };
const activeYear = { id: 'year-active', label: '2026-2027', status: 'open',
  reportingStartsOn: '2026-09-01', reportingEndsOn: '2027-08-31' };
const pointer = { activeAcademicYearId: activeYear.id, currentAcademicYear: activeYear.label };

const HISTORY_ROLES = ['admin', 'principal', 'accounting'];
const ACTIVE_YEAR_ROLES = ['teacher', 'parent', 'student', 'counselor', undefined];

async function statementsFor(match: Parameters<AcademicYearRepository['findWithActivePointer']>[0]) {
  const statements: Array<{ sql: string; params: unknown[] }> = [];
  const repo: any = new AcademicYearRepository();
  repo.db = drizzle(async (sql, params) => { statements.push({ sql, params }); return { rows: [] }; });
  await repo.findWithActivePointer(match);
  return statements;
}

describe('year resolution reads the Settings pointer and the year in one query', () => {
  it('joins the latest Settings row to the named year in a single statement', async () => {
    const byLabel = await statementsFor({ label: '2025-2026' });
    expect(byLabel).toHaveLength(1);
    expect(byLabel[0].sql).toContain('from "settings" order by "settings"."created_at" desc limit');
    expect(byLabel[0].sql).toContain('left join "academic_years" on "academic_years"."label" = $');
    expect(byLabel[0].params).toContain('2025-2026');

    const byId = await statementsFor({ id: 'year-old' });
    expect(byId).toHaveLength(1);
    expect(byId[0].sql).toContain('left join "academic_years" on "academic_years"."id" = $');

    const byDate = await statementsFor({ date: '2026-03-01' });
    expect(byDate).toHaveLength(1);
    expect(byDate[0].sql).toContain('"academic_years"."reporting_starts_on" <= $');
    expect(byDate[0].sql).toContain('"academic_years"."reporting_ends_on" >= $');
  });

  it('prefers the active ID and falls back to the label only without a pointer', async () => {
    const [statement] = await statementsFor(undefined);
    expect(statement.sql).toContain('"academic_years"."id" = "active_pointer"."active_academic_year_id"');
    expect(statement.sql).toContain('"active_pointer"."active_academic_year_id" is null');
    expect(statement.sql).toContain('"academic_years"."label" = "active_pointer"."current_academic_year"');
  });

  it('returns the pointer with a null year when no registered year matches, and null without Settings', async () => {
    const yearColumns = Object.keys(getTableColumns(academicYears)).length;
    const repo: any = new AcademicYearRepository();
    repo.db = drizzle(async () => ({ rows: [[activeYear.id, activeYear.label, ...Array(yearColumns).fill(null)]] }));
    expect<unknown>(await repo.findWithActivePointer({ label: '2030-2031' })).toEqual({
      activeAcademicYearId: activeYear.id, currentAcademicYear: activeYear.label, year: null,
    });
    repo.db = drizzle(async () => ({ rows: [] }));
    expect(await repo.findWithActivePointer({ label: '2030-2031' })).toBeNull();
  });

  it('resolves a year and a dated record with one repository call each', async () => {
    const calls: unknown[] = [];
    const registry = yearRegistry([oldYear, activeYear], pointer);
    const service = new AcademicYearValidator({ findWithActivePointer: async (match: unknown) => { calls.push(match); return registry.findWithActivePointer(match as any); } } as any);
    expect((await service.resolve(oldYear.label, 'admin')).id).toBe(oldYear.id);
    expect((await service.resolve(undefined, 'teacher')).id).toBe(activeYear.id);
    expect((await service.resolveRecord(oldYear.id, null, 'accounting'))?.id).toBe(oldYear.id);
    expect((await service.resolveRecord(null, '2026-10-01', 'teacher'))?.id).toBe(activeYear.id);
    expect(await service.resolveRecord(null, null, 'admin')).toBeNull();
    expect(calls).toEqual([{ label: oldYear.label }, undefined, { id: oldYear.id }, { date: '2026-10-01' }]);
  });

  it('keeps the refusals of the two-step resolution', async () => {
    const service = new AcademicYearValidator(yearRegistry([oldYear, activeYear], pointer) as any);
    await expect(service.resolve('2030-2031', 'admin')).rejects.toThrow('Academic year not found');
    await expect(service.resolve(oldYear.label, 'teacher')).rejects.toThrow('administrators and accounting only');
    await expect(service.resolveRecord('year-missing', null, 'admin')).rejects.toThrow('Academic year not found');
    // A date no registered year holds leaves nothing to check for a history
    // role and is refused for every other role.
    expect(await service.resolveRecord(null, '2031-01-01', 'admin')).toBeNull();
    await expect(service.resolveRecord(null, '2031-01-01', 'teacher')).rejects.toThrow('Record has no accessible academic year');

    const withoutSettings = new AcademicYearValidator(yearRegistry([oldYear, activeYear], null) as any);
    await expect(withoutSettings.resolve(oldYear.label, 'admin')).rejects.toThrow('School settings are missing');
    await expect(withoutSettings.resolveRecord(oldYear.id, null, 'admin')).rejects.toThrow('School settings are missing');
  });
});

describe('the record-year rule, with no switch', () => {
  const registry = () => new AcademicYearValidator(yearRegistry([oldYear, activeYear], pointer) as any);

  it('lets administrators and accounting use a record of another year', async () => {
    for (const role of HISTORY_ROLES) {
      expect<unknown>(await registry().resolveRecord(oldYear.id, null, role)).toEqual(oldYear);
      expect<unknown>(await registry().resolve(oldYear.label, role)).toEqual(oldYear);
    }
  });

  it('refuses a record of another year to a role that works in the active year', async () => {
    for (const role of ACTIVE_YEAR_ROLES) {
      await expect(registry().resolveRecord(oldYear.id, null, role)).rejects.toThrow('administrators and accounting only');
      await expect(registry().resolve(oldYear.label, role)).rejects.toThrow('administrators and accounting only');
      expect<unknown>(await registry().resolveRecord(null, '2026-10-01', role)).toEqual(activeYear);
    }
  });

  it('reads assessments and exams through their scoped repositories', async () => {
    const received: unknown[] = [];
    const read = { getAll: async (filters: unknown) => { received.push(filters); return []; } };
    await new AssessmentService(read as any, {} as any, {} as any).getAll();
    await new ExamService(read as any, {} as any, {} as any).getAll();
    expect(received).toEqual([{}, {}]);
  });
});

describe('the year a request selects (X-Academic-Year header, academicYear query)', () => {
  const validator = () => new AcademicYearValidator(yearRegistry([oldYear, activeYear], pointer) as any);

  it('means the active year for every role, administrators included, when nothing is selected', async () => {
    for (const role of [...HISTORY_ROLES, ...ACTIVE_YEAR_ROLES]) {
      expect((await validator().resolveSelection({}, role)).id).toBe(activeYear.id);
      expect((await validator().resolveSelection({ header: '', query: '  ' }, role)).id).toBe(activeYear.id);
    }
  });

  it('reads the header or the query, and accepts both when they agree', async () => {
    expect((await validator().resolveSelection({ header: oldYear.label }, 'admin')).id).toBe(oldYear.id);
    expect((await validator().resolveSelection({ query: oldYear.label }, 'accounting')).id).toBe(oldYear.id);
    expect((await validator().resolveSelection({ header: oldYear.label, query: oldYear.label }, 'principal')).id)
      .toBe(oldYear.id);
  });

  it('refuses a conflict, "all" and malformed values before reading any year', async () => {
    const calls: unknown[] = [];
    const counted = new AcademicYearValidator({
      findWithActivePointer: async (match: unknown) => { calls.push(match); return null; },
    } as any);
    await expect(counted.resolveSelection({ header: oldYear.label, query: activeYear.label }, 'admin'))
      .rejects.toThrow('disagree');
    for (const bad of ['all', '2025', '2025-2027']) {
      await expect(counted.resolveSelection({ header: bad }, 'admin')).rejects.toThrow('Invalid academic year');
      await expect(counted.resolveSelection({ query: bad }, 'admin')).rejects.toThrow('Invalid academic year');
    }
    expect(calls).toEqual([]);
  });

  it('keeps the role rule: other years stay with administrators and accounting', async () => {
    for (const role of ACTIVE_YEAR_ROLES) {
      await expect(validator().resolveSelection({ header: oldYear.label }, role))
        .rejects.toThrow('administrators and accounting only');
    }
  });
});

describe('the year of one request, as @Year() will inject it', () => {
  function request(headers: Record<string, string>, query: Record<string, unknown>, user?: { role?: string }) {
    const validator = new AcademicYearValidator(yearRegistry([oldYear, activeYear], pointer) as any);
    return {
      header: (name: string) => headers[name.toLowerCase()],
      query: (name: string) => query[name],
      container: {
        get: (token: unknown) => (token === USER ? user : undefined),
        resolve: async () => validator as any,
      },
    };
  }

  it('reads the X-Academic-Year header and the academicYear query value with the actor role', async () => {
    expect((await resolveRequestYear(request({ 'x-academic-year': oldYear.label }, {}, { role: 'admin' }))).id)
      .toBe(oldYear.id);
    expect((await resolveRequestYear(request({}, { academicYear: oldYear.label }, { role: 'accounting' }))).id)
      .toBe(oldYear.id);
    expect((await resolveRequestYear(request({}, {}, { role: 'admin' }))).id).toBe(activeYear.id);
  });

  it('treats a request without a user as a role limited to the active year', async () => {
    expect((await resolveRequestYear(request({}, {}))).id).toBe(activeYear.id);
    await expect(resolveRequestYear(request({ 'x-academic-year': oldYear.label }, {})))
      .rejects.toThrow('administrators and accounting only');
  });
});
