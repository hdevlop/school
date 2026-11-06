import 'reflect-metadata';
import { describe, expect, it } from 'bun:test';
import { Container } from 'diject';
import { drizzle } from 'drizzle-orm/pg-proxy';
import { ownershipCondition, ScopeContext } from '../../src/auth';
import { MassarSheet } from '../../src/modules/massar/MassarGuards';
import { massarSheets } from '../../src/modules/massar/massarSchema';
import { MassarRepository } from '../../src/modules/massar/MassarRepository';
import { registerYearPropertyInjector, runWithResolvedYear } from '../../src/modules/academicYears/requestYear';
const db = drizzle(async () => ({ rows: [] }));
describe('Massar ownership', () => {
  it('restricts teachers to the exact sheet assignment, including its subject', () => {
    const context = { hasActiveContext: () => true, getUser: () => ({ id: 'teacher-user', role: 'teacher' }) } as any;
    const query = db.select().from(massarSheets).where(ownershipCondition(db, [MassarSheet], context)).toSQL();
    expect(query.sql).toContain('assignment.id = "massar_sheets"."teacher_assignment_id"');
    expect(query.sql).not.toContain('or exists'); expect(query.params).toContain('teacher-user');
  });
  it('limits supervisors to currently supervised mapped classes, and monitors, unknown and family roles to nothing', () => {
    const condition = (role: string) => db.select().from(massarSheets).where(ownershipCondition(db, [MassarSheet], { hasActiveContext: () => true, getUser: () => ({ id: 'reader', role }) } as any)).toSQL();
    expect(condition('supervisor').sql).toContain("supervised.status = 'active'"); expect(condition('supervisor').sql).toContain('mapped.class_id');
    for (const role of ['floor_manager','parent','student','custom']) expect(condition(role).sql).toContain('1 = 0');
  });
  it('requires a year scope and keeps owned sheet/mark/round reads inside that scope', async () => {
    const statements: Array<{ sql: string; params: unknown[] }> = [];
    const container = Container.create(); registerYearPropertyInjector(container); container.set(ScopeContext as any); container.set(MassarRepository);
    const repository = await container.resolve(MassarRepository);
    repository.db = drizzle(async (sql, params) => { statements.push({ sql, params }); return { rows: [] }; }) as any;
    await expect(repository.sheets()).rejects.toThrow('Resolved academic year is missing');
    await container.run({ user: { id: 'teacher-user', role: 'teacher' } }, () => runWithResolvedYear(container, { id: 'selected-year' } as any, async () => {
      await repository.sheets(); await repository.sheetById('sheet-1'); await repository.marks('sheet-1'); await repository.rounds(); await repository.hiddenIds('sheet-1'); await repository.completedMarkCounts('round-1');
    }));
    for (const statement of statements) { expect(statement.sql).toContain('teacher_assignments'); expect(statement.params).toContain('selected-year'); }
    const count = statements.at(-1)!;
    expect(count.sql).toContain('count(*)'); expect(count.sql).toContain('group by'); expect(count.params).toContain('round-1');
  });
});
