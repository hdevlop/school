import 'reflect-metadata';
import { describe, expect, it, mock } from 'bun:test';
import { strToU8, zipSync } from 'fflate';
import * as i18n from 'najm-i18n';
import { backupFilePath, isBackupManifest, MAX_BACKUP_BYTES, type BackupManifest } from '@sms/contracts/backup';

// Refusals carry their catalog key, so each test names the one it expects.
mock.module('najm-i18n', () => ({ ...i18n, t: (key: string) => key }));
const { BackupArchiveReader, BackupArchiveWriter, backupFileName, insertionOrder, rowBatches } = await import('../../src/modules/backup/backupArchive');
const { BackupValidator } = await import('../../src/modules/backup/BackupValidator');

const manifest: BackupManifest = {
  format: 'school-backup',
  version: 1,
  createdAt: '2026-11-01T15:30:12.000Z',
  schoolName: 'École Najm',
  migration: { hash: 'abc', createdAt: 1793544559272 },
  tables: { students: 2, users: 1 },
  files: { count: 1, bytes: 3 },
};
const table = (name: string) => ({ name, columns: ['id'], identity: false });

async function archiveOf(entries: Record<string, string | Uint8Array>) {
  const writer = new BackupArchiveWriter();
  for (const [name, content] of Object.entries(entries)) {
    if (typeof content === 'string') writer.text(name, content);
    else writer.file(name, content);
  }
  return new Uint8Array(await writer.finish().arrayBuffer());
}

const complete = () => archiveOf({
  'database/students.jsonl': '{"id":"s1"}\n{"id":"s2"}\n',
  'database/users.jsonl': '{"id":"u1"}\n',
  'files/students/s1.png': new Uint8Array([1, 2, 3]),
  'manifest.json': JSON.stringify(manifest),
});

describe('backup archive', () => {
  it('reads back the manifest, each table line by line, and the stored files', async () => {
    const reader = new BackupArchiveReader(await complete());
    expect(reader.manifest()).toEqual(manifest);
    expect(reader.rows('students')).toEqual(['{"id":"s1"}', '{"id":"s2"}']);
    expect(reader.rows('missing')).toBeNull();
    expect(reader.fileNames).toEqual(['files/students/s1.png']);
    expect([...reader.read(['files/students/s1.png'])['files/students/s1.png']]).toEqual([1, 2, 3]);
  });

  it('writes a table given in pages as one file of lines', async () => {
    const writer = new BackupArchiveWriter();
    const entry = writer.lines('database/grades.jsonl');
    entry.push(['{"id":1}', '{"id":2}']);
    entry.push([]);
    entry.push(['{"id":3}']);
    entry.end();
    const reader = new BackupArchiveReader(new Uint8Array(await writer.finish().arrayBuffer()));
    expect(reader.rows('grades')).toEqual(['{"id":1}', '{"id":2}', '{"id":3}']);
  });

  it('orders tables after the tables they reference, ignoring references to themselves', () => {
    const order = insertionOrder(
      ['payments', 'fees', 'students', 'users', 'staff'].map(table),
      [
        { table: 'payments', references: 'fees' },
        { table: 'fees', references: 'students' },
        { table: 'students', references: 'users' },
        { table: 'staff', references: 'users' },
        { table: 'staff', references: 'staff' },
      ],
    ).map(({ name }) => name);
    for (const [child, parent] of [['payments', 'fees'], ['fees', 'students'], ['students', 'users'], ['staff', 'users']]) {
      expect(order.indexOf(child), `${child} after ${parent}`).toBeGreaterThan(order.indexOf(parent));
    }
    expect(order).toHaveLength(5);
  });

  it('refuses tables that reference each other in a loop', () => {
    expect(() => insertionOrder([table('a'), table('b')], [{ table: 'a', references: 'b' }, { table: 'b', references: 'a' }])).toThrow(/loop/);
  });

  it('groups rows into JSON arrays by count and size', () => {
    const rows = Array.from({ length: 5 }, (_, index) => `{"id":${index}}`);
    expect(rowBatches(rows, 2)).toEqual(['[{"id":0},{"id":1}]', '[{"id":2},{"id":3}]', '[{"id":4}]']);
    expect(rowBatches(rows, 100, 20)).toHaveLength(3);
    expect(rowBatches([])).toEqual([]);
    expect(rowBatches(rows).map(batch => JSON.parse(batch).length)).toEqual([5]);
  });

  it('names the download after the backup time', () => {
    expect(backupFileName('2026-11-01T15:30:12.000Z')).toBe('school-backup-2026-11-01-1530.zip');
  });
});

describe('backup contract', () => {
  it('keeps every stored file inside the storage folder', () => {
    expect(backupFilePath('files/students/a.png')).toBe('students/a.png');
    for (const unsafe of ['files/../a', 'files/a/../../b', 'files//a', 'files/C:/a', 'files/a\\b', 'files/', 'files/.restore-x/a', 'files/.previous/a', 'database/a.jsonl']) {
      expect(backupFilePath(unsafe), unsafe).toBeNull();
    }
  });

  it('accepts only a complete manifest of this format', () => {
    expect(isBackupManifest(manifest)).toBe(true);
    expect(isBackupManifest({ ...manifest, version: 2 })).toBe(false);
    expect(isBackupManifest({ ...manifest, tables: {} })).toBe(false);
    expect(isBackupManifest({ ...manifest, tables: { 'students; drop': 1 } })).toBe(false);
    expect(isBackupManifest({ ...manifest, tables: { students: -1 } })).toBe(false);
    expect(isBackupManifest({ ...manifest, migration: { hash: '' , createdAt: 1 } })).toBe(false);
    expect(isBackupManifest({ ...manifest, createdAt: 'yesterday' })).toBe(false);
  });
});

describe('backup validator', () => {
  const validator = new BackupValidator();
  const refusal = (key: string) => expect.objectContaining({ message: key });

  it('reads a complete archive', async () => {
    const { manifest: read, archive } = validator.readArchive(await complete());
    expect(read).toEqual(manifest);
    expect(() => validator.ensureComplete(archive, read)).not.toThrow();
  });

  it('refuses a file that is not a backup', () => {
    expect(() => validator.readArchive(strToU8('not a zip'))).toThrow(refusal('backup.errors.invalidFile'));
    expect(() => validator.readArchive(zipSync({ 'notes.txt': strToU8('hello') }))).toThrow(refusal('backup.errors.invalidFile'));
    expect(() => validator.readArchive(zipSync({ 'manifest.json': strToU8('{"format":"other"}') }))).toThrow(refusal('backup.errors.invalidFile'));
    expect(() => validator.readArchive(new Uint8Array(MAX_BACKUP_BYTES + 1))).toThrow(refusal('backup.errors.tooLarge'));
  });

  it('refuses an archive missing a table or file, or naming a file outside the storage folder', async () => {
    const without = async (name: string, extra: Record<string, string> = {}) => {
      const entries: Record<string, string | Uint8Array> = {
        'database/students.jsonl': '{"id":"s1"}\n{"id":"s2"}\n',
        'database/users.jsonl': '{"id":"u1"}\n',
        'files/students/s1.png': new Uint8Array([1, 2, 3]),
        'manifest.json': JSON.stringify(manifest),
        ...extra,
      };
      delete entries[name];
      return validator.readArchive(await archiveOf(entries));
    };
    for (const name of ['database/users.jsonl', 'files/students/s1.png']) {
      const { archive, manifest: read } = await without(name);
      expect(() => validator.ensureComplete(archive, read), name).toThrow(refusal('backup.errors.damaged'));
    }
    const { archive, manifest: read } = await without('files/students/s1.png', { 'files/../escape.png': 'x' });
    expect(() => validator.ensureComplete(archive, read)).toThrow(refusal('backup.errors.damaged'));
  });

  it('restores only into the same migration and the same tables, ignoring the session tables', () => {
    const tables = ['students', 'users', 'tokens', 'credential_setup_sessions', 'offline_read_snapshots'].map(table);
    expect(() => validator.ensureSameVersion(manifest, { hash: 'abc' }, tables)).not.toThrow();
    expect(() => validator.ensureSameVersion(manifest, { hash: 'newer' }, tables)).toThrow(refusal('backup.errors.otherVersion'));
    expect(() => validator.ensureSameVersion(manifest, null, tables)).toThrow(refusal('backup.errors.otherVersion'));
    expect(() => validator.ensureSameVersion(manifest, { hash: 'abc' }, [...tables, table('grades')])).toThrow(refusal('backup.errors.otherVersion'));
  });

  it('refuses a table whose row count differs from the manifest', () => {
    expect(() => validator.ensureRows(['{}', '{}'], 2)).not.toThrow();
    expect(() => validator.ensureRows(['{}'], 2)).toThrow(refusal('backup.errors.damaged'));
    expect(() => validator.ensureRows(null, 0)).toThrow(refusal('backup.errors.damaged'));
  });
});
