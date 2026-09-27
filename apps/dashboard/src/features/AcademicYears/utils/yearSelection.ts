// The viewing year is remembered per signed-in account: `sessionStorage`
// restores a tab after a reload, `localStorage` offers the last choice to new
// tabs. Storage holds only this choice — never rows, roles or grants — and is
// untrusted: the server decides what a role may read.

import { parseSchoolYearLabel } from '@sms/contracts/academic-years';

/** Active mode follows the school's active year, including a later activation. */
export type YearSelection = { mode: 'active' } | { mode: 'explicit'; label: string };

export const ACTIVE_SELECTION: YearSelection = Object.freeze({ mode: 'active' });

const STORAGE_PREFIX = 'sms:academic-year-selection:v1:';

export function selectionStorageKey(accountId: string): string {
  return `${STORAGE_PREFIX}${accountId}`;
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** A stored selection, or undefined when absent, unreadable or not a year label. */
export function readStoredSelection(storage: StorageLike | undefined, key: string): YearSelection | undefined {
  try {
    const raw = storage?.getItem(key);
    if (!raw) return undefined;
    const value = JSON.parse(raw) as Partial<{ mode: string; label: string }>;
    if (value?.mode === 'active') return ACTIVE_SELECTION;
    if (value?.mode === 'explicit' && typeof value.label === 'string' && parseSchoolYearLabel(value.label)) {
      return { mode: 'explicit', label: value.label };
    }
  } catch {
    // Blocked or corrupt storage falls back to the in-memory selection.
  }
  return undefined;
}

export function writeStoredSelection(storage: StorageLike | undefined, key: string, selection: YearSelection) {
  try {
    storage?.setItem(key, JSON.stringify(selection));
  } catch {
    // Storage full or blocked: the selection still holds for this tab's session.
  }
}

/** The browser's storage areas, or undefined where access throws (private mode, SSR). */
export function browserStorage(area: 'session' | 'local'): StorageLike | undefined {
  try {
    return area === 'session' ? window.sessionStorage : window.localStorage;
  } catch {
    return undefined;
  }
}

export type RestoredSelection = {
  selection: YearSelection;
  /** A year the role may not use was dropped, so the page says so instead of switching silently. */
  droppedUnauthorized: boolean;
};

/**
 * The selection a tab starts with. An explicit entry link wins, then this
 * tab's own choice, then the account's remembered one, then the active year.
 * A role limited to the active year keeps active mode, and any explicit year
 * it carried is dropped visibly. An entry link's label is kept as given, even
 * malformed, so the server refuses it visibly rather than showing active data.
 */
export function restoreYearSelection(input: {
  entryLabel?: string;
  tab?: YearSelection;
  remembered?: YearSelection;
  canChooseYear: boolean;
}): RestoredSelection {
  const entry: YearSelection | undefined = input.entryLabel
    ? { mode: 'explicit', label: input.entryLabel }
    : undefined;
  const candidate = entry ?? input.tab ?? input.remembered ?? ACTIVE_SELECTION;
  if (candidate.mode === 'explicit' && !input.canChooseYear) {
    return { selection: ACTIVE_SELECTION, droppedUnauthorized: true };
  }
  return { selection: candidate, droppedUnauthorized: false };
}

/** Whether a selection may be remembered: only well-formed labels are persisted. */
export function isPersistable(selection: YearSelection): boolean {
  return selection.mode === 'active' || parseSchoolYearLabel(selection.label) !== null;
}
