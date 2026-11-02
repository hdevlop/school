import 'reflect-metadata';
import { describe, expect, it, mock } from 'bun:test';
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative, sep } from 'node:path';
import * as i18n from 'najm-i18n';

const rawUrl = process.env.SCHOOL_HISTORY_TEST_DB_URL;
if (!rawUrl) throw new Error('SCHOOL_HISTORY_TEST_DB_URL is required');
const target = new URL(rawUrl);
if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)
  || target.pathname !== '/school_history_test') throw new Error('Expected local school_history_test');
process.env.DB_URL = rawUrl;

mock.module('najm-i18n', () => ({ ...i18n, t: (key: string) => key }));
const { sql } = await import('drizzle-orm');
const { db } = await import('../../src/database/db');
const { BackupRepository } = await import('../../src/modules/backup/BackupRepository');
const { BackupValidator } = await import('../../src/modules/backup/BackupValidator');
const { BackupService } = await import('../../src/modules/backup/BackupService');
const { BackupArchiveReader, BackupArchiveWriter } = await import('../../src/modules/backup/backupArchive');
const { backupMigrationsPath, readBackupMigrations } = await import('../../src/modules/backup/backupMigrations');
const { LandingRepository } = await import('../../src/modules/landing/LandingRepository');
const { rolesData, rolePermissionsData } = await import('../../src/modules/seed-data/admin');
const rollback = Symbol('rollback');

type Tx = typeof db;

/** Everything runs in one transaction that is rolled back: the fixture is left as it was. */
async function inRollback(run: (tx: Tx) => Promise<void>) {
  try {
    await db.transaction(async (transaction) => {
      await run(transaction as unknown as Tx);
      throw rollback;
    });
  } catch (error) {
    if (error !== rollback) throw error;
  }
}

function backupService(tx: Tx, storagePath: string) {
  const repository = new BackupRepository();
  repository.db = tx;
  const ended = { families: [] as string[], users: [] as string[] };
  const sessions = {
    markFamilyRevoked: async (family: string) => { ended.families.push(family); },
    invalidateAccessTokens: async (userId: string) => { ended.users.push(userId); return 1; },
  };
  const service = new BackupService(repository, new BackupValidator(), sessions as never);
  service.storagePath = storagePath;
  // The test's transaction stands in for najm's: the restore registers its
  // file clean-up and undo here, and the test runs the one that applies.
  const hooks = { commit: [] as (() => Promise<unknown>)[], rollback: [] as (() => Promise<unknown>)[] };
  Object.assign(service, {
    transactions: {
      isActive: () => true,
      afterCommit: async (callback: () => Promise<unknown>) => { hooks.commit.push(callback); },
      afterRollback: async (callback: () => Promise<unknown>) => { hooks.rollback.push(callback); },
    },
  });
  const settle = async (outcome: 'commit' | 'rollback') => {
    for (const callback of hooks[outcome].splice(0)) await callback();
    hooks.commit.length = hooks.rollback.length = 0;
  };
  return { service, ended, settle };
}

const bytes = async (archive: Blob) => new Uint8Array(await archive.arrayBuffer());

// The fixture holds tables no migration creates (its own marker, older code's
// leftovers): a restore rebuilds the schema from the migrations and leaves them out.
const migrationSql = readBackupMigrations(backupMigrationsPath()).flatMap(({ sql }) => sql).join('\n');
const createdByMigrations = (name: string) => new RegExp(`CREATE TABLE (IF NOT EXISTS )?("public"\\.)?"?${name}"?[ (]`).test(migrationSql);
const schoolTables = (tables: Record<string, number>) => Object.fromEntries(Object.entries(tables).filter(([name]) => createdByMigrations(name)));
const schoolEntry = (name: string) => !name.startsWith('database/') || createdByMigrations(name.slice('database/'.length, -'.jsonl'.length));

/** Every entry but the manifest and the tables no migration creates, rows sorted so physical order does not matter. */
async function contents(archive: Blob) {
  const reader = new BackupArchiveReader(await bytes(archive));
  const entries = reader.read(reader.names.filter(name => name !== 'manifest.json' && schoolEntry(name)));
  return Object.fromEntries(Object.entries(entries).sort(([a], [b]) => a.localeCompare(b)).map(([name, data]) => [
    name,
    name.endsWith('.jsonl') ? new TextDecoder().decode(data).split('\n').filter(Boolean).sort() : Buffer.from(data).toString('base64'),
  ]));
}

async function storedFiles(root: string) {
  const entries = await readdir(root, { recursive: true, withFileTypes: true });
  return Object.fromEntries(await Promise.all(entries.filter(entry => entry.isFile()).map(async entry => {
    const path = join(entry.parentPath, entry.name);
    return [relative(root, path).split(sep).join('/'), (await readFile(path)).toString('base64')];
  })));
}

async function storage(files: Record<string, string>) {
  const root = await mkdtemp(join(tmpdir(), 'school-backup-'));
  for (const [path, content] of Object.entries(files)) {
    await mkdir(join(root, path, '..'), { recursive: true });
    await writeFile(join(root, path), content);
  }
  return root;
}

const count = async (tx: Tx, table: string) => Number((await tx.execute<{ count: string }>(sql`SELECT count(*) AS count FROM ${sql.identifier(table)}`))[0].count);

describe('a full backup', () => {
  it('restores every row and file exactly, empties the sessions and ends them', async () => {
    const root = await storage({ 'students/a.png': 'photo a', 'fee-types/f1/icon.png': 'icon', 'notes.txt': 'kept' });
    try {
      await inRollback(async (tx) => {
        const { service, ended, settle } = backupService(tx, root);
        const tokensBefore = await count(tx, 'tokens');
        const original = await service.createBackup();
        expect(Object.keys(original.manifest.tables)).not.toContain('tokens');
        expect(original.manifest.files).toEqual({ count: 3, bytes: 'photo a'.length + 'icon'.length + 'kept'.length });

        // Change the school after the backup: a row, a new file, a removed file.
        await tx.execute(sql`UPDATE settings SET school_name = 'Changed after the backup'`);
        await tx.execute(sql`DELETE FROM student_parents`);
        await writeFile(join(root, 'students', 'b.png'), 'photo b');
        await rm(join(root, 'notes.txt'));

        const result = await service.restore(await bytes(original.archive));
        await settle('commit');
        // The integrity triggers are deferred to commit; run them now.
        await tx.execute(sql`SET CONSTRAINTS ALL IMMEDIATE`);

        const restored = await service.createBackup();
        expect(restored.manifest.tables).toEqual(schoolTables(original.manifest.tables));
        expect(Object.keys(restored.manifest.tables).length).toBeGreaterThan(50);
        expect(await contents(restored.archive)).toEqual(await contents(original.archive));
        expect(await storedFiles(root)).toEqual({
          'students/a.png': Buffer.from('photo a').toString('base64'),
          'fee-types/f1/icon.png': Buffer.from('icon').toString('base64'),
          'notes.txt': Buffer.from('kept').toString('base64'),
        });
        expect((await readdir(root)).filter(name => name.startsWith('.'))).toEqual([]);
        expect(result.files).toBe(3);
        expect(result.rows).toBe(Object.values(original.manifest.tables).reduce((sum, rows) => sum + rows, 0));

        expect(await count(tx, 'tokens')).toBe(0);
        if (tokensBefore) expect(ended.families.length).toBeGreaterThan(0);
        expect(new Set(ended.users).size).toBe(await count(tx, 'users'));
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }, 120_000);

  it('puts the current files back when the restore is rolled back', async () => {
    const root = await storage({ 'students/a.png': 'photo a' });
    try {
      await inRollback(async (tx) => {
        const { service, settle } = backupService(tx, root);
        const original = await service.createBackup();
        await writeFile(join(root, 'students', 'b.png'), 'photo b');
        await service.restore(await bytes(original.archive));
        expect(Object.keys(await storedFiles(root)).filter(path => !path.startsWith('.'))).toEqual(['students/a.png']);
        await settle('rollback');
        expect(await storedFiles(root)).toEqual({
          'students/a.png': Buffer.from('photo a').toString('base64'),
          'students/b.png': Buffer.from('photo b').toString('base64'),
        });
        expect(await readdir(root)).toEqual(['students']);
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }, 120_000);

  it('restores a backup from an earlier version and brings it up to this one through the later migrations', async () => {
    const root = await storage({ 'students/a.png': 'photo a' });
    try {
      await inRollback(async (tx) => {
        const { service, settle } = backupService(tx, root);
        const original = await service.createBackup();
        // The same school as it was at 0090, before 0091_backup_permissions and
        // 0092_ai_settings_memory_columns: no backup permissions, no memory settings.
        const journal: { entries: { tag: string; when: number }[] } = JSON.parse(
          await readFile(new URL('../../src/database/migrations/meta/_journal.json', import.meta.url), 'utf8'));
        const before0091 = journal.entries.find(({ tag }) => tag === '0090_floor_manager_assignments')!.when;
        const added = ['backup:system', 'restore:system'];
        const reader = new BackupArchiveReader(await bytes(original.archive));
        const entries = reader.read(reader.names);
        const lines = (name: string) => new TextDecoder().decode(entries[name]).split('\n').filter(Boolean).map(line => JSON.parse(line));
        const permissions = lines('database/permissions.jsonl');
        const removed = new Set(permissions.filter(({ name }) => added.includes(name)).map(({ id }) => id));
        expect(removed.size).toBe(2);
        const memory = ['use_memory', 'max_stored_messages', 'max_prompt_messages'];
        const older = {
          'database/permissions.jsonl': permissions.filter(({ id }) => !removed.has(id)),
          'database/role_permissions.jsonl': lines('database/role_permissions.jsonl').filter(({ permission_id }) => !removed.has(permission_id)),
          'database/ai_settings.jsonl': lines('database/ai_settings.jsonl')
            .map(row => Object.fromEntries(Object.entries(row).filter(([column]) => !memory.includes(column)))),
        };
        const writer = new BackupArchiveWriter();
        for (const [name, data] of Object.entries(entries)) {
          if (name === 'manifest.json') {
            writer.text(name, JSON.stringify({
              ...original.manifest,
              migration: { hash: 'hash-from-another-checkout', createdAt: before0091 },
              tables: { ...original.manifest.tables, permissions: older['database/permissions.jsonl'].length, role_permissions: older['database/role_permissions.jsonl'].length },
            }));
          } else if (name in older) {
            writer.text(name, older[name as keyof typeof older].map(row => `${JSON.stringify(row)}\n`).join(''));
          } else writer.file(name, data);
        }

        await service.restore(await bytes(writer.finish()));
        await settle('commit');
        await tx.execute(sql`SET CONSTRAINTS ALL IMMEDIATE`);

        // 0091 ran again on the restored rows: both permissions are back, granted to no role.
        const names = await tx.execute<{ name: string }>(sql`SELECT name FROM permissions ORDER BY name`);
        expect(names.map(({ name }) => name)).toEqual(permissions.map(({ name }) => name).sort());
        const granted = await tx.execute<{ count: string }>(sql`
          SELECT count(*) AS count FROM role_permissions rp JOIN permissions p ON p.id = rp.permission_id WHERE p.name IN ('backup:system', 'restore:system')`);
        expect(Number(granted[0].count)).toBe(0);
        // 0092 ran too: the memory settings are its defaults.
        const settings = await tx.execute<Record<string, unknown>>(sql`SELECT use_memory, max_stored_messages, max_prompt_messages FROM ai_settings`);
        expect(settings.map(row => ({ ...row }))).toEqual(older['database/ai_settings.jsonl'].map(() => ({ use_memory: true, max_stored_messages: 100, max_prompt_messages: 10 })));
        // Everything else is the backup's, row for row.
        const restored = await contents((await service.createBackup()).archive);
        const expected = await contents(original.archive);
        for (const name of ['database/permissions.jsonl', 'database/role_permissions.jsonl', 'database/ai_settings.jsonl']) {
          delete restored[name];
          delete expected[name];
        }
        expect(restored).toEqual(expected);
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }, 120_000);

  it('refuses a backup of another database version and changes nothing', async () => {
    const root = await storage({ 'students/a.png': 'photo a' });
    try {
      await inRollback(async (tx) => {
        const { service } = backupService(tx, root);
        const original = await service.createBackup();
        const reader = new BackupArchiveReader(await bytes(original.archive));
        const writer = new BackupArchiveWriter();
        for (const [name, data] of Object.entries(reader.read(reader.names))) {
          if (name === 'manifest.json') {
            const manifest = JSON.parse(new TextDecoder().decode(data));
            writer.text(name, JSON.stringify({ ...manifest, migration: { ...manifest.migration, createdAt: manifest.migration.createdAt + 1 } }));
          } else writer.file(name, data);
        }
        const students = await count(tx, 'students');
        // Caught by hand: Bun's rejects.toThrow with an asymmetric matcher never settles.
        const refusal = await service.restore(await bytes(writer.finish())).then(() => null, (error: unknown) => error);
        expect(refusal).toMatchObject({ status: 409, message: 'backup.errors.otherVersion' });
        expect(await count(tx, 'students')).toBe(students);
        expect(await storedFiles(root)).toEqual({ 'students/a.png': Buffer.from('photo a').toString('base64') });
        expect(await readdir(root)).toEqual(['students']);
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }, 120_000);
});

describe('a full reset', () => {
  const passwordFor = (service: InstanceType<typeof BackupService>, tx: Tx, accepted: string) => {
    const landing = new LandingRepository();
    landing.db = tx;
    Object.assign(service, { landing });
    Object.assign((service as unknown as { backupValidator: object }).backupValidator, {
      users: { getAuthRecordById: async () => ({ password: 'stored-hash' }) },
      passwords: { comparePassword: async (password: string) => password === accepted },
    });
  };
  const adminId = async (tx: Tx) => {
    const [row] = await tx.execute<{ id: string }>(sql`SELECT u.id FROM users u JOIN roles r ON r.id = u.role_id WHERE r.name = 'admin' LIMIT 1`);
    if (row) return row.id;
    const [role] = await tx.execute<{ id: string }>(sql`SELECT id FROM roles WHERE name = 'admin'`);
    await tx.execute(sql`INSERT INTO users (id, email, password, role_id) VALUES ('reset-admin', 'reset-admin@school.test', 'stored-hash', ${role.id})`);
    return 'reset-admin';
  };

  it('leaves a new installation with only the administrator, and ends every session', async () => {
    const root = await storage({ 'students/a.png': 'photo a', 'notes.txt': 'gone' });
    try {
      await inRollback(async (tx) => {
        const { service, ended, settle } = backupService(tx, root);
        passwordFor(service, tx, 'right');
        const admin = await adminId(tx);
        const usersBefore = await count(tx, 'users');
        await tx.execute(sql`INSERT INTO roles (id, name) VALUES ('custom-role', 'custom_role')`);
        const periodsBefore = await tx.execute<{ id: string }>(sql`SELECT id FROM routine_periods WHERE schedule_id IS NULL ORDER BY id`);
        await tx.execute(sql`DELETE FROM role_permissions WHERE role_id IN (SELECT id FROM roles WHERE name = 'teacher')`);

        expect(await service.reset('right', admin)).toEqual({ reset: true });
        await settle('commit');
        await tx.execute(sql`SET CONSTRAINTS ALL IMMEDIATE`);

        for (const table of ['students', 'parents', 'staff', 'teachers', 'fees', 'payments', 'attendance', 'grades', 'settings', 'academic_years', 'classes', 'files', 'tokens', 'audit_logs']) {
          expect(await count(tx, table), table).toBe(0);
        }
        const users = await tx.execute<{ id: string; image: string | null }>(sql`SELECT id, image FROM users`);
        expect(users.map(({ id, image }) => ({ id, image }))).toEqual([{ id: admin, image: null }]);

        const roles = await tx.execute<{ name: string }>(sql`SELECT name FROM roles ORDER BY name`);
        expect(roles.map(({ name }) => name)).toEqual(rolesData.map(({ name }) => name).sort());
        const grants = await tx.execute<{ role: string; permission: string }>(sql`
          SELECT r.name AS role, p.name AS permission FROM role_permissions rp
          JOIN roles r ON r.id = rp.role_id JOIN permissions p ON p.id = rp.permission_id`);
        // Every default grant is back, the administrator's *:* above all: without it no one could sign in and repair this.
        const granted = new Set(grants.map(({ role, permission }) => `${role} ${permission}`));
        const expected = rolePermissionsData.flatMap(({ roleName, permissions }) => permissions.map(permission => `${roleName} ${permission}`));
        expect(granted.has('admin *:*')).toBe(true);
        expect(expected.filter(grant => !granted.has(grant))).toEqual([]);
        expect(granted.size).toBe(new Set(expected).size);

        const periods = await tx.execute<{ id: string }>(sql`SELECT id FROM routine_periods ORDER BY id`);
        expect(periods.map(({ id }) => id)).toEqual(periodsBefore.map(({ id }) => id));
        expect(await count(tx, 'school_landing')).toBe(1);
        expect(await count(tx, 'cycles')).toBeGreaterThan(0);
        expect(await count(tx, 'staff_roles')).toBeGreaterThan(0);

        expect(await storedFiles(root)).toEqual({});
        expect(await readdir(root)).toEqual([]);
        expect(new Set(ended.users).size).toBe(usersBefore);
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }, 120_000);

  it('refuses a wrong password and changes nothing', async () => {
    const root = await storage({ 'students/a.png': 'photo a' });
    try {
      await inRollback(async (tx) => {
        const { service, ended } = backupService(tx, root);
        passwordFor(service, tx, 'right');
        const admin = await adminId(tx);
        const users = await count(tx, 'users');
        const students = await count(tx, 'students');
        const refusal = await service.reset('wrong', admin).then(() => null, (error: unknown) => error);
        expect(refusal).toMatchObject({ status: 400, message: 'backup.errors.wrongPassword' });
        expect(await count(tx, 'users')).toBe(users);
        expect(await count(tx, 'students')).toBe(students);
        expect(await readdir(root)).toEqual(['students']);
        expect(ended.users).toEqual([]);
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }, 120_000);

  it('puts the files back when the reset is rolled back', async () => {
    const root = await storage({ 'students/a.png': 'photo a' });
    try {
      await inRollback(async (tx) => {
        const { service, settle } = backupService(tx, root);
        passwordFor(service, tx, 'right');
        await service.reset('right', await adminId(tx));
        expect(Object.keys(await storedFiles(root)).filter(path => !path.startsWith('.'))).toEqual([]);
        await settle('rollback');
        expect(await storedFiles(root)).toEqual({ 'students/a.png': Buffer.from('photo a').toString('base64') });
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }, 120_000);
});
