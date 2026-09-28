#!/usr/bin/env bun

/** Add Announcements only to the marked disposable history database. */
import postgres from 'postgres';
import { historyAnnouncementCases, historyFixtureExpected, historyYears } from './alertsHistoryManifest';

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
    for (const permission of [
      { id: 'history-permission-all', name: '*:*', resource: '*', action: '*', role: 'admin' },
      ...['create', 'read', 'update', 'delete'].map((action) => ({
        id: `history-permission-${action}-announcements`, name: `${action}:announcements`,
        resource: 'announcements', action, role: 'principal',
      })),
    ]) {
      await tx`
        insert into permissions (id, name, resource, action)
        values (${permission.id}, ${permission.name}, ${permission.resource}, ${permission.action})
        on conflict (name) do nothing
      `;
      const [stored] = await tx<{ id: string }[]>`
        select id from permissions where name = ${permission.name}
      `;
      await tx`
        insert into role_permissions (role_id, permission_id)
        values (${`history-role-${permission.role}`}, ${stored.id})
        on conflict do nothing
      `;
    }
    for (const item of historyAnnouncementCases) {
      const yearId = historyYears.find((year) => year.label === item.year)?.id;
      if (!yearId) throw new Error(`Unknown announcement year ${item.year}`);
      const classIds = item.classId ? tx.json([item.classId]) : null;
      await tx`
        insert into announcements (
          id, academic_year_id, user_id, class_id, class_ids, title, content,
          target_audience, is_published, publish_date, expiry_date
        ) values (
          ${item.id}, ${yearId}, 'history-admin', ${item.classId}, ${classIds},
          ${`History ${item.id}`}, ${`History fixture content for ${item.id}`},
          ${item.audience}, ${item.published}, ${item.publishDate}, ${item.expiryDate}
        ) on conflict (id) do update set class_ids = excluded.class_ids
      `;
    }
    await tx`
      insert into announcements (id, user_id, title, content, target_audience, is_published)
      values ('history-announcement-unresolved', 'history-admin', 'Unresolved historical notice',
              'A legacy notice with no verified academic year.', 'all', true)
      on conflict (id) do nothing
    `;
    const stored = await tx<{ id: string; yearId: string | null; classId: string | null }[]>`
      select id, academic_year_id as "yearId", class_id as "classId" from announcements order by id
    `;
    const expected = [...historyAnnouncementCases.map((item) => ({
      id: item.id, yearId: historyYears.find((year) => year.label === item.year)!.id,
      classId: item.classId,
    })), { id: 'history-announcement-unresolved', yearId: null, classId: null }]
      .sort((a, b) => a.id.localeCompare(b.id));
    if (JSON.stringify(stored) !== JSON.stringify(expected)) {
      throw new Error('Announcement fixture rows differ from the reviewed manifest');
    }
  });
  console.log('Academic history Announcement cases committed: 4 year-owned, 1 unresolved');
} finally {
  await connection.end();
}
