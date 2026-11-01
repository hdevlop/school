import { describe, expect, it } from 'bun:test';
import {
  createFeeListFilterMemory,
  DEFAULT_FEE_LIST_FILTERS,
  feeListFiltersKey,
  parseFeeListFilters,
  resolveFeeListFilters,
  type FeeListFilters,
} from '@/features/Financial/Fees/config/feeListFilters';

const annuallyIn3ac: FeeListFilters = {
  selection: { classId: '3ac', sectionId: '3ac-a' },
  statusFilter: 'paid',
  scheduleFilter: 'annually',
  searchText: 'aya',
};

function storage(initial: Record<string, string> = {}) {
  const items = new Map(Object.entries(initial));
  return {
    items,
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => { items.set(key, value); },
  };
}

describe('fee list filters memory', () => {
  it('keeps each account and year apart', () => {
    expect(feeListFiltersKey('u1', 'year:2026-2027')).not.toBe(feeListFiltersKey('u1', 'year:2025-2026'));
    expect(feeListFiltersKey('u1', 'year:2026-2027')).not.toBe(feeListFiltersKey('u2', 'year:2026-2027'));
  });

  it('restores what was written, from storage in a new page load', () => {
    const store = storage();
    const key = feeListFiltersKey('u1', 'year:2026-2027');
    createFeeListFilterMemory(() => store).write(key, annuallyIn3ac);
    expect(createFeeListFilterMemory(() => store).read(key)).toEqual(annuallyIn3ac);
  });

  it('falls back to memory when storage is blocked', () => {
    const memory = createFeeListFilterMemory(() => { throw new Error('blocked'); });
    expect(memory.read('k')).toBeUndefined();
    memory.write('k', annuallyIn3ac);
    expect(memory.read('k')).toEqual(annuallyIn3ac);
  });

  it.each([
    'not json',
    'null',
    JSON.stringify({ ...annuallyIn3ac, statusFilter: 'everything' }),
    JSON.stringify({ ...annuallyIn3ac, scheduleFilter: 'weekly' }),
    JSON.stringify({ ...annuallyIn3ac, selection: { classId: 3 } }),
    JSON.stringify({ ...annuallyIn3ac, searchText: undefined }),
  ])('ignores a stored value it cannot trust: %s', value => {
    expect(parseFeeListFilters(value)).toBeUndefined();
  });

  it('accepts the default roster and no frequency', () => {
    expect(parseFeeListFilters(JSON.stringify(DEFAULT_FEE_LIST_FILTERS))).toEqual(DEFAULT_FEE_LIST_FILTERS);
  });
});

describe('fee list entry filters', () => {
  it('returns to the remembered filters when the address names no status', () => {
    expect(resolveFeeListFilters(null, annuallyIn3ac)).toEqual(annuallyIn3ac);
    expect(resolveFeeListFilters(null)).toEqual(DEFAULT_FEE_LIST_FILTERS);
  });

  it('lets the overdue link override what was remembered', () => {
    expect(resolveFeeListFilters('overdue', annuallyIn3ac)).toEqual({
      selection: { classId: 'all', sectionId: '' },
      statusFilter: 'overdue',
      searchText: '',
    });
  });
});
