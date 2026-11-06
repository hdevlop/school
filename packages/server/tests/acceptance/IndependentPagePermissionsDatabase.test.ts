import { afterAll, describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import postgres from 'postgres';

const connection = process.env.SCHOOL_HISTORY_TEST_DB_URL;
if (connection) {
  const target = new URL(connection);
  if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname) || target.pathname !== '/school_history_test') {
    throw new Error('Expected local school_history_test');
  }
}
const db = connection ? postgres(connection, { max: 1, connect_timeout: 5, onnotice: () => {} }) : null;
const migration = readFileSync(new URL('../../src/database/migrations/0094_independent_page_permissions.sql', import.meta.url), 'utf8');
afterAll(async () => { await db?.end({ timeout: 5 }); });

describe.skipIf(!db)('independent page permission migration', () => {
  it('preserves access and source grants, invalidates affected claims once, and separates later revocations', async () => {
    await db!.begin(async (tx) => {
      // Temporary tables shadow public tables on this connection only.
      await tx.unsafe(`
        CREATE TEMP TABLE permissions (id text PRIMARY KEY, name text UNIQUE, description text, resource text, action text) ON COMMIT DROP;
        CREATE TEMP TABLE roles (id text PRIMARY KEY, name text) ON COMMIT DROP;
        CREATE TEMP TABLE role_permissions (role_id text, permission_id text, PRIMARY KEY (role_id, permission_id)) ON COMMIT DROP;
        CREATE TEMP TABLE users (id text PRIMARY KEY, role_id text) ON COMMIT DROP;
        CREATE TEMP TABLE tokens (user_id text, status text, updated_at timestamp) ON COMMIT DROP;
        INSERT INTO permissions (id, name) VALUES ('students', 'read:students'), ('classes', 'read:classes'), ('all', 'read:*');
        INSERT INTO roles VALUES ('secretary', 'secretary'), ('monitor', 'monitor'), ('teacher', 'teacher'), ('custom', 'custom'), ('wildcard', 'principal'), ('empty', 'assistant');
        INSERT INTO role_permissions VALUES ('secretary', 'students'), ('monitor', 'students'), ('monitor', 'classes'), ('teacher', 'classes'), ('custom', 'students'), ('wildcard', 'all');
        INSERT INTO users SELECT id, id FROM roles;
        INSERT INTO tokens SELECT id, 'active', now() FROM users;
      `);
      await tx.unsafe(migration);
      const grants = async (role: string) => (await tx.unsafe(`
        select p.name from role_permissions rp join permissions p on p.id = rp.permission_id
        where rp.role_id = $1 order by p.name
      `, [role])).map((row) => row.name);
      expect(await grants('secretary')).toEqual(['read:insurance', 'read:students']);
      expect(await grants('monitor')).toEqual(['read:class-routines', 'read:classes', 'read:students']);
      expect(await grants('teacher')).toEqual(['read:class-routines', 'read:classes']);
      expect(await grants('custom')).toEqual(['read:students']);
      expect(await grants('wildcard')).toEqual(['read:*', 'read:class-routines', 'read:insurance']);
      expect(await grants('empty')).toEqual([]);
      expect((await tx.unsafe("select user_id from tokens where status = 'revoked' order by user_id")).map((row) => row.user_id))
        .toEqual(['monitor', 'secretary', 'teacher', 'wildcard']);
      await tx.unsafe("update tokens set status = 'active'");
      await tx.unsafe(migration);
      expect(await tx.unsafe("select 1 from tokens where status = 'revoked'")).toHaveLength(0);
      await tx.unsafe("delete from role_permissions where permission_id in (select id from permissions where name in ('read:insurance', 'read:class-routines'))");
      expect(await grants('secretary')).toEqual(['read:students']);
      expect(await grants('monitor')).toEqual(['read:classes', 'read:students']);
    });
  });
});
