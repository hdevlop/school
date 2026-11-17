import 'reflect-metadata';
import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { getRoutes } from 'najm-core';
import { getGuardMetadata } from 'najm-guard';
import { yearScopedModules } from '../../src/config/yearScope';
import { CompetencyController } from '../../src/modules/competencies/CompetencyController';
import { CompetencyValidator, monthBounds } from '../../src/modules/competencies/CompetencyValidator';
import { setEvaluationDto, setRemarkDto } from '../../src/modules/competencies/CompetencyDto';
import { withEnglishMessages } from '../support/englishMessages';

const seedData = (name: string) => JSON.parse(readFileSync(
  new URL(`../../src/modules/seed-data/admin/${name}.json`, import.meta.url), 'utf8',
));
const ALL = ['create:competencies', 'read:competencies', 'update:competencies', 'delete:competencies'];
const can = (permission: string) => [['AuthGuard', null], ['PermissionGuard', permission]];

function guards(method: string) {
  return getGuardMetadata(CompetencyController, method).map((guard: any) => [guard.guardClass?.name, guard.params ?? null]);
}

describe('competency permissions', () => {
  const grants: Record<string, string[]> = Object.fromEntries(
    (seedData('rolePermissions') as { roleName: string; permissions: string[] }[]).map((row) => [row.roleName, row.permissions]),
  );
  const of = (role: string) => grants[role].filter((name) => name.endsWith(':competencies') && !name.startsWith('sidebar:')).sort();

  it('are declared, one per action', () => {
    const declared = (seedData('permissions') as { name: string; resource: string; action: string }[])
      .filter((permission) => permission.resource === 'competencies');
    expect(declared.map((permission) => permission.name).sort()).toEqual([...ALL].sort());
    for (const permission of declared) expect(permission.name).toBe(`${permission.action}:competencies`);
  });

  it('let a teacher build and evaluate, and the class and its families read', () => {
    expect(of('teacher')).toEqual([...ALL].sort());
    expect(of('principal')).toEqual([...ALL].sort());
    for (const reader of ['monitor', 'supervisor', 'parent', 'student']) expect(of(reader), reader).toEqual(['read:competencies']);
    for (const other of ['accounting', 'secretary', 'driver', 'assistant', 'registrar']) expect(of(other), other).toEqual([]);
  });
});

describe('competency routes', () => {
  it('each ask for the permission of what they do', () => {
    const expected: Record<string, string> = {
      listAssignments: 'read:competencies', getCatalog: 'read:competencies', getEvaluations: 'read:competencies', getStudentSheet: 'read:competencies',
      createDomain: 'create:competencies', createCompetency: 'create:competencies', copyCatalog: 'create:competencies', applyDefault: 'create:competencies',
      updateDomain: 'update:competencies', updateCompetency: 'update:competencies', setEvaluation: 'update:competencies', setRemark: 'update:competencies',
      deleteDomain: 'delete:competencies', deleteCompetency: 'delete:competencies',
    };
    const routes = getRoutes(CompetencyController).map((route) => route.methodName).sort();
    expect(routes).toEqual(Object.keys(expected).sort());
    for (const [method, permission] of Object.entries(expected)) expect(guards(method), method).toEqual(can(permission));
  });

  it('read the year the request selected', () => {
    expect(yearScopedModules.competencies).toBe(CompetencyController);
  });
});

describe('competency writes', () => {
  const YEAR = { id: 'year-1', label: '2026-2027', reportingStartsOn: '2026-09-01', reportingEndsOn: '2027-08-31' };

  function validator(assignment: { teacherUserId: string | null } | null = { teacherUserId: 'teacher-user' }) {
    const catalog = { findAssignment: async () => assignment && { id: 'a1', sectionId: 's1', subjectId: 'sub', ...assignment } };
    const v = withEnglishMessages(new CompetencyValidator(catalog as any, {} as any));
    Object.defineProperty(v, 'year', { value: YEAR });
    return v;
  }
  const refusal = async (run: () => unknown) => {
    try { await run(); } catch (error: any) { return { status: error.status ?? error.statusCode, message: error.message }; }
    return null;
  };

  it('are refused to a monitor, a supervisor and a family, whatever the permission', async () => {
    for (const role of ['monitor', 'supervisor', 'parent', 'student', 'custom-role']) {
      expect(await refusal(() => validator().ensureMayWrite({ id: 'u', role })), role).not.toBeNull();
    }
    for (const role of ['teacher', 'admin', 'principal']) {
      expect(await refusal(() => validator().ensureMayWrite({ id: 'u', role })), role).toBeNull();
    }
  });

  it('let a teacher write only to their own class and subject', async () => {
    expect(await refusal(() => validator().ensureWritableAssignment('a1', { id: 'teacher-user', role: 'teacher' }))).toBeNull();
    expect((await refusal(() => validator().ensureWritableAssignment('a1', { id: 'another', role: 'teacher' })))?.status).toBe(403);
    expect((await refusal(() => validator({ teacherUserId: null }).ensureWritableAssignment('a1', { id: 'another', role: 'teacher' })))?.status).toBe(403);
    expect(await refusal(() => validator().ensureWritableAssignment('a1', { id: 'someone', role: 'principal' }))).toBeNull();
    expect((await refusal(() => validator(null).ensureWritableAssignment('a1', { id: 'someone', role: 'principal' })))?.status).toBe(404);
  });

  it('take a month of the selected year only, and compare it with the year\'s first', async () => {
    const v = validator();
    expect(v.baselineMonth()).toBe('2026-09');
    for (const month of ['2026-09', '2027-01', '2027-08']) expect(await refusal(() => v.ensureMonthInYear(month)), month).toBeNull();
    for (const month of ['2026-08', '2027-09']) expect((await refusal(() => v.ensureMonthInYear(month)))?.status, month).toBe(400);
  });

  it('bound a month to its first day and the next month\'s', () => {
    expect(monthBounds('2026-12')).toEqual({ start: '2026-12-01', end: '2027-01-01' });
    expect(monthBounds('2027-02')).toEqual({ start: '2027-02-01', end: '2027-03-01' });
  });

  it('take a level or null, and no other value', () => {
    const base = { competencyId: 'c', studentId: 's', month: '2026-12' };
    expect(setEvaluationDto.safeParse({ ...base, level: 'advanced' }).success).toBe(true);
    expect(setEvaluationDto.safeParse({ ...base, level: null }).success).toBe(true);
    expect(setEvaluationDto.safeParse({ ...base, level: 'excellent' }).success).toBe(false);
    expect(setEvaluationDto.safeParse({ ...base, month: '2026-13', level: 'advanced' }).success).toBe(false);
  });

  it('take a remark for the parents up to 1000 characters, trimmed; empty clears it', () => {
    const base = { teacherAssignmentId: 'a', studentId: 's', month: '2026-12' };
    expect(setRemarkDto.parse({ ...base, body: '  Bon travail.  ' }).body).toBe('Bon travail.');
    expect(setRemarkDto.parse({ ...base, body: '   ' }).body).toBe('');
    const long = setRemarkDto.safeParse({ ...base, body: 'x'.repeat(1001) });
    expect(long.success).toBe(false);
    expect(long.error?.issues[0]?.message).toBe('competencies.errors.remarkTooLong');
  });
});

// A role with a configured sidebar shows only the entries it was granted:
// without 0126, Compétences stayed out of a teacher's menu.
describe('the competencies sidebar migration', () => {
  const sql = readFileSync(new URL('../../src/database/migrations/0126_competencies_sidebar.sql', import.meta.url), 'utf8');

  it('declares the entry the sidebar asks for', () => {
    expect(sql).toContain(`'sidebar:competencies'`);
    expect((seedData('permissions') as { name: string }[]).some((permission) => permission.name === 'sidebar:competencies')).toBe(true);
  });

  it('grants it only to roles whose sidebar was configured, among those that read competencies', () => {
    expect(sql).toContain(`flag."name" = 'sidebar:configured'`);
    expect(sql).toContain(`('admin', 'principal', 'teacher', 'supervisor', 'monitor', 'parent', 'student')`);
    expect(sql).not.toContain('registrar');
  });

  it('places it after Grades in a saved order, once', () => {
    expect(sql).toContain(`WHERE saved.value = '"/grades"'::jsonb`);
    expect(sql).toContain(`NOT ("item_order" ? '/competencies')`);
  });
});
