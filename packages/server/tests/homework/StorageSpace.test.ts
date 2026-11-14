import 'reflect-metadata';
import { describe, expect, it } from 'bun:test';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { translations } from '@sms/contracts/locales';
import { StorageMonitorService } from '../../src/modules/health/StorageMonitorService';
import { readStorageSpace, storageAlertStep } from '../../src/modules/health/storageSpace';

const GB = 1024 ** 3;
const disk = (freePercent: number) => ({ totalBytes: 155 * GB, freeBytes: (155 * GB * freePercent) / 100 });

describe('reading the disk', () => {
  it('answers free and total bytes, also for a folder the first upload has not created yet', async () => {
    const existing = await readStorageSpace(tmpdir());
    expect(existing).not.toBeNull();
    expect(existing!.totalBytes).toBeGreaterThan(0);
    expect(existing!.freeBytes).toBeGreaterThanOrEqual(0);
    expect(existing!.freeBytes).toBeLessThanOrEqual(existing!.totalBytes);

    const missing = await readStorageSpace(join(tmpdir(), 'school-no-such-folder', 'storage'));
    expect(missing?.totalBytes).toBe(existing!.totalBytes);
  });
});

describe('when free space alerts', () => {
  it('once under 20%, once more under 10%, and again only after space recovered', () => {
    expect(storageAlertStep(disk(46), null)).toMatchObject({ level: null, alert: null });
    expect(storageAlertStep(disk(20), null)).toMatchObject({ level: null, alert: null });
    expect(storageAlertStep(disk(19.9), null)).toMatchObject({ level: 20, alert: 20 });
    // Still low an hour later: remembered, not repeated.
    expect(storageAlertStep(disk(18), 20)).toMatchObject({ level: 20, alert: null });
    expect(storageAlertStep(disk(9), 20)).toMatchObject({ level: 10, alert: 10 });
    expect(storageAlertStep(disk(8), 10)).toMatchObject({ level: 10, alert: null });
    // Back above 10% without leaving the low zone: no new alert, but the next fall under 10% alerts.
    expect(storageAlertStep(disk(15), 10)).toMatchObject({ level: 20, alert: null });
    expect(storageAlertStep(disk(9), 20)).toMatchObject({ level: 10, alert: 10 });
    // Recovered: forgotten, so the next fall alerts again.
    expect(storageAlertStep(disk(30), 10)).toMatchObject({ level: null, alert: null });
    expect(storageAlertStep(disk(5), null)).toMatchObject({ level: 10, alert: 10 });
  });
});

describe('the storage monitor', () => {
  function fixture(settings: { id: string; storageAlertLevel: number | null; language?: string } | undefined) {
    const notices: Array<{ title: string; message: string; priority: string }> = [];
    const updates: Array<Record<string, unknown>> = [];
    const service = new StorageMonitorService(
      {
        getAdminSettings: async () => settings,
        update: async (_id: string, data: Record<string, unknown>) => { updates.push(data); Object.assign(settings!, data); },
      } as never,
      { createSystemNotice: async (notice: { title: string; message: string; priority: string }) => { notices.push(notice); } } as never,
    );
    return { service, notices, updates };
  }

  it('writes one alert per level, in the school language, with the numbers', async () => {
    const { service, notices, updates } = fixture({ id: 's1', storageAlertLevel: null, language: 'fr' });
    await service.check(disk(18));
    await service.check(disk(17));
    expect(notices).toHaveLength(1);
    expect(notices[0].priority).toBe('high');
    expect(notices[0].title).toBe(translations.fr.alerts.storage.lowTitle);
    expect(notices[0].message).toContain('18 %');
    expect(notices[0].message).toContain('155.0 Go');
    expect(notices[0].message).not.toContain('{{');
    expect(updates).toEqual([{ storageAlertLevel: 20 }]);

    await service.check(disk(7));
    expect(notices).toHaveLength(2);
    expect(notices[1].priority).toBe('critical');
    expect(notices[1].title).toBe(translations.fr.alerts.storage.criticalTitle);

    await service.check(disk(40));
    expect(notices).toHaveLength(2);
    expect(updates.at(-1)).toEqual({ storageAlertLevel: null });
  });

  it('does nothing before the school is installed or when the disk cannot be read', async () => {
    const empty = fixture(undefined);
    expect(await empty.service.check(disk(5))).toBeNull();
    expect(empty.notices).toEqual([]);
  });

  it('does not remember a level whose alert could not be written', async () => {
    const settings = { id: 's1', storageAlertLevel: null as number | null };
    const updates: unknown[] = [];
    const service = new StorageMonitorService(
      { getAdminSettings: async () => settings, update: async (_id: string, data: unknown) => { updates.push(data); } } as never,
      { createSystemNotice: async () => { throw new Error('Database unavailable'); } } as never,
    );
    await expect(service.check(disk(5))).rejects.toThrow('Database unavailable');
    expect(updates).toEqual([]);
  });

  it('has the alert text in every language with the same placeholders', () => {
    const placeholders = (text: string) => [...text.matchAll(/\{\{(\w+)\}\}/g)].map((match) => match[1]).sort().join();
    for (const key of ['lowTitle', 'lowMessage', 'criticalTitle', 'criticalMessage'] as const) {
      for (const language of ['fr', 'ar', 'es'] as const) {
        expect(placeholders(translations[language].alerts.storage[key]), `${language} ${key}`)
          .toBe(placeholders(translations.en.alerts.storage[key]));
      }
    }
  });
});
