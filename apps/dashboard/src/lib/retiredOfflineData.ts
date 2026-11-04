const STORAGE_KEYS = /^school\.(offline-|shell\.)/;
const DATABASES = /^(school-read-v1|school-offline-|najm-pwa-offline-language:|najm-pwa-install-budget:)/;
const CACHES = /^school-offline-/;

type Stores = {
  localStorage: Pick<Storage, 'length' | 'key' | 'removeItem'>;
  indexedDB: Pick<IDBFactory, 'databases' | 'deleteDatabase'>;
  caches: Pick<CacheStorage, 'keys' | 'delete'>;
};

/**
 * School no longer reads offline, but a device that used to can still hold
 * downloaded student and parent records. Nothing else would ever remove them, so
 * each page load deletes what remains. Finding nothing costs almost nothing, and
 * a store that is unavailable or still in use by an old tab is retried next time.
 */
export async function clearRetiredOfflineData(stores?: Stores) {
  const { localStorage, indexedDB, caches } = stores ?? window;
  await Promise.allSettled([
    (async () => {
      const keys = Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index));
      for (const key of keys) if (key && STORAGE_KEYS.test(key)) localStorage.removeItem(key);
    })(),
    (async () => {
      for (const { name } of await indexedDB.databases()) if (name && DATABASES.test(name)) indexedDB.deleteDatabase(name);
    })(),
    (async () => {
      for (const name of await caches.keys()) if (CACHES.test(name)) await caches.delete(name);
    })(),
  ]);
}
