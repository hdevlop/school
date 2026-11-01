import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import postgres from 'postgres';

const rawUrl = process.env.SCHOOL_HISTORY_TEST_DB_URL;
const password = process.env.SCHOOL_HISTORY_ADMIN_PASSWORD;
if (!rawUrl || !password) throw new Error('History fixture credentials are required');
const target = new URL(rawUrl);
if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname) || target.pathname !== '/school_history_test') {
  throw new Error('Bulk layout acceptance requires local school_history_test');
}
process.env.DB_URL = rawUrl;
const connection = postgres(rawUrl, { max: 1, prepare: false, onnotice: () => {} });
const { server } = await import('../../src/index');
const prefix = `routine-bulk-${crypto.randomUUID()}`;
const ids = ['one', 'two', 'past'].map((suffix) => `${prefix}-${suffix}`);
const year = '2026-2027';
const base = 'http://school.local/api';
let token: string;

async function request(data: unknown, bearer = token) {
  const response = await server.fetch(new Request(`${base}/class-routines/bulk/layout`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Academic-Year': year, ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}) },
    body: JSON.stringify(data),
  }));
  return { status: response.status, body: await response.json() as Record<string, any> };
}

async function snapshot() {
  return {
    periods: await connection`select id, schedule_id, name, start_time, end_time, sort_order from routine_periods where schedule_id = any(${ids}::text[]) order by schedule_id, sort_order`,
    entries: await connection`select id, schedule_id, period_id, content_groups, subject_id from routine_entries where schedule_id = any(${ids}::text[]) order by id`,
  };
}

beforeAll(async () => {
  const [marker] = await connection`select current_database() as database, (select id from school_history_fixture_marker) as marker`;
  expect(marker).toEqual({ database: 'school_history_test', marker: 'academic-history-alerts-v1' });
  const [column] = await connection`select count(*)::int as count from information_schema.columns where table_schema = current_schema() and table_name = 'routine_entries' and column_name = 'subject_id'`;
  if (!column.count) throw new Error('The fixture requires existing migration 0088_routine_lesson_subject before this acceptance test');
  await server.listen(5531);
  const login = await server.fetch(new Request(`${base}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin@history.example.test', password }) }));
  expect(login.status).toBe(200);
  const auth = await login.json() as Record<string, any>;
  token = auth.data?.accessToken ?? auth.accessToken;
  expect(typeof token).toBe('string');
  const [subject] = await connection`select id from subjects order by id limit 1`;
  expect(subject).toBeDefined();
  for (const [index, id] of ids.entries()) {
    const label = index === 2 ? '2025-2026' : year;
    await connection`insert into classes (id, name, academic_year) values (${id}, ${id}, ${label})`;
    await connection`insert into sections (id, class_id, name) values (${id}, ${id}, 'A')`;
    await connection`insert into routine_schedules (id, section_id, academic_year, name, status, active_days) values (${id}, ${id}, ${label}, ${id}, 'published', '["monday"]'::jsonb)`;
    for (const slot of [0, 1]) {
      await connection`insert into routine_periods (id, schedule_id, name, start_time, end_time, sort_order) values
        (${`${id}-p${slot}`}, ${id}, ${`Period ${slot + 1}`}, ${slot ? '09:30' : '08:30'}, ${slot ? '10:30' : '09:30'}, ${slot + 1})`;
    }
  }
  await connection`insert into routine_entries (id, schedule_id, day_of_week, period_id, subject_id, content_groups) values
    (${`${ids[1]}-lesson`}, ${ids[1]}, 'monday', ${`${ids[1]}-p1`}, ${subject.id}, '[{"kind":"fixed","label":"Lecture"}]'::jsonb)`;
});

afterAll(async () => {
  await connection`delete from routine_entries where schedule_id = any(${ids}::text[])`;
  await connection`delete from routine_periods where schedule_id = any(${ids}::text[])`;
  await connection`delete from routine_schedules where id = any(${ids}::text[])`;
  await connection`delete from sections where id = any(${ids}::text[])`;
  await connection`delete from classes where id = any(${ids}::text[])`;
  await connection.end();
  await server.stop();
});

describe('bulk routine layouts on the marked PostgreSQL fixture', () => {
  const periods = [
    { type: 'lesson', name: 'First', startTime: '09:00', endTime: '10:00' },
    { type: 'lesson', name: 'Second', startTime: '10:00', endTime: '11:00' },
  ];

  it('requires authentication and a nonempty target selection', async () => {
    expect((await request({ scheduleIds: [ids[0]], periods }, '')).status).toBe(401);
    expect((await request({ scheduleIds: [], periods })).status).toBe(400);
  });

  it('rolls back the first timetable when the second would lose a lesson', async () => {
    const before = await snapshot();
    expect((await request({ scheduleIds: ids.slice(0, 2), periods: periods.slice(0, 1) })).status).toBe(409);
    expect(await snapshot()).toEqual(before);
  });

  it('updates both timetables together, preserves lesson content and leaves the other year untouched', async () => {
    const before = await snapshot();
    const response = await request({ scheduleIds: [ids[0], ids[1], ids[0]], periods });
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ updated: 2 });
    const after = await snapshot();
    for (const id of ids.slice(0, 2)) {
      expect(after.periods.filter((period) => period.schedule_id === id).map((period) => [period.name, period.start_time, period.end_time]))
        .toEqual([['First', '09:00:00', '10:00:00'], ['Second', '10:00:00', '11:00:00']]);
    }
    expect(after.periods.filter((period) => period.schedule_id === ids[2])).toEqual(before.periods.filter((period) => period.schedule_id === ids[2]));
    expect(after.entries[0].content_groups).toEqual(before.entries[0].content_groups);
    expect(after.entries[0].subject_id).toEqual(before.entries[0].subject_id);
    expect(after.entries[0].period_id).toBe(after.periods.find((period) => period.schedule_id === ids[1] && period.sort_order === 2)!.id);
  });

  it('rejects a cross-year target before changing any selected timetable', async () => {
    const before = await snapshot();
    expect((await request({ scheduleIds: [ids[0], ids[2]], periods })).status).toBe(404);
    expect(await snapshot()).toEqual(before);
  });
});
