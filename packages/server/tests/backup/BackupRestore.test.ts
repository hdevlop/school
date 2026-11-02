import 'reflect-metadata';
import { describe, expect, it, mock } from 'bun:test';
import type { BackupManifest } from '@sms/contracts/backup';
import { BackupArchiveReader } from '../../src/modules/backup/backupArchive';
import type { BackupMigration } from '../../src/modules/backup/backupMigrations';
import { strToU8, zipSync } from 'fflate';
import * as i18n from 'najm-i18n';

mock.module('najm-i18n', () => ({ ...i18n, t: (key: string) => key }));
const { BackupService } = await import('../../src/modules/backup/BackupService');
const { BackupValidator } = await import('../../src/modules/backup/BackupValidator');

const migration = (folderMillis: number): BackupMigration => ({ sql: [`-- ${folderMillis}`], folderMillis, hash: `hash-${folderMillis}`, bps: true });
const migrations = [migration(100), migration(200), migration(300)];
const manifest: BackupManifest = {
  format: 'school-backup', version: 1, createdAt: '2026-11-01T21:45:21.164Z', schoolName: null,
  migration: { hash: 'hash-from-another-checkout', createdAt: 200 },
  tables: { users: 1, permissions: 1 }, files: { count: 0, bytes: 0 },
};
const rebuilt = ['users', 'permissions', 'tokens'].map(name => ({ name, columns: ['id'], identity: false }));

function restoreHarness(installed = 300, failure?: { at: number; error: Error }) {
  const effects: string[] = [];
  const restored: Record<string, unknown[]> = {};
  const repository = {
    lockRestore: async () => { effects.push('lock'); },
    latestMigration: async () => ({ hash: 'installed', createdAt: installed }),
    signedInState: async () => ({ userIds: ['current-user'], families: [] }),
    dropSchema: async () => { effects.push('drop'); },
    runMigrations: async (run: BackupMigration[]) => {
      for (const { folderMillis } of run) {
        effects.push(`migrate:${folderMillis}`);
        if (failure?.at === folderMillis) throw failure.error;
      }
    },
    tables: async () => rebuilt,
    truncate: async (names: string[]) => { effects.push(`truncate:${names.join(',')}`); },
    references: async () => [],
    insertRows: async ({ name }: { name: string }, rows: string) => {
      restored[name] = JSON.parse(rows);
      effects.push(`insert:${name}`);
    },
    checkConstraintsNow: async () => { effects.push('constraints'); },
    resetSequences: async () => { effects.push('sequences'); },
    userIds: async () => ['restored-user'],
  };
  const service = new BackupService(repository as never, new BackupValidator(), {} as never);
  Object.assign(service, { swapFiles: async () => { effects.push('files'); } });
  const archive = new BackupArchiveReader(zipSync({
    'database/users.jsonl': strToU8('{"id":"restored-user"}\n'),
    'database/permissions.jsonl': strToU8('{"id":"existing-permission"}\n'),
  }));
  return { service, archive, effects, restored };
}

describe('backup restore', () => {
  it('rebuilds the backup\'s version, restores its rows, then applies the later migrations before swapping files', async () => {
    const h = restoreHarness();
    const signedIn = await h.service.replaceDatabase(h.archive, manifest, migrations, 'staged');
    expect(h.restored).toEqual({ users: [{ id: 'restored-user' }], permissions: [{ id: 'existing-permission' }] });
    expect(h.effects).toEqual([
      'lock', 'drop', 'migrate:100', 'migrate:200',
      // The rows the migrations seeded give way to the backup's, the session table included.
      'truncate:users,permissions,tokens', 'insert:permissions', 'insert:users',
      'constraints', 'sequences', 'migrate:300', 'files',
    ]);
    expect(signedIn.userIds).toEqual(['current-user', 'restored-user']);
  });

  it('rebuilds a same-version backup from every migration and applies none after its rows', async () => {
    const h = restoreHarness();
    await h.service.replaceDatabase(h.archive, { ...manifest, migration: { ...manifest.migration, createdAt: 300 } }, migrations, 'staged');
    expect(h.effects.slice(1, 5)).toEqual(['drop', 'migrate:100', 'migrate:200', 'migrate:300']);
    expect(h.effects.slice(-3)).toEqual(['constraints', 'sequences', 'files']);
  });

  it('refuses under the lock, before dropping anything, when a deploy moved the database on', async () => {
    const h = restoreHarness(400);
    const refusal = await h.service.replaceDatabase(h.archive, manifest, migrations, 'staged').catch(error => error);
    expect(refusal).toMatchObject({ status: 409, message: 'backup.errors.databaseMismatch' });
    expect(h.effects).toEqual(['lock']);
  });

  it('refuses a newer backup under the lock before dropping anything', async () => {
    const h = restoreHarness();
    const refusal = await h.service.replaceDatabase(h.archive, { ...manifest, migration: { ...manifest.migration, createdAt: 400 } }, migrations, 'staged')
      .catch(error => error);
    expect(refusal).toMatchObject({ status: 409, message: 'backup.errors.otherVersion' });
    expect(h.effects).toEqual(['lock']);
  });

  it('propagates a failed upgrade before files are swapped so the transaction can roll back', async () => {
    const error = new Error('migration 300 failed');
    const h = restoreHarness(300, { at: 300, error });
    await expect(h.service.replaceDatabase(h.archive, manifest, migrations, 'staged')).rejects.toBe(error);
    expect(h.effects).not.toContain('files');
  });
});
