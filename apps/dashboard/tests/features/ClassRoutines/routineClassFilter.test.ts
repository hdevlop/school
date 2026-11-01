import { describe, expect, it } from 'bun:test';
import { readRoutineClassFilter, routineClassFilterKey, writeRoutineClassFilter } from '@/features/ClassRoutines/store/routineClassFilter';

const storage = () => {
  const data = new Map<string, string>();
  return { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); } };
};

describe('saved routine class filters', () => {
  it('restores a subset and keeps different accounts and years separate', () => {
    const store = storage();
    const key = routineClassFilterKey('admin', '2026-2027');
    expect(writeRoutineClassFilter(store, key, { visibleClassIds: ['cp', 'ce1'] })).toBe(true);
    expect(readRoutineClassFilter(store, key)).toEqual({ visibleClassIds: ['cp', 'ce1'] });
    expect(readRoutineClassFilter(store, routineClassFilterKey('other', '2026-2027'))).toBeUndefined();
    expect(readRoutineClassFilter(store, routineClassFilterKey('admin', '2025-2026'))).toBeUndefined();
  });

  it('distinguishes saved all, saved none, and an absent filter', () => {
    const store = storage();
    const key = 'filter';
    expect(readRoutineClassFilter(store, key)).toBeUndefined();
    writeRoutineClassFilter(store, key, { visibleClassIds: null });
    expect(readRoutineClassFilter(store, key)).toEqual({ visibleClassIds: null });
    writeRoutineClassFilter(store, key, { visibleClassIds: [] });
    expect(readRoutineClassFilter(store, key)).toEqual({ visibleClassIds: [] });
  });

  it('ignores malformed storage and removes duplicate ids', () => {
    const store = storage();
    for (const raw of ['broken', 'null', '[]', '{}', '{"visibleClassIds":"all"}', '{"visibleClassIds":[null]}', '{"visibleClassIds":[""]}']) {
      store.setItem('filter', raw);
      expect(readRoutineClassFilter(store, 'filter')).toBeUndefined();
    }
    store.setItem('filter', '{"visibleClassIds":["cp","cp","ce1"]}');
    expect(readRoutineClassFilter(store, 'filter')).toEqual({ visibleClassIds: ['cp', 'ce1'] });
  });

  it('reports blocked writes and safely handles unavailable storage', () => {
    const blocked = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
    expect(readRoutineClassFilter(blocked, 'filter')).toBeUndefined();
    expect(writeRoutineClassFilter(blocked, 'filter', { visibleClassIds: [] })).toBe(false);
    expect(writeRoutineClassFilter(undefined, 'filter', { visibleClassIds: null })).toBe(false);
  });
});
