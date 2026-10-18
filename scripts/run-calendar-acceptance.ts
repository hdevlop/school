import { mkdir, writeFile } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import postgres from 'postgres';

const sourceUrl = process.env.SCHOOL_HISTORY_TEST_DB_URL;
if (!sourceUrl || !process.env.SCHOOL_HISTORY_ADMIN_PASSWORD) throw Error('History fixture URL and admin password are required');
const sourceTarget = new URL(sourceUrl);
if (!['localhost', '127.0.0.1', '[::1]'].includes(sourceTarget.hostname)
  || sourceTarget.pathname !== '/school_history_test') throw Error('Expected local school_history_test');
const databaseName = 'school_calendar_boundary_test';
const fixtureTarget = new URL(sourceTarget); fixtureTarget.pathname = `/${databaseName}`;
const managementTarget = new URL(sourceTarget); managementTarget.pathname = '/postgres';
const options = { max: 1, prepare: false, onnotice: () => {} };
const management = postgres(managementTarget.toString(), options);
const source = postgres(sourceUrl, options);
const directory = '.cache/calendar-boundaries';
await mkdir(directory, { recursive: true });
const ownershipMarker = randomUUID();
const tables = ['fees', 'fee_installments', 'payments', 'payment_allocations', 'settings', 'academic_years', 'students', 'student_enrollments'];
let created = false;

async function snapshot() {
  const result: Record<string, { count: number; sha256: string }> = {};
  for (const table of tables) {
    const rows = await source`select to_jsonb(t) as record from ${source(table)} t order by id`;
    result[table] = { count: rows.length, sha256: createHash('sha256').update(JSON.stringify(rows)).digest('hex') };
  }
  return result;
}

try {
  const marker = await source<{ id: string }[]>`select id from school_history_fixture_marker`;
  if (marker.length !== 1 || marker[0].id !== 'academic-history-alerts-v1') throw Error('Source fixture marker mismatch');
  const before = await snapshot();
  await writeFile(`${directory}/source-before.json`, JSON.stringify(before, null, 2));
  await source.end(); // PostgreSQL template copies require no other source connections.
  if ((await management`select datname from pg_database where datname=${databaseName}`).length) {
    throw Error('Calendar fixture database already exists; inspect it instead of overwriting it');
  }
  await management.unsafe('CREATE DATABASE "school_calendar_boundary_test" TEMPLATE "school_history_test"');
  created = true;
  await writeFile(`${directory}/ownership-private.json`, JSON.stringify({ databaseName, ownershipMarker }));
  const fixture = postgres(fixtureTarget.toString(), options);
  try {
    await fixture`create table school_calendar_fixture_marker(id text primary key)`;
    await fixture`insert into school_calendar_fixture_marker(id) values(${ownershipMarker})`;
  } finally { await fixture.end(); }

  const child = Bun.spawn(['bun', 'test', 'packages/server/tests/acceptance/CalendarBoundariesTransport.test.ts', '--timeout', '60000'], {
    env: { ...process.env, DB_URL: fixtureTarget.toString(), SCHOOL_CALENDAR_TEST_DB_URL: fixtureTarget.toString(),
      SCHOOL_CALENDAR_TEST_MARKER: ownershipMarker, REDIS_URL: '', EMAIL_PROVIDER: 'console',
      NOTIFICATIONS_DISPATCH_ENABLED: 'false', NOTIFICATIONS_PUSH_ENABLED: 'false', NODE_ENV: 'development' },
    stdout: 'pipe', stderr: 'pipe',
  });
  const [stdout, stderr, code] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
  await writeFile(`${directory}/acceptance.log`, stdout + stderr);
  const summary = { exitCode: code, pass: Number(stderr.match(/\b(\d+) pass\b/)?.[1] ?? 0), fail: Number(stderr.match(/\b(\d+) fail\b/)?.[1] ?? 0) };
  await writeFile(`${directory}/summary.json`, JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary));
  process.exitCode = code;

  const original = postgres(sourceUrl, options);
  try {
    const after: typeof before = {};
    for (const table of tables) {
      const rows = await original`select to_jsonb(t) as record from ${original(table)} t order by id`;
      after[table] = { count: rows.length, sha256: createHash('sha256').update(JSON.stringify(rows)).digest('hex') };
    }
    const unchanged = tables.every(table => JSON.stringify(before[table]) === JSON.stringify(after[table]));
    await writeFile(`${directory}/source-comparison.json`, JSON.stringify({ unchanged, before, after }, null, 2));
    if (!unchanged) throw Error('Original fixture changed during the run; inspect the table comparison');
  } finally { await original.end(); }
} finally {
  try {
    await source.end();
    if (created) {
      const fixture = postgres(fixtureTarget.toString(), options);
      try {
        const marker = await fixture<{ id: string }[]>`select id from school_calendar_fixture_marker`;
        if (marker.length !== 1 || marker[0].id !== ownershipMarker) throw Error('Refuse cleanup: ownership marker mismatch');
      } finally { await fixture.end(); }
      const connections = await management<{ count: number }[]>`select count(*)::int as count from pg_stat_activity where datname=${databaseName}`;
      if (connections[0].count) throw Error('Refuse cleanup while the owned test database has active connections');
      await management.unsafe('DROP DATABASE "school_calendar_boundary_test"');
      const removed = (await management`select datname from pg_database where datname=${databaseName}`).length === 0;
      await writeFile(`${directory}/cleanup.json`, JSON.stringify({ database: databaseName, ownedMarkerVerified: true, removed }, null, 2));
      if (!removed) throw Error('Owned calendar database still exists');
    }
  } finally { await management.end(); }
}
