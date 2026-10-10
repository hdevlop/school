/**
 * Writes `ownership-sql-baseline.json` from the code as it is now.
 *
 *   bun test ./packages/server/tests/ownership/sqlBaseline/captureOwnershipSqlBaseline.ts
 *
 * Run it only to record behavior that has been reviewed as correct, and commit
 * the fixture on its own. A change to ownership code must never regenerate the
 * baseline it is compared against: when `bun run test:ownership` reports a
 * difference, the difference is the finding to investigate.
 *
 * The file name does not end in `.test.ts`, so ordinary test runs skip it.
 */
import { beforeAll, expect, test } from 'bun:test';
import { writeFileSync } from 'node:fs';
import { BASELINE_PATH, captureAll, freezeEnvironment, toBaseline } from './ownershipSqlCases';

beforeAll(freezeEnvironment);

test('capture the ownership SQL baseline', async () => {
  const baseline = toBaseline(await captureAll());
  writeFileSync(BASELINE_PATH, `${JSON.stringify(baseline, null, 1)}\n`);
  console.log(`Wrote ${Object.keys(baseline.cases).length} cases, ${Object.keys(baseline.outcomes).length} distinct outcomes.`);
  expect(Object.keys(baseline.cases).length).toBeGreaterThan(0);
});
