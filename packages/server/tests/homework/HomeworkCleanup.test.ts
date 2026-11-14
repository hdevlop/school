import 'reflect-metadata';
import { describe, expect, it } from 'bun:test';
import { HomeworkCleanupService } from '../../src/modules/homework/HomeworkCleanupService';
import { homeworkFilePath } from '../../src/modules/homework/HomeworkAttachmentService';
import { memoryStorage } from './support';

const NOW = new Date('2026-11-13T12:00:00.000Z');
const HOUR = 60 * 60 * 1000;
const hash = (letter: string) => letter.repeat(64);

type Row = { id: string; fileHash: string; kind: 'image' | 'pdf'; due: string; purgedAt: string | null };

function fixture(rows: Row[], { retentionDays = 180 }: { retentionDays?: number } = {}) {
  let clock = NOW.getTime();
  const storage = memoryStorage(() => clock);
  const repository = {
    storageSettings: async () => ({ quotaMb: 500, retentionDays }),
    expiredBefore: async (day: string) => rows.filter((row) => !row.purgedAt && row.due < day),
    markPurged: async (ids: string[], at: string) => {
      for (const row of rows) if (ids.includes(row.id) && !row.purgedAt) row.purgedAt = at;
    },
    liveFiles: async () => rows.filter((row) => !row.purgedAt).map(({ fileHash, kind }) => ({ fileHash, kind })),
    liveHashesAmong: async (hashes: string[]) =>
      new Set(rows.filter((row) => !row.purgedAt && hashes.includes(row.fileHash)).map((row) => row.fileHash)),
  };
  const put = async (path: string, age: number) => {
    clock = NOW.getTime() - age;
    await storage.save('homework', path, Buffer.from('x'));
    clock = NOW.getTime();
  };
  const service = new HomeworkCleanupService(repository as never, storage as never);
  return { service, storage, rows, put };
}

// 180 days before 13 Nov 2026 is 17 May 2026: a file is purged once its
// homework was due before that day.
describe('homework file cleanup', () => {
  it('purges a file 180 days after the due date and keeps the row', async () => {
    const rows: Row[] = [
      { id: 'old', fileHash: hash('a'), kind: 'image', due: '2026-05-16', purgedAt: null },
      { id: 'edge', fileHash: hash('b'), kind: 'image', due: '2026-05-17', purgedAt: null },
      { id: 'recent', fileHash: hash('c'), kind: 'pdf', due: '2026-11-10', purgedAt: null },
    ];
    const { service, storage, put } = fixture(rows);
    for (const row of rows) await put(homeworkFilePath(row.fileHash, row.kind), 200 * 24 * HOUR);

    await service.cleanup(NOW);

    expect(rows.map((row) => [row.id, Boolean(row.purgedAt)])).toEqual([['old', true], ['edge', false], ['recent', false]]);
    expect(rows[0].purgedAt).toBe(NOW.toISOString());
    expect([...storage.files.keys()].sort()).toEqual([`${hash('b')}.webp`, `${hash('c')}.pdf`]);
  });

  it('follows the retention the school set', async () => {
    const rows: Row[] = [{ id: 'month-old', fileHash: hash('a'), kind: 'image', due: '2026-10-01', purgedAt: null }];
    const kept = fixture(rows.map((row) => ({ ...row })));
    await kept.put(`${hash('a')}.webp`, 24 * HOUR);
    await kept.service.cleanup(NOW);
    expect(kept.storage.files.size).toBe(1);

    const short = fixture(rows.map((row) => ({ ...row })), { retentionDays: 30 });
    await short.put(`${hash('a')}.webp`, 24 * HOUR);
    await short.service.cleanup(NOW);
    expect(short.storage.files.size).toBe(0);
    expect(short.rows[0].purgedAt).not.toBeNull();
  });

  it('keeps a file an expired row shares with a live one', async () => {
    const rows: Row[] = [
      { id: 'expired', fileHash: hash('a'), kind: 'pdf', due: '2026-01-10', purgedAt: null },
      { id: 'reposted', fileHash: hash('a'), kind: 'pdf', due: '2026-11-12', purgedAt: null },
    ];
    const { service, storage, put } = fixture(rows);
    await put(`${hash('a')}.pdf`, 300 * 24 * HOUR);

    await service.cleanup(NOW);

    expect(rows[0].purgedAt).not.toBeNull();
    expect(rows[1].purgedAt).toBeNull();
    expect([...storage.files.keys()]).toEqual([`${hash('a')}.pdf`]);
  });

  it('deletes an orphan older than an hour and keeps a younger one, which may be an upload in progress', async () => {
    const { service, storage, put } = fixture([]);
    await put(`${hash('d')}.webp`, 2 * HOUR);
    await put(`${hash('e')}.webp`, 30 * 60 * 1000);
    // Not a homework file name: never this service's to delete.
    await put('notes.txt', 48 * HOUR);

    await service.cleanup(NOW);

    expect([...storage.files.keys()].sort()).toEqual([`${hash('e')}.webp`, 'notes.txt'].sort());
  });

  it('keeps an old file a new upload pointed a row at while the sweep was running', async () => {
    const rows: Row[] = [];
    const { service, storage, put } = fixture(rows);
    await put(`${hash('f')}.pdf`, 5 * HOUR);
    // The row appears after the sweep read the live files and before it deletes.
    const list = storage.list;
    storage.list = async () => {
      rows.push({ id: 'new', fileHash: hash('f'), kind: 'pdf', due: '2026-11-20', purgedAt: null });
      return list();
    };

    await service.cleanup(NOW);

    expect(storage.files.has(`${hash('f')}.pdf`)).toBe(true);
  });

  it('leaves a failed deletion for the next sweep', async () => {
    const rows: Row[] = [{ id: 'old', fileHash: hash('a'), kind: 'image', due: '2026-01-10', purgedAt: null }];
    const { service, storage, put } = fixture(rows);
    await put(`${hash('a')}.webp`, 300 * 24 * HOUR);
    const remove = storage.delete;
    storage.delete = async () => { throw new Error('Storage unavailable'); };
    await expect(service.cleanup(NOW)).rejects.toThrow('Storage unavailable');

    // The row is purged, so the file is now an orphan the next sweep removes.
    storage.delete = remove;
    await service.cleanup(NOW);
    expect(storage.files.size).toBe(0);
  });
});
