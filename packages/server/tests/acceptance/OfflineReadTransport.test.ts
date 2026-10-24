/** Opt-in: marked local fixture only. Never migrates or writes the main School database. */
import 'reflect-metadata';
import { afterAll, beforeAll, expect, test } from 'bun:test';
import { readFile } from 'node:fs/promises';
import postgres from 'postgres';
import { canonicalJson, sha256 } from 'najm-database/sync/contracts';

const raw = process.env.SCHOOL_HISTORY_TEST_DB_URL;
if (!raw || !process.env.SCHOOL_HISTORY_ADMIN_PASSWORD) throw new Error('History fixture credentials are required');
const url = new URL(raw);
if (!['localhost', '127.0.0.1'].includes(url.hostname) || url.pathname !== '/school_history_test') throw new Error('Expected local school_history_test');
process.env.DB_URL = raw;
const sql = postgres(raw, { max: 1, onnotice() {} });
const [{ id: marker }] = await sql`select id from school_history_fixture_marker`;
if (marker !== 'academic-history-alerts-v1') throw new Error('Unrecognized fixture');
const { server } = await import('../../src/index');
const base = 'http://school.local/api';
const installation = { installationId: crypto.randomUUID(), installationEpoch: crypto.randomUUID() };
let admin: string;
let restricted: string;
let roleId: string;
const suffix = crypto.randomUUID();
const userId = 'offline-parent-' + suffix;
const parentId = 'offline-parent-record-' + suffix;
const password = crypto.randomUUID();
const added: string[] = [];
let createdRole = false;

async function request(path: string, token: string, method = 'GET', body?: unknown, year = '2026-2027') {
  const response = await server.fetch(new Request(base + path, { method,
    headers: { Authorization: 'Bearer ' + token, 'X-Academic-Year': year, 'X-Language': 'fr', ...(body ? { 'content-type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}) }));
  return { status: response.status, body: await response.json() as any };
}
async function login(email: string, password: string) {
  const response = await server.fetch(new Request(base + '/auth/login', { method: 'POST',
    headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password }) }));
  expect(response.status).toBe(200);
  const body = await response.json() as any;
  return body.data?.accessToken ?? body.accessToken;
}
beforeAll(async () => {
  // Idempotent isolated-fixture setup, without advancing any migration journal.
  const migration = await readFile(new URL('../../src/database/migrations/0077_offline_read_snapshots.sql', import.meta.url), 'utf8');
  await sql.begin(async tx => { for (const statement of migration.split('--> statement-breakpoint')) await tx.unsafe(statement); });
  const role = await sql`select id from roles where name = 'parent'`;
  if (!role.length) {
    roleId = 'offline-role-' + suffix;
    await sql`insert into roles (id,name) values (${roleId}, 'parent')`; createdRole = true;
  } else roleId = role[0].id;
  for (const name of ['read:offline', 'read:students']) {
    const [permission] = await sql`select id from permissions where name = ${name}`;
    if (!permission) throw new Error('Fixture missing ' + name);
    const inserted = await sql`insert into role_permissions(role_id,permission_id) values(${roleId},${permission.id}) on conflict do nothing returning permission_id`;
    if (inserted.length) added.push(permission.id);
  }
  const hash = await Bun.password.hash(password, { algorithm: 'bcrypt', cost: 4 });
  await sql`insert into users(id,name,email,password,status,role_id) values(${userId}, 'Offline fixture parent', ${userId + '@history.example.test'}, ${hash}, 'active', ${roleId})`;
  await sql`insert into parents(id,user_id,name,cin,phone,relationship_type) values(${parentId},${userId},'Offline fixture parent',${suffix},${suffix},'guardian')`;
  await sql`insert into student_parents(id,student_id,parent_id) values(${suffix},'history-student-02',${parentId})`;
  admin = await login('admin@history.example.test', process.env.SCHOOL_HISTORY_ADMIN_PASSWORD!);
  restricted = await login(userId + '@history.example.test', password);
}, 30_000);
afterAll(async () => {
  await sql`delete from parents where id = ${parentId}`;
  await sql`delete from users where id = ${userId}`;
  for (const id of added) await sql`delete from role_permissions where role_id = ${roleId} and permission_id = ${id}`;
  if (createdRole) await sql`delete from roles where id = ${roleId}`;
  await sql.end();
});

async function download(token: string, year = '2026-2027', kind = 'year') {
  const grant = await request('/offline/grant', token, 'POST', installation, year);
  expect(grant.status).toBe(200);
  expect(grant.body.validUntil - grant.body.issuedAt).toBe(8 * 60 * 60 * 1000);
  const input = { ...installation, authorizationGeneration: grant.body.authorizationGeneration, kind };
  const snapshot = await request('/offline/snapshots', token, 'POST', input, year);
  expect(snapshot.status).toBe(200);
  const manifest = snapshot.body;
  const records: any[] = [];
  for (let page = 0; page < manifest.pageChecksums.length; page++) {
    const params = new URLSearchParams({ ...installation, authorizationGeneration: input.authorizationGeneration });
    const response = await request(`/offline/snapshots/${manifest.generation}/pages/${page}?${params}`, token, 'GET', undefined, year);
    expect(response.status).toBe(200);
    expect(response.body.length).toBeLessThanOrEqual(500);
    expect(new TextEncoder().encode(canonicalJson(response.body)).length).toBeLessThanOrEqual(1_048_576);
    expect(await sha256(canonicalJson(response.body))).toBe(manifest.pageChecksums[page]);
    records.push(...response.body);
  }
  expect(records).toHaveLength(manifest.recordCount);
  return { manifest, records, grant: grant.body };
}

test('real HTTP list, details, parents and class envelopes exactly match complete snapshots in two years', async () => {
  for (const year of ['2025-2026', '2026-2027']) {
    const { records } = await download(admin, year);
    for (const record of records) {
      const live = await request(record.value.path, admin, 'GET', undefined, year);
      expect(live.status).toBe(200);
      expect(record.value.body).toEqual(live.body);
    }
    expect(records.some(row => row.value.path.endsWith('/parents'))).toBe(true);
    expect(records.every(row => !/fees|attendance|grades|alerts/.test(row.value.path))).toBe(true);
  }
}, 30_000);

test('restricted ownership, year refusal and cross-account page access remain enforced', async () => {
  const { records, grant } = await download(restricted);
  const list = records.find(row => row.value.path === '/students');
  expect(list.value.body.data.map((student: any) => student.id)).toEqual(['history-student-02']);
  expect(records.filter(row => /^\/students\//.test(row.value.path)).map(row => row.value.path)).toEqual([
    '/students/history-student-02', '/students/history-student-02/parents',
  ]);
  expect((await request('/offline/grant', restricted, 'POST', installation, '2025-2026')).status).toBe(403);
  const other = await download(admin);
  const params = new URLSearchParams({ ...installation, authorizationGeneration: grant.authorizationGeneration });
  expect((await request(`/offline/snapshots/${other.manifest.generation}/pages/0?${params}`, restricted)).status).toBe(404);
}, 30_000);

test('shared projections match their actual HTTP contracts and no arbitrary operation can be requested', async () => {
  const { records } = await download(admin, '2026-2027', 'shared');
  for (const record of records) {
    const live = await request(record.value.path, admin);
    // The business-date projection is captured at download; the remaining shape/fields match.
    expect(record.value.body).toEqual(live.body);
  }
  expect((await request('/offline/snapshots', admin, 'POST', { ...installation, kind: 'year',
    authorizationGeneration: 'a'.repeat(64), controller: 'FeeController' })).status).toBe(400);
}, 30_000);

test('fresh authorization refuses revoked permissions and stale ownership despite an existing access token', async () => {
  const { grant, manifest } = await download(restricted);
  const params = new URLSearchParams({ ...installation, authorizationGeneration: grant.authorizationGeneration });
  const page = `/offline/snapshots/${manifest.generation}/pages/0?${params}`;
  const [capability] = await sql`select id from permissions where name = 'read:offline'`;
  await sql`delete from role_permissions where role_id = ${roleId} and permission_id = ${capability.id}`;
  try {
    expect((await request('/offline/grant', restricted, 'POST', installation)).status).toBe(403);
    expect((await request(page, restricted)).status).toBe(403);
  } finally {
    await sql`insert into role_permissions(role_id,permission_id) values(${roleId},${capability.id}) on conflict do nothing`;
  }
  await sql`delete from student_parents where id = ${suffix}`;
  try {
    expect((await request(page, restricted)).status).toBe(403);
    const changed = await download(restricted);
    expect(changed.grant.authorizationGeneration).not.toBe(grant.authorizationGeneration);
    expect(changed.records.find(row => row.value.path === '/students').value.body.data).toEqual([]);
  } finally {
    await sql`insert into student_parents(id,student_id,parent_id) values(${suffix},'history-student-02',${parentId}) on conflict do nothing`;
  }
  await sql`update users set status = 'inactive' where id = ${userId}`;
  try {
    expect((await request('/offline/grant', restricted, 'POST', installation)).status).toBe(403);
  } finally { await sql`update users set status = 'active' where id = ${userId}`; }
}, 30_000);

test("moving a student out of a teacher's section changes that teacher's authorization", async () => {
  const id = 'offline-teacher-' + suffix;
  const teacherPassword = crypto.randomUUID();
  const placement = 'offline-move-' + suffix;
  let teacherRole = (await sql`select id from roles where name = 'teacher'`)[0]?.id as string | undefined;
  const createdTeacherRole = !teacherRole;
  if (!teacherRole) {
    teacherRole = 'offline-teacher-role-' + suffix;
    await sql`insert into roles (id,name) values (${teacherRole}, 'teacher')`;
  }
  const granted: string[] = [];
  try {
    for (const name of ['read:offline', 'read:students']) {
      const [permission] = await sql`select id from permissions where name = ${name}`;
      const inserted = await sql`insert into role_permissions(role_id,permission_id) values(${teacherRole},${permission.id}) on conflict do nothing returning permission_id`;
      if (inserted.length) granted.push(permission.id);
    }
    const hash = await Bun.password.hash(teacherPassword, { algorithm: 'bcrypt', cost: 4 });
    await sql`insert into users(id,name,email,password,status,role_id) values(${id}, 'Offline fixture teacher', ${id + '@history.example.test'}, ${hash}, 'active', ${teacherRole})`;
    await sql`insert into staff(id,user_id,employee_code,name,role,hire_date) values(${id}, ${id}, ${suffix}, 'Offline fixture teacher', 'teacher', '2024-09-01')`;
    await sql`insert into teachers(id,staff_id) values(${id}, ${id})`;
    await sql`insert into teacher_assignments(id,class_id,subject_id,teacher_id,section_id) values(${id}, 'history-class-2026', 'history-subject-math', ${id}, 'history-section-2026-a')`;
    const token = await login(id + '@history.example.test', teacherPassword);
    const roster = (download: Awaited<ReturnType<typeof downloadAs>>) =>
      download.records.find(row => row.value.path === '/students').value.body.data.map((student: any) => student.id);
    const downloadAs = () => download(token);
    const before = await downloadAs();
    expect(roster(before)).toContain('history-student-03');
    // A move closes the section A placement and opens one in section B; the assignments are unchanged.
    const [enrollment] = await sql`select id from student_enrollments where student_id = 'history-student-03' and academic_year_id = 'history-year-2026'`;
    await sql.begin(async transaction => {
      // TransactionSql's declaration omits the callable tag it has at runtime.
      const tx = transaction as unknown as typeof sql;
      await tx`update student_enrollment_placements set valid_to = '2027-01-15' where id = 'history-placement-03-2026-a'`;
      await tx`insert into student_enrollment_placements(id,enrollment_id,class_id,section_id,valid_from,reason)
        values(${placement}, ${enrollment.id}, 'history-class-2026', 'history-section-2026-b', '2027-01-15', 'Offline fixture move')`;
    });
    const params = new URLSearchParams({ ...installation, authorizationGeneration: before.grant.authorizationGeneration });
    expect((await request(`/offline/snapshots/${before.manifest.generation}/pages/0?${params}`, token)).status).toBe(403);
    const after = await downloadAs();
    expect(after.grant.authorizationGeneration).not.toBe(before.grant.authorizationGeneration);
    expect(roster(after)).not.toContain('history-student-03');
  } finally {
    await sql`delete from student_enrollment_placements where id = ${placement}`;
    await sql`update student_enrollment_placements set valid_to = null where id = 'history-placement-03-2026-a'`;
    await sql`delete from teacher_assignments where id = ${id}`;
    await sql`delete from teachers where id = ${id}`;
    await sql`delete from staff where id = ${id}`;
    await sql`delete from users where id = ${id}`;
    for (const permission of granted) await sql`delete from role_permissions where role_id = ${teacherRole} and permission_id = ${permission}`;
    if (createdTeacherRole) await sql`delete from roles where id = ${teacherRole}`;
  }
}, 30_000);
