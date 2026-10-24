/** Serializable browser diagnostic. Reads only existing application-created stores. */
export async function readPreparedDisplay() {
  const identity = JSON.parse(localStorage.getItem('school.offline-account.v1') ?? 'null');
  if (!identity?.accountId) return JSON.parse(localStorage.getItem('school.offline-shell.v1') ?? 'null');
  return new Promise(resolve => {
    const request = indexedDB.open(`school-read-v1:${identity.installationId}:${identity.accountId}`);
    request.onupgradeneeded = () => request.transaction.abort();
    request.onerror = () => resolve(null);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction('metadata');
      const access = tx.objectStore('metadata').get('access');
      const display = tx.objectStore('metadata').get('presentation');
      tx.oncomplete = () => {
        db.close();
        resolve(access.result?.status === 'available' ? display.result?.bootstrap ?? null : null);
      };
      tx.onerror = () => { db.close(); resolve(null); };
    };
  });
}
