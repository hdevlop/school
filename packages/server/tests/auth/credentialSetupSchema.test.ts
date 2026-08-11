import { describe, expect, it } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { getTableName } from 'drizzle-orm';

import * as schema from '@server/database/schema';

const migrationsDir = join(import.meta.dir, '../../src/database/migrations');
const migration = readFileSync(join(migrationsDir, '0041_oval_venus.sql'), 'utf8');
const authRepairMigration = readFileSync(
  join(migrationsDir, '0044_auth_v3_schema_repair.sql'),
  'utf8',
);

describe('Najm Auth v3 credential-setup storage', () => {
  it('is composed into the Drizzle schema entry point', () => {
    expect(getTableName(schema.credentialSetupSessions)).toBe('credential_setup_sessions');
    expect(getTableName(schema.credentialSetupRequirements)).toBe('credential_setup_requirements');
  });

  it('keeps the existing auth tables addressed by their current names', () => {
    expect(getTableName(schema.users)).toBe('users');
    expect(getTableName(schema.tokens)).toBe('tokens');
    expect(getTableName(schema.roles)).toBe('roles');
    expect(getTableName(schema.permissions)).toBe('permissions');
    expect(getTableName(schema.rolePermissions)).toBe('role_permissions');
  });
});

describe('the physical Auth v3 schema repair', () => {
  it('fills only the historical auth columns and key omitted from SQL', () => {
    expect(authRepairMigration).toContain(
      'ALTER TABLE "roles" ADD COLUMN IF NOT EXISTS "created_at"',
    );
    expect(authRepairMigration).toContain(
      'ALTER TABLE "roles" ADD COLUMN IF NOT EXISTS "updated_at"',
    );
    expect(authRepairMigration).toContain(
      'ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone"',
    );
    expect(authRepairMigration).toContain(
      'ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone_verified"',
    );
    expect(authRepairMigration).toContain(
      'PRIMARY KEY("role_id", "permission_id")',
    );
    expect(authRepairMigration).not.toMatch(/\b(?:DROP|DELETE|TRUNCATE)\b/);
  });

  it('is registered immediately after the theme migration', () => {
    const journal = JSON.parse(
      readFileSync(join(migrationsDir, 'meta/_journal.json'), 'utf8'),
    ) as { entries: { tag: string }[] };
    const tags = journal.entries.map((entry) => entry.tag);

    expect(tags.indexOf('0044_auth_v3_schema_repair')).toBe(
      tags.indexOf('0043_tricky_micromax') + 1,
    );
  });
});

describe('the credential-setup migration is additive', () => {
  it('creates exactly the two v3 tables', () => {
    const created = [...migration.matchAll(/CREATE TABLE "([^"]+)"/g)].map((match) => match[1]);

    expect(created.sort()).toEqual([
      'credential_setup_requirements',
      'credential_setup_sessions',
    ]);
  });

  it('never alters or drops an existing auth table', () => {
    // ALTER is allowed only to attach the two new tables' own foreign keys.
    const altered = [...migration.matchAll(/ALTER TABLE "([^"]+)"/g)].map((match) => match[1]);

    expect([...new Set(altered)].sort()).toEqual([
      'credential_setup_requirements',
      'credential_setup_sessions',
    ]);
    expect(migration).not.toContain('DROP');
  });

  it('is the only migration owning the credential-setup tables', () => {
    const owners = readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .filter((file) =>
        /CREATE TABLE "credential_setup_/.test(readFileSync(join(migrationsDir, file), 'utf8')),
      );

    expect(owners).toEqual(['0041_oval_venus.sql']);
  });

  it('is registered in the drizzle journal', () => {
    const journal = JSON.parse(
      readFileSync(join(migrationsDir, 'meta/_journal.json'), 'utf8'),
    ) as { entries: { tag: string }[] };
    const tags = journal.entries.map((entry) => entry.tag);

    expect(tags).toContain('0041_oval_venus');
    expect(tags.indexOf('0041_oval_venus')).toBe(tags.indexOf('0042_young_blockbuster') - 1);
  });
});
