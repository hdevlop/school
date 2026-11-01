import { describe, expect, it } from 'bun:test';
import { strToU8, zipSync } from 'fflate';
import { MAX_BACKUP_BYTES, type BackupManifest } from '@sms/contracts/backup';
import { readBackupManifest } from '../../../../src/features/Settings/utils/backupFiles';

const manifest: BackupManifest = {
  format: 'school-backup',
  version: 1,
  createdAt: '2026-11-01T15:30:12.000Z',
  schoolName: 'École Najm',
  migration: { hash: 'abc', createdAt: 1793544559272 },
  tables: { students: 462, users: 563 },
  files: { count: 12, bytes: 1_100_000 },
};
const zip = (entries: Record<string, string>) => new Blob([zipSync(Object.fromEntries(
  Object.entries(entries).map(([name, content]) => [name, strToU8(content)]),
)) as BlobPart]);

describe('reading a chosen backup', () => {
  it('describes a backup from its manifest alone', async () => {
    expect(await readBackupManifest(zip({ 'manifest.json': JSON.stringify(manifest), 'database/students.jsonl': '{}\n' })))
      .toEqual({ ok: true, manifest });
  });

  it('refuses a file that is not a backup', async () => {
    for (const file of [new Blob(['not a zip']), zip({ 'notes.txt': 'hello' }), zip({ 'manifest.json': '{"format":"other"}' }), zip({ 'manifest.json': '{' })]) {
      expect(await readBackupManifest(file)).toEqual({ ok: false, error: 'backup.errors.invalidFile' });
    }
  });

  it('refuses a file the server would refuse for its size, without reading it', async () => {
    const huge = { size: MAX_BACKUP_BYTES + 1, arrayBuffer: () => { throw new Error('read'); } } as unknown as Blob;
    expect(await readBackupManifest(huge)).toEqual({ ok: false, error: 'backup.errors.tooLarge' });
  });
});
