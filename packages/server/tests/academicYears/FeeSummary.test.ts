import { expect, it } from 'bun:test';
import { drizzle } from 'drizzle-orm/pg-proxy';
import { FeeRepository } from '../../src/modules/financial/fees/FeeRepository';

it('calculates the summary in one scoped query without loading the student roster', async () => {
  const statements: Array<{ sql: string; params: unknown[] }> = [];
  const repo = new FeeRepository();
  (repo as any).year = { label: '2025-2026' };
  repo.db = drizzle(async (sql, params) => {
    statements.push({ sql, params });
    return { rows: [['1.23', '1.23', '0', '0', '0', '0', '4.56']] };
  }) as any;

  expect(await repo.getSummary()).toEqual({
    collected: '1.23', cash: '1.23', check: '0', bankTransfer: '0', bankDeposit: '0', tpe: '0', overdue: '4.56',
  });
  expect(statements).toHaveLength(1);
  expect(statements[0].params).toContain('2025-2026');
  expect(statements[0].params).toContain('completed');
  expect(statements[0].sql).not.toContain('"students"');
  expect(statements[0].sql).not.toContain('"student_enrollments"');
  expect(statements[0].sql).not.toContain('json_agg');
});
