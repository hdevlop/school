'use client';

import { create } from 'zustand';
import { ACADEMIC_YEAR_HEADER } from '@sms/contracts/academic-years';
import { setDefaultRequestHeaders } from '@/lib/requestHeaders';
import {
  ACTIVE_SELECTION,
  browserStorage,
  isPersistable,
  readStoredSelection,
  restoreYearSelection,
  selectionStorageKey,
  writeStoredSelection,
  type YearSelection,
} from '../utils/yearSelection';

/**
 * The single owner of the viewing year in this tab. It is tab-local: another
 * tab's choice never changes it, so two tabs may show different years. It
 * stays `idle` until `AcademicYearSelectionOwner` initializes it for the
 * signed-in account, and year-scoped reads wait until it is `ready`.
 */
interface YearSelectionState {
  accountId: string | null;
  status: 'idle' | 'ready';
  selection: YearSelection;
  /** The school's active year, as the public settings (or first render) report it. */
  activeLabel: string | undefined;
  /** A year this role may not use was dropped while restoring; the banner says so. */
  droppedUnauthorized: boolean;
  initialize(input: { accountId: string; canChooseYear: boolean; entryLabel?: string }): void;
  applyEntryLink(label: string, canChooseYear: boolean): void;
  setActiveLabel(label: string | undefined): void;
  /** Selects a year; undefined (or the active year's label) selects active mode. */
  select(label: string | undefined): void;
  clear(): void;
  dismissNotice(): void;
}

function persist(accountId: string | null, selection: YearSelection, remember: boolean) {
  if (!accountId || !isPersistable(selection)) return;
  const key = selectionStorageKey(accountId);
  writeStoredSelection(browserStorage('session'), key, selection);
  if (remember) writeStoredSelection(browserStorage('local'), key, selection);
}

export const useYearSelectionStore = create<YearSelectionState>((set, get) => ({
  accountId: null,
  status: 'idle',
  selection: ACTIVE_SELECTION,
  activeLabel: undefined,
  droppedUnauthorized: false,

  initialize({ accountId, canChooseYear, entryLabel }) {
    const key = selectionStorageKey(accountId);
    const restored = restoreYearSelection({
      entryLabel,
      tab: readStoredSelection(browserStorage('session'), key),
      remembered: readStoredSelection(browserStorage('local'), key),
      canChooseYear,
    });
    persist(accountId, restored.selection, false);
    set({
      accountId,
      status: 'ready',
      selection: restored.selection,
      droppedUnauthorized: restored.droppedUnauthorized,
    });
  },

  applyEntryLink(label, canChooseYear) {
    const { accountId, status } = get();
    if (status !== 'ready' || !accountId) return;
    const restored = restoreYearSelection({ entryLabel: label, canChooseYear });
    persist(accountId, restored.selection, false);
    set({ selection: restored.selection, droppedUnauthorized: restored.droppedUnauthorized });
  },

  setActiveLabel(label) {
    if (get().activeLabel !== label) set({ activeLabel: label });
  },

  select(label) {
    const { accountId, activeLabel } = get();
    // Choosing the active year keeps following it, rather than pinning its label.
    const selection: YearSelection = !label || label === activeLabel
      ? ACTIVE_SELECTION
      : { mode: 'explicit', label };
    persist(accountId, selection, true);
    set({ selection, droppedUnauthorized: false });
  },

  clear() {
    set({ accountId: null, status: 'idle', selection: ACTIVE_SELECTION, droppedUnauthorized: false });
  },

  dismissNotice() {
    set({ droppedUnauthorized: false });
  },
}));

type SelectionSnapshot = Pick<YearSelectionState, 'status' | 'selection' | 'activeLabel'>;

/**
 * The concrete label year-scoped requests use: the explicit year, or the
 * active year's label in active mode. Undefined until the selection is ready
 * and, in active mode, the active year is known.
 */
export function selectedYearLabel(state: SelectionSnapshot): string | undefined {
  if (state.status !== 'ready') return undefined;
  return state.selection.mode === 'explicit' ? state.selection.label : state.activeLabel;
}

// Requests started outside a year scope (direct calls, prints) carry the
// tab's selection as it is when they start.
if (typeof window !== 'undefined') {
  setDefaultRequestHeaders(() => {
    const label = selectedYearLabel(useYearSelectionStore.getState());
    return label ? { [ACADEMIC_YEAR_HEADER]: label } : undefined;
  });
}
