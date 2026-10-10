import { describe, expect, it } from 'bun:test';
import {
  ACTIVE_SELECTION,
  isPersistable,
  readStoredSelection,
  restoreYearSelection,
  selectionStorageKey,
  writeStoredSelection,
} from '@/features/AcademicYears/utils/yearSelection';

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
    values,
  };
}

const throwing = {
  getItem: () => { throw new Error('blocked'); },
  setItem: () => { throw new Error('blocked'); },
  removeItem: () => { throw new Error('blocked'); },
};

describe('remembered viewing-year selection', () => {
  it('keys every account separately and carries a version', () => {
    expect(selectionStorageKey('u1')).toBe('sms:academic-year-selection:v1:u1');
    expect(selectionStorageKey('u1')).not.toBe(selectionStorageKey('u2'));
  });

  it('round-trips active mode and explicit labels', () => {
    const storage = memoryStorage();
    writeStoredSelection(storage, 'k', ACTIVE_SELECTION);
    expect(readStoredSelection(storage, 'k')).toEqual({ mode: 'active' });
    writeStoredSelection(storage, 'k', { mode: 'explicit', label: '2025-2026' });
    expect(readStoredSelection(storage, 'k')).toEqual({ mode: 'explicit', label: '2025-2026' });
  });

  it('treats corrupt, tampered and blocked storage as nothing stored', () => {
    const storage = memoryStorage();
    for (const raw of ['not json', '{"mode":"explicit","label":"all"}', '{"mode":"other"}', 'null']) {
      storage.values.set('k', raw);
      expect(readStoredSelection(storage, 'k')).toBeUndefined();
    }
    expect(readStoredSelection(throwing, 'k')).toBeUndefined();
    expect(readStoredSelection(undefined, 'k')).toBeUndefined();
    expect(() => writeStoredSelection(throwing, 'k', ACTIVE_SELECTION)).not.toThrow();
  });

  it('persists only well-formed labels', () => {
    expect(isPersistable(ACTIVE_SELECTION)).toBe(true);
    expect(isPersistable({ mode: 'explicit', label: '2025-2026' })).toBe(true);
    expect(isPersistable({ mode: 'explicit', label: 'nonsense' })).toBe(false);
  });
});

describe('the selection a tab starts with', () => {
  const tab = { mode: 'explicit', label: '2024-2025' } as const;
  const remembered = { mode: 'explicit', label: '2023-2024' } as const;

  it('prefers an entry link, then the tab, then the remembered choice, then active', () => {
    expect(restoreYearSelection({ entryLabel: '2025-2026', tab, remembered, canChooseYear: true }).selection)
      .toEqual({ mode: 'explicit', label: '2025-2026' });
    expect(restoreYearSelection({ tab, remembered, canChooseYear: true }).selection).toEqual(tab);
    expect(restoreYearSelection({ remembered, canChooseYear: true }).selection).toEqual(remembered);
    expect(restoreYearSelection({ canChooseYear: true }).selection).toEqual(ACTIVE_SELECTION);
  });

  it('keeps remembered active mode rather than pinning a label', () => {
    expect(restoreYearSelection({ tab: ACTIVE_SELECTION, remembered, canChooseYear: true }).selection)
      .toEqual(ACTIVE_SELECTION);
  });

  it('drops an explicit year visibly for a role limited to the active year', () => {
    for (const input of [{ entryLabel: '2025-2026' }, { tab }, { remembered }]) {
      expect(restoreYearSelection({ ...input, canChooseYear: false }))
        .toEqual({ selection: ACTIVE_SELECTION, droppedUnauthorized: true });
    }
    expect(restoreYearSelection({ canChooseYear: false }))
      .toEqual({ selection: ACTIVE_SELECTION, droppedUnauthorized: false });
  });

  it('keeps a malformed entry link as given, so the server refuses it visibly', () => {
    expect(restoreYearSelection({ entryLabel: 'nonsense', canChooseYear: true }).selection)
      .toEqual({ mode: 'explicit', label: 'nonsense' });
  });
});
