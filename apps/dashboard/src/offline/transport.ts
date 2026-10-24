// Installed by the neutral entry only, enforced by shared api.get only.
// Direct file fetches, mutations and auth requests do not pass through this
// gate. It is an unavailable-data signal, not an authorization boundary.
let unavailable = false;
export function installUnavailableTransport() { unavailable = true; }
export function assertRecordTransport() {
  if (unavailable) throw Object.assign(new Error('School data is not available offline yet.'), { code: 'OFFLINE_DATA_UNAVAILABLE' });
}
