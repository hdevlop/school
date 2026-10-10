import { beforeAll, describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import {
  BASELINE_PATH,
  captureAll,
  freezeEnvironment,
  type Baseline,
  type Outcome,
} from './sqlBaseline/ownershipSqlCases';

/**
 * Every owned read and write, every ownership token and every `ownedIds`
 * subquery must send exactly the SQL and ordered parameters recorded in the
 * committed baseline, for every role. A difference is a change in which rows
 * someone can see: investigate it, never regenerate the baseline to match.
 * See `sqlBaseline/captureOwnershipSqlBaseline.ts`.
 */
const baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf8')) as Baseline;

let actual: Map<string, Outcome>;

beforeAll(async () => {
  freezeEnvironment();
  actual = await captureAll();
});

describe('ownership SQL baseline', () => {
  it('was captured at the frozen time this suite uses', () => {
    expect(baseline.frozenTime).toBe('2026-03-15T10:30:00.000Z');
  });

  it('covers exactly the recorded cases', () => {
    expect([...actual.keys()].sort()).toEqual(Object.keys(baseline.cases).sort());
  });

  it('sends byte-identical SQL with exactly the recorded parameters in every case', () => {
    const differences: string[] = [];
    for (const [name, outcome] of actual) {
      const expected = baseline.outcomes[baseline.cases[name]!];
      if (JSON.stringify(outcome) !== JSON.stringify(expected)) {
        differences.push(`${name}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(outcome)}`);
      }
    }
    expect(differences.slice(0, 5).join('\n\n')).toBe('');
    expect(differences.length).toBe(0);
  });

  it('exercises the ownership paths it claims to: scoped roles reach owned subqueries', () => {
    const scoped = [...actual.entries()].filter(([name, outcome]) =>
      name.startsWith('repository:') && name.endsWith('|role:teacher')
      && !name.includes('(unscoped)')
      && outcome.statements.some((statement) => /"id" in \(select/.test(statement.sql)));
    // Guards against a baseline captured from repositories that silently
    // failed before reaching their reads.
    expect(scoped.length).toBeGreaterThan(100);
  });
});
