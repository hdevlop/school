#!/usr/bin/env bun

/** Add the reviewed Alert cases only to the marked disposable history database. */
import postgres from 'postgres';
import { historyAlertCases, historyFixtureExpected, historyYears } from './alertsHistoryManifest';

const rawUrl = process.env.SCHOOL_HISTORY_TEST_DB_URL;
if (!rawUrl) throw new Error('SCHOOL_HISTORY_TEST_DB_URL is required');
const target = new URL(rawUrl);
if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)
  || target.pathname !== '/school_history_test') throw new Error('Expected local school_history_test');

const connection = postgres(rawUrl, { max: 1, prepare: false, onnotice: () => {} });
try {
  await connection.begin(async (transaction) => {
    const tx = transaction as unknown as typeof connection;
    const [identity] = await tx<{ database: string; marker: string; students: number }[]>`
      select current_database() as database,
             (select id from school_history_fixture_marker) as marker,
             (select count(*)::int from students) as students
    `;
    if (identity.database !== 'school_history_test'
      || identity.marker !== 'academic-history-alerts-v1'
      || identity.students !== historyFixtureExpected.studentIdentities) {
      throw new Error('History fixture identity or student count differs');
    }
    // Alert routes check permissions, and the seeded admin role holds every one.
    await tx`
      insert into permissions (id, name, resource, action)
      values ('history-permission-all', '*:*', '*', '*')
      on conflict (name) do nothing
    `;
    await tx`
      insert into role_permissions (role_id, permission_id)
      select 'history-role-admin', id from permissions where name = '*:*'
      on conflict do nothing
    `;
    for (const alert of historyAlertCases) {
      const yearId = alert.year ? historyYears.find((year) => year.label === alert.year)?.id : null;
      if (alert.year && !yearId) throw new Error(`Unknown alert year ${alert.year}`);
      await tx`
        insert into alerts (id, type, title, message, priority, status,
                            student_id, academic_year_id, target_audience)
        values (${alert.id}, ${alert.type}, ${`History ${alert.id}`},
                ${`History fixture message for ${alert.id}`}, 'medium', 'active',
                ${alert.studentId}, ${yearId}, 'all')
        on conflict (id) do nothing
      `;
    }
    const stored = await tx<{ id: string; yearId: string | null }[]>`
      select id, academic_year_id as "yearId" from alerts order by id
    `;
    const expected = historyAlertCases.map((alert) => ({
      id: alert.id,
      yearId: alert.year ? historyYears.find((year) => year.label === alert.year)!.id : null,
    })).sort((a, b) => a.id.localeCompare(b.id));
    if (JSON.stringify(stored) !== JSON.stringify(expected)) {
      throw new Error('Alert fixture rows differ from the reviewed manifest');
    }
  });
  console.log('Academic history Alert cases committed: 5 year-owned, 2 shared');
} finally {
  await connection.end();
}
