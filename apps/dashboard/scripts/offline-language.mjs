// Runs in the page: whether the offline page's language record (najm-next's
// rememberNajmOfflineLanguage) holds `expected`. It never creates the
// database: an empty one would leave the app nowhere to record it.
export function recordedOfflineLanguage(expected) {
  return new Promise(resolve => {
    const open = indexedDB.open('najm-pwa-offline-language:myscolai-shell');
    open.onupgradeneeded = () => open.transaction.abort();
    open.onerror = () => resolve(false);
    open.onsuccess = () => {
      const database = open.result;
      if (!database.objectStoreNames.contains('values')) { database.close(); resolve(false); return; }
      const read = database.transaction('values').objectStore('values').get('language');
      read.onsuccess = () => { database.close(); resolve(read.result === expected); };
      read.onerror = () => { database.close(); resolve(false); };
    };
  });
}
