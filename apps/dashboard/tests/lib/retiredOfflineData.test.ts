import { describe, expect, test } from 'bun:test';
import { clearRetiredOfflineData } from '@/lib/retiredOfflineData';

function fakeStores(storage: string[], databases: string[], caches: string[]) {
  const keys = [...storage];
  const deletedDatabases: string[] = [];
  const deletedCaches: string[] = [];
  return {
    keys,
    deletedDatabases,
    deletedCaches,
    stores: {
      localStorage: {
        get length() { return keys.length; },
        key: (index: number) => keys[index] ?? null,
        removeItem: (key: string) => { keys.splice(keys.indexOf(key), 1); },
      },
      indexedDB: {
        databases: async () => databases.map((name) => ({ name })),
        deleteDatabase: (name: string) => { deletedDatabases.push(name); return {} as IDBOpenDBRequest; },
      },
      caches: {
        keys: async () => caches,
        delete: async (name: string) => { deletedCaches.push(name); return true; },
      },
    },
  };
}

describe('clearRetiredOfflineData', () => {
  test('deletes what the offline feature stored on a device', async () => {
    const device = fakeStores(
      ['school.offline-account.v1', 'school.offline-access-signal.v1', 'school.offline-shell.v1', 'school.shell.preparation-budget:abc', 'school.shell.pin:abc'],
      ['school-read-v1:install:account', 'school-offline-installation-v1', 'najm-pwa-offline-language:myscolai-shell', 'najm-pwa-install-budget:myscolai-shell'],
      ['school-offline-branding'],
    );
    await clearRetiredOfflineData(device.stores);
    expect(device.keys).toEqual([]);
    expect(device.deletedDatabases).toEqual(['school-read-v1:install:account', 'school-offline-installation-v1', 'najm-pwa-offline-language:myscolai-shell', 'najm-pwa-install-budget:myscolai-shell']);
    expect(device.deletedCaches).toEqual(['school-offline-branding']);
  });

  test('leaves everything else on the device alone', async () => {
    const device = fakeStores(['school.year-selection', 'najm.tab-sync', 'theme'], ['other-app'], ['najm-pwa:myscolai-shell:runtime']);
    await clearRetiredOfflineData(device.stores);
    expect(device.keys).toEqual(['school.year-selection', 'najm.tab-sync', 'theme']);
    expect(device.deletedDatabases).toEqual([]);
    expect(device.deletedCaches).toEqual([]);
  });

  test('one unavailable store does not stop the others', async () => {
    const device = fakeStores(['school.offline-account.v1'], [], ['school-offline-branding']);
    device.stores.indexedDB.databases = async () => { throw new Error('blocked'); };
    await clearRetiredOfflineData(device.stores);
    expect(device.keys).toEqual([]);
    expect(device.deletedCaches).toEqual(['school-offline-branding']);
  });
});
