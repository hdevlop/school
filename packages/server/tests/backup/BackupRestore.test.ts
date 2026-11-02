import 'reflect-metadata';
import { describe, expect, it, mock } from 'bun:test';
import type { BackupManifest } from '@sms/contracts/backup';
import { BackupArchiveReader } from '../../src/modules/backup/backupArchive';
import { strToU8, zipSync } from 'fflate';
import * as i18n from 'najm-i18n';

mock.module('najm-i18n', () => ({ ...i18n, t: (key: string) => key }));
const { BackupService } = await import('../../src/modules/backup/BackupService');
const { BackupValidator } = await import('../../src/modules/backup/BackupValidator');

// Journal timestamps of 0090_floor_manager_assignments and 0091_backup_permissions.
const previousMigration = 1793456117420;
const currentMigration = 1793544559272;
const manifest: BackupManifest = {
  format: 'school-backup', version: 1, createdAt: '2026-11-01T21:45:21.164Z', schoolName: null,
  migration: { hash: 'b53954d2a384920599800d69b54fcc56a00dfdf33e7f8c224d7a78e5ca16baa9', createdAt: previousMigration },
  tables: { users: 1, permissions: 1 }, files: { count: 0, bytes: 0 },
};
const tables = ['users', 'permissions'].map(name => ({ name, columns: ['id'], identity: false }));

function restoreHarness(createdAt = currentMigration, upgradeFailure?: Error) {
  const effects: string[] = [];
  const restored: Record<string, unknown[]> = {};
  const repository = {
    lockRestore: async () => { effects.push('lock'); },
    latestMigration: async () => ({ hash: 'installed', createdAt }),
    signedInState: async () => ({ userIds: ['current-user'], families: [] }),
    truncate: async () => { effects.push('truncate'); },
    references: async () => [],
    insertRows: async ({ name }: { name: string }, rows: string) => {
      restored[name] = JSON.parse(rows);
      effects.push(`insert:${name}`);
    },
    restoreBackupPermissions: async () => {
      effects.push('upgrade');
      if (upgradeFailure) throw upgradeFailure;
    },
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

describe('backup restore upgrades', () => {
  it('reapplies the permissions migration after restoring rows and before swapping files', async () => {
    const h = restoreHarness();
    const signedIn = await h.service.replaceDatabase(h.archive, manifest, tables, 'staged');
    expect(h.restored).toEqual({ users: [{ id: 'restored-user' }], permissions: [{ id: 'existing-permission' }] });
    const upgrade = h.effects.indexOf('upgrade');
    expect(upgrade).toBeGreaterThan(h.effects.indexOf('insert:permissions'));
    expect(upgrade).toBeGreaterThan(h.effects.indexOf('insert:users'));
    expect(h.effects.indexOf('files')).toBeGreaterThan(upgrade);
    expect(signedIn.userIds).toEqual(['current-user', 'restored-user']);
  });

  it('keeps a same-version restore exact without reapplying any migration', async () => {
    const h = restoreHarness(previousMigration);
    await h.service.replaceDatabase(h.archive, manifest, tables, 'staged');
    expect(h.effects).not.toContain('upgrade');
    expect(h.effects.at(-1)).toBe('files');
  });

  it('refuses an unreviewed migration under the lock before deleting any rows', async () => {
    const h = restoreHarness(1);
    const refusal = await h.service.replaceDatabase(h.archive, manifest, tables, 'staged').catch(error => error);
    expect(refusal).toMatchObject({ status: 409 });
    expect(h.effects).toEqual(['lock']);
    expect(h.restored).toEqual({});
  });

  it('propagates an upgrade failure before files are swapped so the transaction can roll back', async () => {
    const failure = new Error('permission insert failed');
    const h = restoreHarness(currentMigration, failure);
    await expect(h.service.replaceDatabase(h.archive, manifest, tables, 'staged')).rejects.toBe(failure);
    expect(h.effects).not.toContain('files');
    expect(h.effects).not.toContain('sequences');
  });
});
