export interface RoutineClassFilter {
  /** Null follows all current and newly added classes; an empty array hides all classes. */
  visibleClassIds: string[] | null;
}

type FilterStorage = Pick<Storage, 'getItem' | 'setItem'>;

export function routineClassFilterKey(accountId: string, academicYear: string) {
  return `sms:routine-class-filter:v1:${JSON.stringify([accountId, academicYear])}`;
}

export function routineFilterStorage(): FilterStorage | undefined {
  try { return window.localStorage; }
  catch { return undefined; }
}

export function readRoutineClassFilter(storage: FilterStorage | undefined, key: string): RoutineClassFilter | undefined {
  try {
    const raw = storage?.getItem(key);
    if (!raw) return undefined;
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object' || !('visibleClassIds' in value)) return undefined;
    const ids = value.visibleClassIds;
    if (ids === null) return { visibleClassIds: null };
    if (Array.isArray(ids) && ids.every((id) => typeof id === 'string' && id.length > 0)) {
      return { visibleClassIds: [...new Set(ids)] };
    }
  } catch {
    // Unavailable or malformed storage leaves the page on its default view.
  }
  return undefined;
}

export function writeRoutineClassFilter(storage: FilterStorage | undefined, key: string, filter: RoutineClassFilter): boolean {
  if (!storage) return false;
  try {
    storage.setItem(key, JSON.stringify(filter));
    return true;
  } catch {
    return false;
  }
}
