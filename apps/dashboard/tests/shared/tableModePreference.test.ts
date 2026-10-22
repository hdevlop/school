import { describe, expect, it } from 'bun:test';
import { createTableModePreferences, tableModeKey } from '../../src/shared/tableModePreference';

function browserStorage() {
  const values = new Map<string, string>();
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
}

describe('Students and Parents layout preferences', () => {
  it('restores the chosen table view after leaving and reopening the list', () => {
    const storage = browserStorage();
    const key = tableModeKey('admin', 'students');
    const firstVisit = createTableModePreferences(() => storage);
    expect(firstVisit.read(key)).toBe('cards');
    firstVisit.write(key, 'table');
    const nextVisit = createTableModePreferences(() => storage);
    expect(nextVisit.read(key)).toBe('table');
    nextVisit.write(key, 'cards');
    expect(createTableModePreferences(() => storage).read(key)).toBe('cards');
  });

  it('keeps features and accounts independent', () => {
    const storage = browserStorage();
    const preferences = createTableModePreferences(() => storage);
    preferences.write(tableModeKey('admin', 'students'), 'table');
    expect(preferences.read(tableModeKey('admin', 'parents'))).toBe('cards');
    expect(preferences.read(tableModeKey('other-account', 'students'))).toBe('cards');
    expect(tableModeKey('a:b', 'c')).not.toBe(tableModeKey('a', 'b:c'));
  });

  it('ignores an invalid saved mode and keeps navigation working without storage', () => {
    const storage = browserStorage();
    storage.setItem('key', 'invalid');
    expect(createTableModePreferences(() => storage).read('key')).toBe('cards');
    const preferences = createTableModePreferences(() => { throw new Error('Storage blocked'); });
    preferences.write('key', 'table');
    expect(preferences.read('key')).toBe('table');
  });

  it('keeps the new choice if an old saved value can be read but writes are blocked', () => {
    const preferences = createTableModePreferences(() => ({
      getItem: () => 'table',
      setItem: () => { throw new Error('Quota exceeded'); },
    }));
    expect(preferences.read('key')).toBe('table');
    preferences.write('key', 'cards');
    expect(preferences.read('key')).toBe('cards');
  });
});
