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

/** Every entry but the manifest, rows sorted so physical order does not matter. */
async function contents(archive: Blob) {
  const reader = new BackupArchiveReader(await bytes(archive));
  const entries = reader.read(reader.names.filter(name => name !== 'manifest.json'));
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
        expect(restored.manifest.tables).toEqual(original.manifest.tables);
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
            writer.text(name, JSON.stringify({ ...manifest, migration: { ...manifest.migration, hash: 'another-version' } }));
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
