import { expect, it } from 'bun:test';
import { drizzle } from 'drizzle-orm/pg-proxy';
import { AlertRepository } from '../../src/modules/alerts/AlertRepository';

it('adds selected-year student filter IDs to alerts without using current placement or dropping ownership', async () => {
  let captured = { sql: '', params: [] as unknown[] };
  const repo: any = new AlertRepository();
  Object.defineProperty(repo, 'year', { value: { id: 'past-year' } });
  repo.db = drizzle(async (sql, params) => { captured = { sql, params }; return { rows: [] }; });
  repo._scopeCtx = { hasActiveContext: () => true, getUser: () => ({ id: 'parent-user', role: 'parent' }) };
  await repo.getAll();
  expect(captured.sql).toContain('select distinct on ("student_enrollments"."student_id")');
  expect(captured.sql).toContain('"student_enrollments"."academic_year_id" = $');
  expect(captured.sql).toContain('"student_enrollment_placements"."valid_from" desc');
  expect(captured.sql).toContain('"alerts"."academic_year_id" = $');
  expect(captured.sql).toMatch(/"(?:_sc_)?parents(?:_\d+)?"\."user_id" = \$/);
  expect(captured.sql).not.toContain('"students"."section_id"');
  expect(captured.params).toEqual(expect.arrayContaining(['past-year', 'parent-user']));
});

it('keeps trusted fee alert creation usable without an HTTP year context', async () => {
  let captured = { sql: '', params: [] as unknown[] };
  const repo: any = new AlertRepository();
  const db = drizzle(async (sql, params) => { captured = { sql, params }; return { rows: [] }; });
  repo.db = {
    select: db.select.bind(db),
    selectDistinctOn: db.selectDistinctOn.bind(db),
    insert: () => ({ values: () => ({ returning: async () => [{ id: 'fee-alert' }] }) }),
  };
  await repo.createFromSourceYear({ studentId: 's1', type: 'reminder' }, 'fee-year');
  expect(captured.params).toEqual(['fee-year', 'fee-alert', 'fee-year', 1]);
  expect(captured.sql).toContain('"student_enrollments"."academic_year_id" = $1');
});
