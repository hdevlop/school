import 'reflect-metadata';
import { describe, expect, test } from 'bun:test';
import { getGuardMetadata } from 'najm-guard';
import { canonicalJson, type ReplicaRecord } from 'najm-database/sync/contracts';
import { OFFLINE_SWITCH, offlineEnabled } from '@sms/contracts/offline';
import { OfflineService, splitReadPages } from '../../src/modules/offline/OfflineService';
import { OfflineController } from '../../src/modules/offline/OfflineController';
import { installationDto, snapshotDto, pageQuery } from '../../src/modules/offline/OfflineDto';

describe('read download boundary', () => {
  test('every operation requires the offline and authoritative Student read guards', () => {
    for (const method of ['grant', 'snapshot', 'page']) {
      const permissions = getGuardMetadata(OfflineController, method).filter(g => g.guardClass.name === 'PermissionGuard').map(g => g.params);
      expect(permissions).toContain('read:students');
      expect(permissions).toContain('read:offline');
    }
  });
  test('never accepts arbitrary routes, controller names, years, methods or records', () => {
    const identity = { installationId: crypto.randomUUID(), installationEpoch: crypto.randomUUID() };
    expect(installationDto.safeParse(identity).success).toBe(true);
    for (const extra of [{ route: '/fees' }, { academicYear: '2025-2026' }, { accountId: 'another' }]) {
      expect(installationDto.safeParse({ ...identity, ...extra }).success).toBe(false);
    }
    expect(snapshotDto.safeParse({ ...identity, kind: 'year', authorizationGeneration: 'a'.repeat(64) }).success).toBe(true);
    expect(snapshotDto.safeParse({ ...identity, kind: 'fees', authorizationGeneration: 'a'.repeat(64) }).success).toBe(false);
    expect(pageQuery.safeParse({ ...identity, authorizationGeneration: 'old' }).success).toBe(false);
  });
  test('enforces both page limits and refuses an indivisible oversized response', () => {
    const records = Array.from({ length: 1001 }, (_, id): ReplicaRecord => ({ entity: 'projection', id: String(id), revision: '1', deleted: false, value: 'x'.repeat(3000) }));
    const pages = splitReadPages(records);
    expect(pages.flat()).toEqual(records);
    expect(pages.length).toBeGreaterThan(2);
    for (const page of pages) {
      expect(page.length).toBeLessThanOrEqual(500);
      expect(new TextEncoder().encode(canonicalJson(page)).length).toBeLessThanOrEqual(1_048_576);
    }
    expect(() => splitReadPages([{ ...records[0], value: 'x'.repeat(1_048_576) }])).toThrow();
  });
  test('packs each page as full as both limits allow, counting multibyte text, in one pass', () => {
    const records = Array.from({ length: 4000 }, (_, id): ReplicaRecord => ({ entity: 'projection', id: String(id), revision: '1',
      deleted: false, value: { name: 'é'.repeat((id * 7919) % 2500), id } }));
    const started = performance.now();
    const pages = splitReadPages(records);
    expect(performance.now() - started).toBeLessThan(2000);
    expect(pages.flat()).toEqual(records);
    const size = (page: ReplicaRecord[]) => new TextEncoder().encode(canonicalJson(page)).length;
    pages.forEach((page, index) => {
      expect(page.length).toBeLessThanOrEqual(500);
      expect(size(page)).toBeLessThanOrEqual(1_048_576);
      // Greedy packing: the next record did not fit by count or by bytes.
      if (index < pages.length - 1) expect(page.length === 500 || size([...page, pages[index + 1][0]]) > 1_048_576).toBe(true);
    });
    expect(pages.some(page => page.length < 500)).toBe(true);
  });
  test('turned off, grants and downloads are refused before any account lookup', async () => {
    expect([undefined, '', 'on', 'true'].map(offlineEnabled)).toEqual([true, true, true, true]);
    expect(['off', ' OFF '].map(offlineEnabled)).toEqual([false, false]);
    const lookups: string[] = [];
    const service = { refusal: (key: string) => key, repository: { actor: async (id: string) => { lookups.push(id); return null; } } };
    const actor = (OfflineService.prototype as unknown as { actor(this: typeof service, id: string): Promise<unknown> }).actor;
    const previous = process.env[OFFLINE_SWITCH];
    try {
      process.env[OFFLINE_SWITCH] = 'off';
      await expect(actor.call(service, 'account')).rejects.toMatchObject({ status: 403, message: 'disabled' });
      expect(lookups).toEqual([]);
      delete process.env[OFFLINE_SWITCH];
      await expect(actor.call(service, 'account')).rejects.toMatchObject({ status: 403, message: 'notPermitted' });
      expect(lookups).toEqual(['account']);
    } finally {
      if (previous === undefined) delete process.env[OFFLINE_SWITCH]; else process.env[OFFLINE_SWITCH] = previous;
    }
  });
});
