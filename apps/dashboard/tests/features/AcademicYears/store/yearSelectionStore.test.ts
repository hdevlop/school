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
const previousWindow = globalThis.window;
(globalThis as any).window = { sessionStorage: session, localStorage: local };

const { selectedYearLabel, useYearSelectionStore } = await import('@/features/AcademicYears/store/yearSelectionStore');
const { selectionStorageKey } = await import('@/features/AcademicYears/utils/yearSelection');

const store = () => useYearSelectionStore.getState();
const key = selectionStorageKey('user-1');

afterAll(() => {
  // Leave no selected year or browser storage behind for other suites.
  store().clear();
  if (hadWindow) (globalThis as any).window = previousWindow;
  else delete (globalThis as any).window;
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

  it('sends the selection as the default X-Academic-Year header of requests started outside a scope', async () => {
    // Binding happens on the first browser import. Other suites may already
    // have imported the store without a window or replaced the header source.
    const child = Bun.spawn([process.execPath, '--eval', `
      const storage = () => ({ getItem: () => null, setItem: () => {}, removeItem: () => {} });
      globalThis.window = { sessionStorage: storage(), localStorage: storage() };
      const { useYearSelectionStore } = await import(${JSON.stringify(new URL('../../../../src/features/AcademicYears/store/yearSelectionStore.ts', import.meta.url).href)});
      const { captureRequestHeaders } = await import(${JSON.stringify(new URL('../../../../src/lib/requestHeaders.ts', import.meta.url).href)});
      const store = useYearSelectionStore.getState;
      const year = () => captureRequestHeaders()['X-Academic-Year'] ?? null;
      const headers = [year()];
      store().setActiveLabel('2026-2027');
      store().initialize({ accountId: 'user-1', canChooseYear: true });
      headers.push(year());
      store().select('2025-2026');
      headers.push(year());
      store().clear();
      headers.push(year());
      process.stdout.write(JSON.stringify(headers));
    `], { stdout: 'pipe', stderr: 'pipe' });
    const [stdout, stderr, code] = await Promise.all([
      new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited,
    ]);
    expect(stderr).toBe('');
    expect(code).toBe(0);
    expect(JSON.parse(stdout)).toEqual([null, '2026-2027', '2025-2026', null]);
  });

  it('forgets the account and holds reads again after sign-out', () => {
    store().initialize({ accountId: 'user-1', canChooseYear: true });
    store().clear();
    expect(store().accountId).toBeNull();
    expect(selectedYearLabel(store())).toBeUndefined();
  });
});
