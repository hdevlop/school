import { afterAll, beforeEach, describe, expect, it } from 'bun:test';

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
    clear: () => values.clear(),
    values,
  };
}

const session = memoryStorage();
const local = memoryStorage();
const hadWindow = 'window' in globalThis;
(globalThis as any).window = { sessionStorage: session, localStorage: local };

const { selectedYearLabel, useYearSelectionStore } = await import('@/features/AcademicYears/store/yearSelectionStore');
const { captureRequestHeaders } = await import('@/lib/requestHeaders');
const { selectionStorageKey } = await import('@/features/AcademicYears/utils/yearSelection');

const store = () => useYearSelectionStore.getState();
const key = selectionStorageKey('user-1');

afterAll(() => {
  // The store stays bound as the default header source for this process;
  // idle, it adds no header to other suites' requests.
  store().clear();
  if (!hadWindow) delete (globalThis as any).window;
});

beforeEach(() => {
  session.clear();
  local.clear();
  store().clear();
  store().setActiveLabel('2026-2027');
});

describe('the tab viewing-year owner', () => {
  it('holds reads until initialized, then follows the active year', () => {
    expect(selectedYearLabel(store())).toBeUndefined();
    store().initialize({ accountId: 'user-1', canChooseYear: true });
    expect(store().status).toBe('ready');
    expect(selectedYearLabel(store())).toBe('2026-2027');
    store().setActiveLabel('2027-2028');
    expect(selectedYearLabel(store())).toBe('2027-2028');
  });

  it('remembers an explicit choice for the tab and for new tabs of the same account', () => {
    store().initialize({ accountId: 'user-1', canChooseYear: true });
    store().select('2025-2026');
    expect(selectedYearLabel(store())).toBe('2025-2026');
    expect(JSON.parse(session.values.get(key)!)).toEqual({ mode: 'explicit', label: '2025-2026' });
    expect(JSON.parse(local.values.get(key)!)).toEqual({ mode: 'explicit', label: '2025-2026' });

    store().clear();
    session.clear();
    store().initialize({ accountId: 'user-1', canChooseYear: true });
    expect(selectedYearLabel(store())).toBe('2025-2026');
  });

  it('stores active mode when the active year is chosen, so a later activation is followed', () => {
    store().initialize({ accountId: 'user-1', canChooseYear: true });
    store().select('2026-2027');
    expect(store().selection).toEqual({ mode: 'active' });
    expect(JSON.parse(local.values.get(key)!)).toEqual({ mode: 'active' });
  });

  it('keeps accounts apart', () => {
    store().initialize({ accountId: 'user-1', canChooseYear: true });
    store().select('2025-2026');
    store().clear();
    store().initialize({ accountId: 'user-2', canChooseYear: true });
    expect(store().selection).toEqual({ mode: 'active' });
  });

  it('drops a remembered year visibly for a role limited to the active year', () => {
    local.values.set(key, JSON.stringify({ mode: 'explicit', label: '2025-2026' }));
    store().initialize({ accountId: 'user-1', canChooseYear: false });
    expect(store().selection).toEqual({ mode: 'active' });
    expect(store().droppedUnauthorized).toBe(true);
    store().dismissNotice();
    expect(store().droppedUnauthorized).toBe(false);
  });

  it('applies a legacy entry link to the tab without remembering it for new tabs', () => {
    store().initialize({ accountId: 'user-1', canChooseYear: true });
    store().applyEntryLink('2024-2025', true);
    expect(selectedYearLabel(store())).toBe('2024-2025');
    expect(JSON.parse(session.values.get(key)!)).toEqual({ mode: 'explicit', label: '2024-2025' });
    expect(local.values.get(key)).toBeUndefined();
  });

  it('sends the selection as the default X-Academic-Year header of requests started outside a scope', () => {
    expect(captureRequestHeaders()['X-Academic-Year']).toBeUndefined();
    store().initialize({ accountId: 'user-1', canChooseYear: true });
    expect(captureRequestHeaders()['X-Academic-Year']).toBe('2026-2027');
    store().select('2025-2026');
    expect(captureRequestHeaders()['X-Academic-Year']).toBe('2025-2026');
  });

  it('forgets the account and holds reads again after sign-out', () => {
    store().initialize({ accountId: 'user-1', canChooseYear: true });
    store().clear();
    expect(store().accountId).toBeNull();
    expect(selectedYearLabel(store())).toBeUndefined();
  });
});
