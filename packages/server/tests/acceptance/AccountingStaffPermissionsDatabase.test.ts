import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import postgres from 'postgres';

const connection = process.env.DB_URL;
const schema = `accounting_staff_${crypto.randomUUID().replaceAll('-', '')}`;
const admin = connection ? postgres(connection, { max: 1, connect_timeout: 5, onnotice: () => {} }) : null;
let db: ReturnType<typeof postgres>;
const migration = readFileSync(new URL('../../src/database/migrations/0076_accounting_staff_read_only.sql', import.meta.url), 'utf8');

beforeAll(async () => {
  if (!admin || !connection) return;
  await admin.unsafe(`CREATE SCHEMA "${schema}"`);
  db = postgres(connection, { max: 1, connect_timeout: 5, connection: { search_path: schema }, onnotice: () => {} });
  // Only the columns the data migration touches; these tables are isolated
  // from the running application's records and its auth package schema.
  await db.unsafe(`
    CREATE TABLE roles (id text PRIMARY KEY, name text NOT NULL);
    CREATE TABLE permissions (id text PRIMARY KEY, name text NOT NULL UNIQUE);
    CREATE TABLE role_permissions (role_id text, permission_id text, PRIMARY KEY (role_id, permission_id));
    CREATE TABLE users (id text PRIMARY KEY, role_id text);
    CREATE TABLE tokens (id text PRIMARY KEY, user_id text, status text NOT NULL DEFAULT 'active', updated_at timestamptz NOT NULL DEFAULT now());
  `);
});

beforeEach(async () => {
  if (!db) return;
  await db.unsafe('DELETE FROM tokens; DELETE FROM users; DELETE FROM role_permissions; DELETE FROM permissions; DELETE FROM roles;');
  await db`insert into roles (id, name) values ('accounting', 'accounting'), ('principal', 'principal'), ('custom', 'custom')`;
  await db`insert into permissions (id, name) values ('create-staff', 'create:staff'), ('update-staff', 'update:staff'), ('read-staff', 'read:staff'), ('create-fees', 'create:fees')`;
  await db`insert into role_permissions (role_id, permission_id) values
    ('accounting', 'create-staff'), ('accounting', 'update-staff'), ('accounting', 'read-staff'), ('accounting', 'create-fees'),
    ('principal', 'create-staff'), ('principal', 'update-staff'), ('custom', 'create-staff'), ('custom', 'update-staff')`;
  await db`insert into users (id, role_id) values ('accountant', 'accounting'), ('principal', 'principal'), ('custom', 'custom')`;
  await db`insert into tokens (id, user_id) values ('accountant-token', 'accountant'), ('principal-token', 'principal'), ('custom-token', 'custom')`;
});

afterAll(async () => {
  await db?.end({ timeout: 5 });
  if (admin) {
    if (!/^accounting_staff_[a-f0-9]{32}$/.test(schema)) throw Error('Unexpected test schema');
    await admin.unsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await admin.end({ timeout: 5 });
  }
});

describe.skipIf(!connection)('accounting staff write removal migration', () => {
  it('removes only accounting staff writes and revokes only affected sessions', async () => {
    await db.begin(async (tx) => { await tx.unsafe(migration); });
    expect((await db`select permission_id from role_permissions where role_id = 'accounting' order by permission_id`).map((r) => r.permission_id)).toEqual(['create-fees', 'read-staff']);
    for (const role of ['principal', 'custom']) {
      expect((await db`select permission_id from role_permissions where role_id = ${role} order by permission_id`).map((r) => r.permission_id)).toEqual(['create-staff', 'update-staff']);
    }
    expect((await db`select name from permissions order by name`).map((r) => r.name)).toEqual(['create:fees', 'create:staff', 'read:staff', 'update:staff']);
    expect((await db`select id, status from tokens order by id`).map((r) => [r.id, r.status])).toEqual([
      ['accountant-token', 'revoked'], ['custom-token', 'active'], ['principal-token', 'active'],
    ]);
    await db`insert into tokens (id, user_id) values ('renewed-accountant', 'accountant')`;
    await db.begin(async (tx) => { await tx.unsafe(migration); });
    expect((await db`select status from tokens where id = 'renewed-accountant'`)[0].status).toBe('active');
  });

  it('rolls session revocation back if removing a grant fails', async () => {
    await db.unsafe(`CREATE FUNCTION reject_removal() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected removal failure'; END $$;
      CREATE TRIGGER reject_removal BEFORE DELETE ON role_permissions FOR EACH ROW EXECUTE FUNCTION reject_removal();`);
    try {
      let failure: unknown;
      try { await db.begin(async (tx) => { await tx.unsafe(migration); }); } catch (error) { failure = error; }
      expect(String(failure)).toContain('injected removal failure');
      expect((await db`select status from tokens where id = 'accountant-token'`)[0].status).toBe('active');
      expect(await db`select * from role_permissions where role_id = 'accounting'`).toHaveLength(4);
    } finally {
      await db.unsafe('DROP TRIGGER reject_removal ON role_permissions; DROP FUNCTION reject_removal();');
    }
  }, 30000);
});
