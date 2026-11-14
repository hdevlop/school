import 'reflect-metadata';
import { describe, expect, it } from 'bun:test';
import sharp from 'sharp';
import { HOMEWORK_LIMITS } from '@sms/contracts';
import { HomeworkAttachmentService, homeworkFilePath } from '../../src/modules/homework/HomeworkAttachmentService';
import { asFile, homeworkValidator, memoryStorage, pdfOfSize, phonePhoto } from './support';

const MB = 1024 * 1024;
const target = { id: 'hw-1', academicYearId: 'year-1', teacher: { id: 'teacher-1' } };

function fixture({ quotaMb = 500, liveBytes = 0 } = {}) {
  const rows: any[] = [];
  const repository = {
    listForHomework: async (homeworkId: string) => rows.filter((row) => row.homeworkId === homeworkId),
    insert: async (inserted: any[]) => {
      const created = inserted.map((row, index) => ({ id: `att-${rows.length + index + 1}`, purgedAt: null, ...row }));
      rows.push(...created);
      return created;
    },
    remove: async (homeworkId: string, attachmentId: string) => {
      const index = rows.findIndex((row) => row.id === attachmentId && row.homeworkId === homeworkId);
      return index < 0 ? undefined : rows.splice(index, 1)[0];
    },
    findInHomework: async (homeworkId: string, attachmentId: string) =>
      rows.find((row) => row.id === attachmentId && row.homeworkId === homeworkId),
    liveBytesOfTeacher: async () => liveBytes,
    liveHashesAmong: async (hashes: string[]) =>
      new Set(rows.filter((row) => !row.purgedAt && hashes.includes(row.fileHash)).map((row) => row.fileHash)),
    storageSettings: async () => ({ quotaMb, retentionDays: 180 }),
  };
  const storage = memoryStorage();
  const service = new HomeworkAttachmentService(repository as never, homeworkValidator(), storage as never);
  Object.defineProperty(service, 'log', { value: { error: () => {} } });
  return { service, storage, rows };
}

const refusal = (key: string) => `homework.errors.${key}`;

describe('what is stored for a photo', () => {
  it('is an upright WebP no larger than 1600 px, without the place it was taken', async () => {
    const photo = await phonePhoto();
    const source = await sharp(photo).metadata();
    // The fixture really is what a phone sends: sideways and geotagged.
    expect(source.orientation).toBe(6);
    expect(source.exif?.includes(Buffer.from('TestPhone'))).toBe(true);
    expect((source.width ?? 0) > HOMEWORK_LIMITS.imageEdge).toBe(true);

    const { service } = fixture();
    const stored = await service.prepare(photo);
    const result = await sharp(stored.bytes).metadata();

    expect(stored.kind).toBe('image');
    expect(stored.mimeType).toBe('image/webp');
    expect(result.format).toBe('webp');
    // 3000×2000 on its side is 2000×3000 upright, fitted in 1600.
    expect([result.width, result.height]).toEqual([1067, 1600]);
    expect([stored.width, stored.height]).toEqual([1067, 1600]);
    expect(result.exif).toBeUndefined();
    expect(result.orientation).toBeUndefined();
    expect(stored.bytes.includes(Buffer.from('TestPhone'))).toBe(false);
    expect(stored.size).toBeLessThanOrEqual(HOMEWORK_LIMITS.storedImageBytes);
  });

  it('does not enlarge a small image', async () => {
    const small = await sharp({ create: { width: 400, height: 300, channels: 3, background: '#fff' } }).png().toBuffer();
    const stored = await fixture().service.prepare(small);
    expect([stored.width, stored.height]).toEqual([400, 300]);
  });

  it('keeps a PDF as received', async () => {
    const pdf = pdfOfSize(2048);
    const stored = await fixture().service.prepare(pdf);
    expect(stored).toMatchObject({ kind: 'pdf', mimeType: 'application/pdf', size: 2048, width: null, height: null });
    expect(stored.bytes.equals(pdf)).toBe(true);
  });
});

describe('what is refused', () => {
  it('a sixth file, counting only files that are still stored', async () => {
    const { service, rows } = fixture();
    const pdf = (n: number) => asFile(pdfOfSize(1000 + n), `page-${n}.pdf`, 'application/pdf');
    await service.add(target, [1, 2, 3, 4, 5].map(pdf));
    expect(rows).toHaveLength(5);
    await expect(service.add(target, [pdf(6)])).rejects.toThrow(refusal('tooManyFiles'));
    expect(rows).toHaveLength(5);

    // A purged file left a row behind but no longer takes a place.
    rows[0].purgedAt = '2026-11-01T00:00:00.000Z';
    await service.add(target, [pdf(7)]);
    expect(rows.filter((row) => !row.purgedAt)).toHaveLength(5);
  });

  it('a PDF over 5 MB, and a photo over 10 MB before it is read', async () => {
    const { service, storage } = fixture();
    await expect(service.add(target, [asFile(pdfOfSize(5 * MB + 1), 'book.pdf', 'application/pdf')]))
      .rejects.toThrow(refusal('pdfTooLarge'));
    await expect(service.add(target, [asFile(Buffer.alloc(10 * MB + 1), 'huge.jpg', 'image/jpeg')]))
      .rejects.toThrow(refusal('imageTooLarge'));
    expect(storage.saves).toEqual([]);
  });

  it('a program renamed to look like a photo: the bytes decide, not the name or the declared type', async () => {
    const { service, storage } = fixture();
    const program = Buffer.concat([Buffer.from('MZ'), Buffer.alloc(4096, 1)]);
    await expect(service.add(target, [asFile(program, 'holiday.jpg', 'image/jpeg')])).rejects.toThrow(refusal('unsupportedFile'));
    await expect(service.add(target, [asFile(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'), 'drawing.png', 'image/png')]))
      .rejects.toThrow(refusal('unsupportedFile'));
    expect(storage.saves).toEqual([]);
  });

  it('every file of a request when one of them is refused', async () => {
    const { service, storage, rows } = fixture();
    await expect(service.add(target, [
      asFile(pdfOfSize(1000), 'fine.pdf', 'application/pdf'),
      asFile(Buffer.from('not a file we accept'), 'notes.txt', 'text/plain'),
    ])).rejects.toThrow(refusal('unsupportedFile'));
    expect(rows).toEqual([]);
    expect(storage.saves).toEqual([]);
  });

  it('no file at all', async () => {
    await expect(fixture().service.add(target, [])).rejects.toThrow(refusal('noFile'));
  });

  it("a file past the teacher's yearly quota, saying so", async () => {
    const { service, storage } = fixture({ quotaMb: 1, liveBytes: MB - 500 });
    await expect(service.add(target, [asFile(pdfOfSize(1000), 'page.pdf', 'application/pdf')]))
      .rejects.toThrow(refusal('quotaExceeded'));
    expect(storage.saves).toEqual([]);
    // Up to the quota is allowed.
    const room = fixture({ quotaMb: 1, liveBytes: MB - 1000 });
    await room.service.add(target, [asFile(pdfOfSize(1000), 'page.pdf', 'application/pdf')]);
    expect(room.storage.saves).toHaveLength(1);
  });
});

describe('the same file', () => {
  it('is stored once and listed on each homework that has it', async () => {
    const { service, storage, rows } = fixture();
    const scan = pdfOfSize(3000);
    const [first] = await service.add(target, [asFile(scan, 'scan.pdf', 'application/pdf')]);
    const [second] = await service.add({ ...target, id: 'hw-2' }, [asFile(scan, 'again.pdf', 'application/pdf')]);

    expect(storage.saves).toHaveLength(1);
    expect(rows).toHaveLength(2);
    expect(rows[0].fileHash).toBe(rows[1].fileHash);
    expect(storage.saves[0]).toBe(homeworkFilePath(rows[0].fileHash, 'pdf'));
    // The stored path is never part of what a reader is sent.
    expect(Object.keys(first)).not.toContain('fileHash');

    // Removing one keeps the file for the other; removing both deletes it.
    await service.remove('hw-1', first.id);
    expect(storage.files.size).toBe(1);
    expect((await service.read('hw-2', second.id)).bytes.equals(scan)).toBe(true);
    await service.remove('hw-2', second.id);
    expect(storage.files.size).toBe(0);
  });
});

describe('reading a file', () => {
  it('needs the attachment to belong to the homework it is asked through', async () => {
    const { service } = fixture();
    const [attachment] = await service.add(target, [asFile(pdfOfSize(1000), 'page.pdf', 'application/pdf')]);
    await expect(service.read('hw-other', attachment.id)).rejects.toThrow(refusal('attachmentNotFound'));
    expect((await service.read('hw-1', attachment.id)).mimeType).toBe('application/pdf');
  });

  it('says a purged file was removed and a lost one is unavailable', async () => {
    const { service, storage, rows } = fixture();
    const [attachment] = await service.add(target, [asFile(pdfOfSize(1000), 'page.pdf', 'application/pdf')]);
    storage.files.clear();
    await expect(service.read('hw-1', attachment.id)).rejects.toThrow(refusal('attachmentMissing'));
    rows[0].purgedAt = '2026-11-01T00:00:00.000Z';
    await expect(service.read('hw-1', attachment.id)).rejects.toThrow(refusal('attachmentPurged'));
  });
});
