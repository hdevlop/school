import 'reflect-metadata';
import { afterAll, describe, expect, it } from 'bun:test';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { BACKUP_EXCLUDED_FILE_NAMESPACES, isBackedUpFile } from '@sms/contracts/backup';
import { BackupService } from '../../src/modules/backup/BackupService';
import { HOMEWORK_NAMESPACE } from '../../src/modules/homework/HomeworkAttachmentService';

// Homework photos expire by themselves and would soon outgrow what a restore
// accepts (MAX_BACKUP_BYTES), so a backup keeps the homework text and leaves
// the files out.

const folders: string[] = [];
afterAll(async () => { for (const folder of folders) await rm(folder, { recursive: true, force: true }); });

describe('homework files and the backup', () => {
  it('names the folder the homework module stores in', () => {
    expect([...BACKUP_EXCLUDED_FILE_NAMESPACES]).toEqual([HOMEWORK_NAMESPACE]);
    expect(isBackedUpFile(`homework/${'a'.repeat(64)}.webp`)).toBe(false);
    expect(isBackedUpFile('Homework/x.pdf')).toBe(false);
    for (const kept of ['students/s1_avatar.png', 'massar/t_template.xlsx', 'homework-old/x.png', 'staff/homework/x.png']) {
      expect(isBackedUpFile(kept), kept).toBe(true);
    }
  });

  it('leaves them out of the archive and out of its file count', async () => {
    const root = await mkdtemp(join(tmpdir(), 'school-backup-'));
    folders.push(root);
    await mkdir(join(root, 'students'), { recursive: true });
    await mkdir(join(root, 'homework'), { recursive: true });
    await writeFile(join(root, 'students', 's1_avatar.png'), new Uint8Array([1, 2, 3]));
    await writeFile(join(root, 'homework', `${'a'.repeat(64)}.webp`), new Uint8Array(5000));
    await writeFile(join(root, 'homework', `${'b'.repeat(64)}.pdf`), new Uint8Array(7000));

    const service = new BackupService({} as never, {} as never, {} as never);
    service.storagePath = root;
    const written: string[] = [];
    const summary = await (service as any).addStoredFiles({ file: (name: string) => { written.push(name); } });

    expect(written).toEqual(['files/students/s1_avatar.png']);
    expect(summary).toEqual({ count: 1, bytes: 3 });
  });
});
