'use client';

import { useEffect, useState } from 'react';
import { readRoutineClassFilter, routineClassFilterKey, routineFilterStorage, writeRoutineClassFilter, type RoutineClassFilter } from '../store/routineClassFilter';

/** The saved checklist belongs to this account and school year on this browser. */
export function useRoutineClassFilter(accountId: string, academicYear?: string) {
  const key = academicYear ? routineClassFilterKey(accountId, academicYear) : undefined;
  const [state, setState] = useState<{ key?: string; filter?: RoutineClassFilter }>({});
  useEffect(() => {
    if (key) setState({ key, filter: readRoutineClassFilter(routineFilterStorage(), key) });
  }, [key]);

  const ready = Boolean(key && state.key === key);
  return {
    ready,
    hasSavedFilter: ready && state.filter !== undefined,
    visibleClassIds: ready ? state.filter?.visibleClassIds ?? null : null,
    save: (visibleClassIds: string[] | null) => {
      if (!key || !ready) return false;
      const filter = { visibleClassIds };
      if (!writeRoutineClassFilter(routineFilterStorage(), key, filter)) return false;
      setState({ key, filter });
      return true;
    },
  };
}
