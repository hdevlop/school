import 'reflect-metadata';
import { describe, expect, it } from 'bun:test';
import { Container } from 'diject';
import { drizzle } from 'drizzle-orm/pg-proxy';
import { ownershipCondition, ScopeContext } from '../../src/auth';
import { competencyDomains, competencyEvaluations, competencyRemarks } from '../../src/database/schema';
import { registerYearPropertyInjector, runWithResolvedYear } from '../../src/modules/academicYears/requestYear';
import { CompetencyDomainOwner, CompetencyEvaluationOwner, CompetencyRemarkOwner } from '../../src/modules/competencies/CompetencyGuards';
import { CompetencyCatalogRepository } from '../../src/modules/competencies/CompetencyCatalogRepository';
import { CompetencyEvaluationRepository } from '../../src/modules/competencies/CompetencyEvaluationRepository';
import { CompetencyRemarkRepository } from '../../src/modules/competencies/CompetencyRemarkRepository';

/** Pinned here, not read from the code under test. */
const SCHOOL_WIDE = ['admin', 'principal', 'accounting', 'secretary', 'driver', 'assistant', 'registrar'];
const YEAR = { id: 'year-1', label: '2026-2027', reportingStartsOn: '2026-09-01', reportingEndsOn: '2027-08-31' };

const db = drizzle(async () => ({ rows: [] }));
const signedIn = (role: string) => ({ hasActiveContext: () => true, getUser: () => ({ id: 'user-1', role }) }) as any;
const domainCondition = (role: string) =>
  db.select({ id: competencyDomains.id }).from(competencyDomains)
    .where(ownershipCondition(db, [CompetencyDomainOwner], signedIn(role))).toSQL();
const evaluationCondition = (role: string) =>
  db.select({ id: competencyEvaluations.id }).from(competencyEvaluations)
    .where(ownershipCondition(db, [CompetencyEvaluationOwner], signedIn(role))).toSQL();

describe('who a competency list belongs to', () => {
  it('a teacher: the list of their own assignment', () => {
    const { sql, params } = domainCondition('teacher');
    expect(sql).toContain('"competency_domains"."teacher_assignment_id"');
    expect(sql).toMatch(/inner join "staff" "\w+" on .+ where "\w+"\."user_id" = \$1/);
    expect(params).toContain('user-1');
  });

  it('a monitor and a supervisor: the list of a section of their classes', () => {
    expect(domainCondition('monitor').sql).toContain('monitor_assignments');
    expect(domainCondition('supervisor').sql).toContain('supervisor_assignments');
    expect(domainCondition('supervisor').sql).not.toContain('monitor_assignments');
  });

  it('a pupil and a parent: the list of a section the pupil sat in that year', () => {
    const student = domainCondition('student');
    expect(student.sql).toContain('student.user_id = $');
    expect(student.sql).toContain('enrollment.academic_year_id = "competency_domains"."academic_year_id"');
    expect(student.sql).toContain('placement.section_id = (select assignment.section_id');
    expect(student.sql).not.toContain('student_parents');
    const parent = domainCondition('parent');
    expect(parent.sql).toContain('join student_parents link on link.student_id = student.id');
    expect(parent.sql).toContain('parent.user_id = $');
  });

  it('the school-wide roles: every list; any other role: none', () => {
    for (const role of SCHOOL_WIDE) expect(domainCondition(role).sql, role).not.toContain('1 = 0');
    for (const role of ['custom-role', 'nurse']) expect(domainCondition(role).sql, role).toContain('1 = 0');
  });
});

describe('who a level belongs to', () => {
  it('a pupil, and the parents of that pupil', () => {
    const student = evaluationCondition('student');
    expect(student.sql).toContain('"competency_evaluations"."student_id"');
    expect(student.sql).not.toContain('student_parents');
    const parent = evaluationCondition('parent');
    expect(parent.sql).toContain('"student_parents"');
    expect(parent.params).toContain('user-1');
  });

  it('the teacher whose list it was set in', () => {
    const { sql } = evaluationCondition('teacher');
    expect(sql).toContain('"competency_evaluations"."competency_id"');
    expect(sql).toContain('"competency_domains"');
    expect(sql).toContain('"teacher_assignments"');
    expect(sql).not.toContain('student_parents');
  });

  it('the monitor and supervisor of that section; any other role: none', () => {
    expect(evaluationCondition('monitor').sql).toContain('monitor_assignments');
    expect(evaluationCondition('supervisor').sql).toContain('supervisor_assignments');
    for (const role of SCHOOL_WIDE) expect(evaluationCondition(role).sql, role).not.toContain('1 = 0');
    for (const role of ['custom-role', 'nurse']) expect(evaluationCondition(role).sql, role).toContain('1 = 0');
  });
});

const remarkCondition = (role: string) =>
  db.select({ id: competencyRemarks.id }).from(competencyRemarks)
    .where(ownershipCondition(db, [CompetencyRemarkOwner], signedIn(role))).toSQL();

describe('who a remark for the parents belongs to', () => {
  it('a pupil, and the parents of that pupil', () => {
    const student = remarkCondition('student');
    expect(student.sql).toContain('"competency_remarks"."student_id"');
    expect(student.sql).not.toContain('student_parents');
    const parent = remarkCondition('parent');
    expect(parent.sql).toContain('"student_parents"');
    expect(parent.params).toContain('user-1');
  });

  it('the teacher of the class and subject it was written in', () => {
    const { sql } = remarkCondition('teacher');
    expect(sql).toContain('"competency_remarks"."teacher_assignment_id"');
    expect(sql).toContain('"teacher_assignments"');
    expect(sql).not.toContain('student_parents');
  });

  it('the monitor and supervisor of that section, named in full; any other role: none', () => {
    for (const role of ['monitor', 'supervisor']) {
      expect(remarkCondition(role).sql, role).toContain('assignment.id = "competency_remarks"."teacher_assignment_id"');
    }
    expect(remarkCondition('monitor').sql).toContain('monitor_assignments');
    expect(remarkCondition('supervisor').sql).toContain('supervisor_assignments');
    for (const role of SCHOOL_WIDE) expect(remarkCondition(role).sql, role).not.toContain('1 = 0');
    for (const role of ['custom-role', 'nurse']) expect(remarkCondition(role).sql, role).toContain('1 = 0');
  });
});

describe('competency reads', () => {
  async function capture<T extends object>(Repo: new () => T, role: string, read: (repository: T) => Promise<unknown>) {
    const statements: Array<{ sql: string; params: unknown[] }> = [];
    const container = Container.create();
    registerYearPropertyInjector(container);
    container.set(ScopeContext as any);
    container.set(Repo as any);
    const repository = await container.resolve(Repo as any) as T & { db: unknown };
    repository.db = drizzle(async (sql, params) => { statements.push({ sql, params }); return { rows: [] }; }) as any;
    await container.run({ user: { id: 'user-1', role } }, () => runWithResolvedYear(container, YEAR as any, () => read(repository)));
    return statements;
  }

  // Drizzle's .where() replaces the previous one: ownership, the year and the
  // filter must arrive in a single condition.
  it('keep ownership, the year and the filter in one condition', async () => {
    const [catalog] = await capture(CompetencyCatalogRepository, 'teacher', (repo) => repo.catalog('assignment-1'));
    expect(catalog.sql.match(/ where /g)?.length).toBeGreaterThan(0);
    expect(catalog.sql).toContain('"competency_domains"."academic_year_id" = $');
    expect(catalog.params).toEqual(expect.arrayContaining(['user-1', 'year-1', 'assignment-1']));
    // Each domain's competencies: the outer domain, not the competency's own id.
    expect(catalog.sql).toContain('where item.domain_id = "competency_domains"."id"');

    const [levels] = await capture(CompetencyEvaluationRepository, 'parent', (repo) => repo.forAssignment('assignment-1', ['2026-12', '2026-09']));
    expect(levels.sql).toContain('"competency_evaluations"."academic_year_id" = $');
    expect(levels.sql).toContain('"student_parents"');
    expect(levels.params).toEqual(expect.arrayContaining(['user-1', 'year-1', 'assignment-1', '2026-12', '2026-09']));

    const [remarks] = await capture(CompetencyRemarkRepository, 'parent', (repo) => repo.forAssignment('assignment-1', '2026-12', 'pupil-1'));
    expect(remarks.sql).toContain('"competency_remarks"."academic_year_id" = $');
    expect(remarks.sql).toContain('"student_parents"');
    expect(remarks.params).toEqual(expect.arrayContaining(['user-1', 'year-1', 'assignment-1', '2026-12', 'pupil-1']));
  });

  it('read nothing for a role with no rule', async () => {
    const [levels] = await capture(CompetencyEvaluationRepository, 'nurse', (repo) => repo.forAssignment('assignment-1', ['2026-12']));
    expect(levels.sql).toContain('1 = 0');
    const [remarks] = await capture(CompetencyRemarkRepository, 'nurse', (repo) => repo.forAssignment('assignment-1', '2026-12'));
    expect(remarks.sql).toContain('1 = 0');
  });
});
