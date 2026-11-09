import 'reflect-metadata';
import { afterAll, beforeAll, expect, it } from 'bun:test';
import { MassarService } from '../../src/modules/massar/MassarService';
import { MassarValidator } from '../../src/modules/massar/MassarValidator';
import { MassarCleanupService } from '../../src/modules/massar/MassarCleanupService';
import { SchoolStorageValidator } from '../../src/config/SchoolStorageValidator';
import { StorageValidator } from 'najm-storage';
import { storageConfig } from '../../src/config/storageConfig';
import { template, setupFixture, massarTestI18n } from './fixtures';
import { readExport } from '../../src/modules/massar/workbook/readExport';

let i18n: Awaited<ReturnType<typeof massarTestI18n>>;
beforeAll(async () => { i18n = await massarTestI18n(); });
afterAll(async () => { await i18n?.stop(); });
const actor = { id: 'registrar', role: 'registrar', permissions: ['manage:massar'] };

async function importFixture() {
  const source = await readExport(template), setup = setupFixture();
  setup.year = { ...source, massarYearId: source.yearId, templateFileId: 'old_template.xlsx' } as any;
  const previews = new Map<string, any>(), objects = new Map<string, Buffer>([['old_template.xlsx', Buffer.from(template)]]);
  const committed: Array<() => Promise<void>> = [], rolledBack: Array<() => Promise<void>> = [];
  const repository = {
    lock: async () => {}, setup: async () => setup,
    createPreview: async (preview: any) => { previews.set(preview.id, preview); },
    previewById: async (id: string, actorId: string) => { const preview = previews.get(id); return preview?.actorId === actorId ? preview : undefined; },
    consumePreview: async (id: string) => { previews.delete(id); },
    saveYear: async () => {}, saveLevel: async () => ({ id: 'level' }), saveClass: async () => ({ id: 'class' }),
    subjectForImport: async () => undefined, saveSubject: async () => {}, saveEnrollment: async () => {}, sheets: async () => [], relinkTeachers: async () => {},
  };
  const storage = {
    save: async (_namespace: string, id: string, bytes: Buffer) => { objects.set(id, bytes); },
    get: async (_namespace: string, id: string) => objects.get(id),
    delete: async (_namespace: string, id: string) => objects.delete(id),
  };
  const service = new MassarService(repository as any, new MassarValidator(), storage as any, {} as any, {} as any);
  Object.defineProperty(service, 'year', { value: { id: 'year', label: '2026-2027', status: 'open' } });
  Object.defineProperty(service, 'transactions', { value: { afterCommit: async (callback: () => Promise<void>) => { committed.push(callback); }, afterRollback: async (callback: () => Promise<void>) => { rolledBack.push(callback); } } });
  const preview = await service.previewUploads([new File([template], 'synthetic.xlsx')], actor);
  const data = { ...preview, addMissingSheets: false };
  return { service, repository, storage, objects, previews, committed, rolledBack, preview, data };
}

it('deletes consumed preview and replaced template files only after commit', async () => {
  const { service, objects, committed, preview, data } = await importFixture();
  await service.commit(data, actor);
  expect(objects.has(`${preview.previewId}_preview.txt`)).toBe(true);
  expect(objects.has('old_template.xlsx')).toBe(true);
  for (const callback of committed) await callback();
  expect(objects.has(`${preview.previewId}_preview.txt`)).toBe(false);
  expect(objects.has('old_template.xlsx')).toBe(false);
  expect(objects.size).toBe(1);
  expect([...objects.keys()][0]).toEndWith('_template.xlsx');
});

it('removes a newly saved template after rollback and retains the prior template and preview', async () => {
  const { service, repository, objects, committed, rolledBack, preview, data } = await importFixture();
  repository.saveYear = async () => { throw new Error('Database write failed'); };
  await expect(service.commit(data, actor)).rejects.toThrow('Database write failed');
  expect(committed).toHaveLength(0);
  for (const callback of rolledBack) await callback();
  expect([...objects.keys()].sort()).toEqual([`${preview.previewId}_preview.txt`, 'old_template.xlsx'].sort());
});

it('reports cleanup failures for retry without turning a committed import into a failed request', async () => {
  const { service, storage, committed, data } = await importFixture();
  let failures = 0;
  Object.defineProperty(service, 'log', { value: { error: () => { failures++; } } });
  await service.commit(data, actor);
  storage.delete = async () => { throw new Error('Storage unavailable'); };
  for (const callback of committed) await callback();
  expect(failures).toBe(2);
});

it('cancels only the current actor’s preview and deletes its file after commit', async () => {
  const { service, objects, previews, committed, preview } = await importFixture();
  await service.cancelPreview(preview.previewId, { ...actor, id: 'another-registrar' });
  expect(previews.has(preview.previewId)).toBe(true);
  await service.cancelPreview(preview.previewId, actor);
  expect(objects.has(`${preview.previewId}_preview.txt`)).toBe(true);
  for (const callback of committed) await callback();
  expect(previews.has(preview.previewId)).toBe(false);
  expect(objects.has(`${preview.previewId}_preview.txt`)).toBe(false);
  expect(objects.has('old_template.xlsx')).toBe(true);
});

it('cleans expired previews and old orphans, preserving references across years and in-flight files', async () => {
  const removed: string[] = [], consumed: string[] = [], now = new Date('2026-11-06T12:00:00Z');
  const old = '2026-11-06T09:00:00Z', recent = '2026-11-06T11:59:00Z';
  const repository = {
    expiredPreviewsForMaintenance: async () => [{ id: 'expired', fileId: 'expired_preview.txt' }],
    removeExpiredPreviewForMaintenance: async (id: string) => { consumed.push(id); },
    storageReferencesForMaintenance: async () => ({ previews: [{ fileId: 'active_preview.txt' }], templates: [{ fileId: 'other-year_template.xlsx' }] }),
  };
  const storage = {
    delete: async (_namespace: string, id: string) => { removed.push(id); },
    list: async () => ['old_template.xlsx', 'orphan_preview.txt', 'active_preview.txt', 'other-year_template.xlsx', 'unrelated.xlsx'].map(filePath => ({ filePath, updatedAt: old })).concat([{ filePath: 'in-flight_template.xlsx', updatedAt: recent }]),
  };
  await new MassarCleanupService(repository as any, storage as any).cleanup(now);
  expect(consumed).toEqual(['expired']);
  expect(removed).toEqual(['expired_preview.txt', 'old_template.xlsx', 'orphan_preview.txt']);
  storage.delete = async () => { throw new Error('Storage unavailable'); };
  await expect(new MassarCleanupService(repository as any, storage as any).cleanup(now)).rejects.toThrow('Storage unavailable');
  expect(consumed).toEqual(['expired']); // Failed deletion remains eligible for retry.
});

it('restricts spreadsheet/text uploads to Massar, including inferred MIME and Windows case variants', () => {
  expect(storageConfig().aliases).toContainEqual([StorageValidator, SchoolStorageValidator]);
  const validator = new SchoolStorageValidator();
  for (const namespace of ['students', 'parents', 'documents', 'generic']) {
    for (const path of ['file.xlsx', 'file.csv', 'file.txt']) expect(() => validator.resolveUploadTarget(namespace, path, undefined)).toThrow();
    expect(validator.resolveUploadTarget(namespace, 'avatar.png', undefined).mimeType).toBe('image/png');
    expect(validator.resolveUploadTarget(namespace, 'report.pdf', undefined).mimeType).toBe('application/pdf');
  }
  for (const namespace of ['massar', 'MaSsAr']) for (const path of ['preview.txt', 'template.xlsx']) expect(validator.resolveUploadTarget(namespace, path, undefined).namespace).toBe(namespace);
});
