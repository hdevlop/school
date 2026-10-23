import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { database } from 'najm-database';
import { cache } from 'najm-cache';
import { email } from 'najm-email';
import { Can } from '../../src/auth';
import { Controller, Get, Server } from '../../src/najm';
import { authConfig, eventsConfig, guardConfig, i18nConfig } from '../../src/config';
import { canReadRoutineCandidates, RoutineCandidateGuard } from '../../src/modules/classRoutines/ClassRoutineGuards';

const connection = process.env.DB_URL;
const schema = `split_permissions_${crypto.randomUUID().replaceAll('-', '')}`;
const admin = connection ? postgres(connection, { max: 1, connect_timeout: 5, onnotice: () => {} }) : null;
let db: ReturnType<typeof postgres>;
let server: Server;
const migration = readFileSync(new URL('../../src/database/migrations/0073_split_manage_permissions.sql', import.meta.url), 'utf8');
const password = `Probe-${crypto.randomUUID()}-Aa1!`;

@Controller('/permission-probe')
class Probe {
  @Get('/read') @Can('read:classes') read() { return { allowed: true }; }
  @Get('/create') @Can('create:class-routines') create() { return { allowed: true }; }
  @Get('/update') @Can('update:class-routines') update() { return { allowed: true }; }
  @Get('/delete') @Can('delete:class-routines') delete() { return { allowed: true }; }
  @Get('/publish') @Can('publish:class-routines') publish() { return { allowed: true }; }
  @Get('/candidates') @canReadRoutineCandidates() candidates() { return { allowed: true }; }
}

async function start() {
  server = new Server().use(database({ default: drizzle(db) }))
    .use(cache()).use(eventsConfig()).use(i18nConfig())
    .use(email({ provider: { provider: 'memory' } })).use(guardConfig()).use(authConfig())
    .base('/api').load({ Probe, RoutineCandidateGuard });
  await server.init();
}
const request = (path: string, token?: string, body?: unknown) => server.fetch(new Request(`http://school.test/api${path}`, {
  method: body ? 'POST' : 'GET',
  headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), 'content-type': 'application/json' },
  body: body ? JSON.stringify(body) : undefined,
}));
async function login(role: string) {
  const response = await request('/auth/login', undefined, { email: `${role}@example.invalid`, password });
  const body = await response.json() as any;
  expect(response.status, JSON.stringify(body)).toBe(200);
  const data = body.data ?? body;
  return data.accessToken ?? data.tokens?.accessToken;
}

beforeAll(async () => {
  if (!admin || !connection) return;
  await admin.unsafe(`CREATE SCHEMA "${schema}"`);
  for (const table of ['roles', 'permissions', 'role_permissions', 'users', 'tokens', 'credential_setup_requirements', 'credential_setup_sessions']) {
    await admin.unsafe(`CREATE TABLE "${schema}"."${table}" (LIKE public."${table}" INCLUDING ALL)`);
  }
  db = postgres(connection, { max: 4, connection: { search_path: schema }, onnotice: () => {} });
  await db`alter table role_permissions add foreign key (permission_id) references permissions(id) on delete cascade`;
  for (const role of ['legacy', 'reader', 'editor', 'attendance', 'wildcard', 'all']) {
    await db`insert into roles (id, name) values (${role}, ${role})`;
    await db`insert into users (id, email, password, status, role_id) values
      (${role}, ${`${role}@example.invalid`}, ${await Bun.password.hash(password, { algorithm: 'bcrypt', cost: 4 })}, 'active', ${role})`;
  }
  await db`insert into permissions (id, name, resource, action) values
    ('legacy-routine', 'manage:class-routines', 'class-routines', 'manage'),
    ('legacy-staff', 'manage:staff-attendance', 'staff-attendance', 'manage'),
    ('legacy-finance', 'manage:financial-operations', 'financial-operations', 'manage'),
    ('legacy-participants', 'manage:participants', 'participants', 'manage'),
    ('legacy-attendance', 'manage:attendance', 'attendance', 'manage'),
    ('read-classes', 'read:classes', 'classes', 'read'),
    ('existing-edit', 'update:class-routines', 'class-routines', 'update'),
    ('custom-id', 'custom:module', 'module', 'custom'),
    ('sidebar-fees', 'sidebar:fees', 'sidebar', 'fees'),
    ('wildcard-manage', 'manage:*', '*', 'manage'),
    ('all-permissions', '*:*', '*', '*')`;
  await db`insert into role_permissions (role_id, permission_id) values
    ('legacy', 'legacy-routine'), ('legacy', 'legacy-staff'), ('legacy', 'legacy-finance'),
    ('legacy', 'legacy-participants'), ('legacy', 'custom-id'), ('legacy', 'sidebar-fees'),
    ('reader', 'read-classes'), ('editor', 'existing-edit'), ('attendance', 'legacy-attendance'),
    ('wildcard', 'wildcard-manage'), ('all', 'all-permissions')`;
  await start();
}, 30000);

afterAll(async () => {
  try { await server?.stop(); }
  finally {
    await db?.end({ timeout: 5 });
    if (admin) {
      if (!/^split_permissions_[a-f0-9]{32}$/.test(schema)) throw Error('Unexpected test schema');
      await admin.unsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await admin.end({ timeout: 5 });
    }
  }
});

describe.skipIf(!connection)('manage permission migration against PostgreSQL', () => {
  it('rolls the entire migration back on a catalog conflict', async () => {
    await db`insert into permissions (id, name, resource, action) values ('perm_publish_class_routines', 'unrelated:custom', 'custom', 'unrelated')`;
    let failure: unknown;
    try { await db.begin(async (tx) => { await tx.unsafe(migration); }); } catch (error) { failure = error; }
    expect(failure).toBeDefined();
    expect((await db`select name from permissions where name = 'manage:class-routines'`)).toHaveLength(1);
    expect((await db`select name from permissions where name = 'create:class-routines'`)).toHaveLength(0);
    await db`delete from permissions where name = 'unrelated:custom'`;
  }, 30000);

  it('rolls grants and token revocation back if retiring the old catalog fails', async () => {
    await login('legacy');
    await db.unsafe(`CREATE FUNCTION reject_retirement() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'injected retirement failure'; END $$`);
    await db.unsafe('CREATE TRIGGER reject_retirement BEFORE DELETE ON permissions FOR EACH ROW EXECUTE FUNCTION reject_retirement()');
    try {
      let failure: unknown;
      try { await db.begin(async (tx) => { await tx.unsafe(migration); }); } catch (error) { failure = error; }
      expect(String(failure)).toContain('injected retirement failure');
      expect((await db`select * from permissions where name = 'create:class-routines'`)).toHaveLength(0);
      expect((await db`select * from role_permissions where role_id = 'legacy' and permission_id = 'legacy-routine'`)).toHaveLength(1);
      expect((await db`select * from tokens where user_id = 'legacy' and status = 'revoked'`)).toHaveLength(0);
    } finally {
      await db.unsafe('DROP TRIGGER reject_retirement ON permissions');
      await db.unsafe('DROP FUNCTION reject_retirement()');
    }
  });

  it('migrates custom role grants, preserves unrelated grants and existing IDs, and retires stale tokens', async () => {
    const oldToken = await login('legacy');
    await db.begin(async (tx) => { await tx.unsafe(migration); });
    const names = (await db`select p.name from permissions p join role_permissions rp on rp.permission_id = p.id where rp.role_id = 'legacy'`).map((row) => row.name);
    expect(names.sort()).toEqual([
      'create:class-routines', 'update:class-routines', 'delete:class-routines', 'publish:class-routines',
      'update:staff-attendance', 'rollover:financial-operations', 'read:participants', 'create:participants',
      'update:participants', 'delete:participants', 'custom:module', 'sidebar:fees',
    ].sort());
    expect((await db`select id from permissions where name = 'update:class-routines'`)[0].id).toBe('existing-edit');
    expect((await db`select * from permissions where action = 'manage'`)).toHaveLength(0);
    expect((await db`select * from role_permissions where role_id = 'attendance'`)).toHaveLength(0);
    // Deployment restart clears process auth caches; an old claim must then be refused.
    await server.stop();
    await start();
    expect((await request('/permission-probe/create', oldToken)).status).toBe(401);
  });

  it('enforces the split grants over HTTP and keeps candidate details away from readers', async () => {
    const reader = await login('reader');
    const editor = await login('editor');
    const legacy = await login('legacy');
    for (const action of ['create', 'update', 'delete', 'publish', 'candidates']) {
      expect((await request(`/permission-probe/${action}`)).status).toBe(401);
      expect((await request(`/permission-probe/${action}`, reader)).status).toBe(403);
      expect((await request(`/permission-probe/${action}`, legacy)).status).toBe(200);
    }
    expect((await request('/permission-probe/read', reader)).status).toBe(200);
    for (const action of ['create', 'delete', 'publish']) {
      expect((await request(`/permission-probe/${action}`, editor)).status).toBe(403);
    }
    expect((await request('/permission-probe/update', editor)).status).toBe(200);
    expect((await request('/permission-probe/candidates', editor)).status).toBe(200);
    const wildcard = await login('wildcard');
    const all = await login('all');
    expect((await request('/permission-probe/publish', wildcard)).status).toBe(200);
    expect((await request('/permission-probe/delete', all)).status).toBe(200);
  });

  it('is idempotent and does not regrant access removed after the migration', async () => {
    const token = await login('legacy');
    await db`delete from role_permissions where role_id = 'legacy' and permission_id = 'perm_delete_class_routines'`;
    await db.begin(async (tx) => { await tx.unsafe(migration); });
    expect((await db`select * from role_permissions where role_id = 'legacy' and permission_id = 'perm_delete_class_routines'`)).toHaveLength(0);
    expect((await request('/permission-probe/create', token)).status).toBe(200);
  });

  it('moves workflow actions into Edit, preserving existing grants and wildcard boundaries', async () => {
    await db`insert into permissions (id, name, resource, action) values ('resolve-old', 'resolve:discipline', 'discipline', 'resolve')`;
    await db`insert into role_permissions (role_id, permission_id) values ('reader', 'resolve-old')`;
    const editMigration = readFileSync(new URL('../../src/database/migrations/0074_edit_workflow_permissions.sql', import.meta.url), 'utf8');
    await db.begin(async (tx) => { await tx.unsafe(editMigration); });
    const names = async (role: string) => (await db`select p.name from permissions p join role_permissions rp on rp.permission_id = p.id where rp.role_id = ${role}`).map((p) => p.name);
    expect(await names('reader')).toEqual(expect.arrayContaining(['read:classes', 'update:discipline']));
    expect(await names('legacy')).toContain('update:financial-operations');
    expect(await names('wildcard')).not.toContain('update:discipline');
    expect((await db`select * from permissions where action in ('rollover', 'resolve')`)).toHaveLength(0);
    await db`delete from role_permissions where role_id = 'reader' and permission_id = 'perm_update_discipline'`;
    await db.begin(async (tx) => { await tx.unsafe(editMigration); });
    expect(await names('reader')).not.toContain('update:discipline');
    await db`insert into role_permissions (role_id, permission_id) values ('reader', 'perm_publish_class_routines')`;
    const publishMigration = readFileSync(new URL('../../src/database/migrations/0075_publish_is_edit.sql', import.meta.url), 'utf8');
    await db.begin(async (tx) => { await tx.unsafe(publishMigration); });
    expect(await names('reader')).toContain('update:class-routines');
    expect((await db`select id from permissions where name = 'update:class-routines'`)[0].id).toBe('existing-edit');
    expect((await db`select * from permissions where action = 'publish'`)).toHaveLength(0);
    await db`delete from role_permissions where role_id = 'reader' and permission_id = 'existing-edit'`;
    await db.begin(async (tx) => { await tx.unsafe(publishMigration); });
    expect(await names('reader')).not.toContain('update:class-routines');
  });
});
