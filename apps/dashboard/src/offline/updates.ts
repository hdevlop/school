import { createShellUpdates } from 'najm-offline/pwa';
import { OFFLINE_NAMESPACE } from '@sms/contracts/offline';
import { CACHE_ID } from './bootstrap';

export function hasGradeDrafts(storage: Pick<Storage, 'getItem'>): boolean {
  try {
    const drafts = JSON.parse(storage.getItem('school-grade-drafts') ?? 'null')?.state?.drafts;
    return !!drafts && Object.values(drafts).some(value => !!value && Object.keys(value).length > 0);
  } catch { return true; }
}

/** Grade drafts kept in session storage are unsaved work outside any form. */
export const shellUpdates = createShellUpdates({ namespace: OFFLINE_NAMESPACE, cacheId: CACHE_ID, loginPath: '/login',
  hasUnsavedWork: () => hasGradeDrafts(sessionStorage) });
export const { rememberOfflineLanguage, pruneUnpinnedCaches, pruneActiveShellCaches, connectShellUpdates } = shellUpdates;
