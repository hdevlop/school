'use client';

import { useCallback, useSyncExternalStore } from 'react';
import type { NTableProps } from 'najm-kit';
import { useYearSelectionStore } from '@/features/AcademicYears/store/yearSelectionStore';
import { createTableModePreferences, tableModeKey } from '@/shared/tableModePreference';

type TableMode = NonNullable<NTableProps['mode']>;
const changed = 'school:table-mode';
const preferences = createTableModePreferences(() => window.sessionStorage);

function subscribe(listener: () => void) {
  window.addEventListener(changed, listener);
  return () => window.removeEventListener(changed, listener);
}

/** Tab-local layout preference, restored through NTable's controlled-mode API. */
export function useRememberedTableMode(feature: string, defaultMode: TableMode = 'cards') {
  const accountId = useYearSelectionStore(state => state.accountId);
  const key = accountId ? tableModeKey(accountId, feature) : null;
  const getSnapshot = useCallback((): TableMode => {
    return key ? preferences.read(key, defaultMode) : defaultMode;
  }, [key, defaultMode]);
  const mode = useSyncExternalStore(subscribe, getSnapshot, () => defaultMode);
  const onModeChange = useCallback((next: TableMode) => {
    if (!key) return;
    preferences.write(key, next);
    window.dispatchEvent(new Event(changed));
  }, [key]);
  return { mode, onModeChange };
}
