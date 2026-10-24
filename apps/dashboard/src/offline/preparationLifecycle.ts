import type { NajmAuthClient } from 'najm-auth/client';
import { BOOTSTRAP_KEY } from './bootstrap';

/** A failed refresh is not an explicit user logout. This is display-only
 * preparation; future private data access uses the separate durable grant. */
export function connectPreparationLogout(client: NajmAuthClient, storage: Pick<Storage, 'removeItem'>) {
  const clear = () => { try { storage.removeItem(BOOTSTRAP_KEY); } catch { /* Storage already unavailable. */ } };
  client.on('logout', clear);
  return () => client.off('logout', clear);
}
