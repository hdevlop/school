import { offline } from './runtime';
export type { CachedPresentation } from 'najm-offline/client';

// The pointer chooses a database. Only its transactional access row authorizes records.
export const { pointerValue, invalidateSelection, installation, selectAccount, selectedReplica,
  canUseLegacyDisplay, cachedExpiryDelay, readCachedPresentation, updatePresentation } = offline.selection;
