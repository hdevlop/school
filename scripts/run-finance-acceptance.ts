import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import postgres from 'postgres';

const fixtureUrl = process.env.SCHOOL_HISTORY_TEST_DB_URL;
if (!fixtureUrl || !process.env.SCHOOL_HISTORY_ADMIN_PASSWORD || !process.env.SCHOOL_HISTORY_PRINCIPAL_PASSWORD) {
  throw new Error('Set SCHOOL_HISTORY_TEST_DB_URL, SCHOOL_HISTORY_ADMIN_PASSWORD and SCHOOL_HISTORY_PRINCIPAL_PASSWORD for the seeded history fixture');
}
const target = new URL(fixtureUrl);
if (!['postgres:', 'postgresql:'].includes(target.protocol)
  || !['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)
  || target.pathname !== '/school_history_test') {
  throw new Error('Finance acceptance runs only on local school_history_test');
}
const connection = postgres(fixtureUrl, { max: 1, prepare: false, onnotice: () => {} });
try {
  const marker = await connection<{ id: string }[]>`select id from school_history_fixture_marker`;
  if (marker.length !== 1 || marker[0].id !== 'academic-history-alerts-v1') {
    throw new Error('The database is not the marked history acceptance fixture');
  }
} finally { await connection.end(); }

const modules = ['Allocations', 'Credits', 'Expenses', 'Fees', 'FeeTypes', 'FinancialAudit',
  'FinancialNotifications', 'Installments', 'Payments', 'Payroll', 'Rollover'];
const cases = [...modules.flatMap(name => [`${name}HistoryDatabase`, `${name}HistoryTransport`]),
  'FinanceLifecycleTransport'];
const requested = process.argv.slice(2);
if (requested.some(name => !cases.includes(name))) throw new Error(`Choose from: ${cases.join(', ')}`);
const selected = requested.length ? requested : cases;
const output = join(process.cwd(), '.cache', 'finance-review');
await mkdir(output, { recursive: true });
const results: Array<{ name: string; exitCode: number; pass: number; fail: number }> = [];

// One server per process; isolate Redis so tests do not share the school's
// auth rate-limit buckets or cached responses. No outgoing email transport.
const env = { ...process.env, DB_URL: fixtureUrl, NODE_ENV: 'development', REDIS_URL: '', EMAIL_PROVIDER: 'console' };
for (const name of selected) {
  const child = Bun.spawn(['bun', 'test', `packages/server/tests/acceptance/${name}.test.ts`, '--timeout', '60000'], {
    env, stdout: 'pipe', stderr: 'pipe',
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited,
  ]);
  const log = stdout + stderr;
  await writeFile(join(output, `${name}.log`), log);
  const pass = Number(log.match(/\n\s*(\d+) pass\b/)?.[1] ?? 0);
  const fail = Number(log.match(/\n\s*(\d+) fail\b/)?.[1] ?? 0);
  results.push({ name, exitCode, pass, fail });
  console.log(`${name}: ${pass} passed, ${fail} failed (exit ${exitCode})`);
}
await writeFile(join(output, 'summary.json'), JSON.stringify(results, null, 2) + '\n');
console.log(`Logs: ${output}`);
process.exitCode = results.some(result => result.exitCode !== 0) ? 1 : 0;
