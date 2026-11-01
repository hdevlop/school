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

  it.each(['paid', 'left'])('restores the %s filter from storage in a new page load', statusFilter => {
    const store = storage();
    const key = feeListFiltersKey('u1', 'year:2026-2027');
    const filters = { ...annuallyIn3ac, statusFilter };
    createFeeListFilterMemory(() => store).write(key, filters);
    expect(createFeeListFilterMemory(() => store).read(key)).toEqual(filters);
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

  it('remembers a payment range and restores all dates after clearing it', () => {
    const store = storage();
    const filters = { ...annuallyIn3ac, paymentDateRange: { from: '2026-11-01', to: '2026-11-30' } };
    const memory = createFeeListFilterMemory(() => store);
    memory.write('range', filters);
    expect(createFeeListFilterMemory(() => store).read('range')).toEqual(filters);
    memory.write('range', annuallyIn3ac);
    expect(createFeeListFilterMemory(() => store).read('range')).toEqual(annuallyIn3ac);
  });

  it.each([
    { from: '2026-02-30', to: '2026-03-02' },
    { from: '2026-11-30', to: '2026-11-01' },
    { from: '2026-11-01' },
    null,
  ])('rejects an invalid stored payment range: %j', paymentDateRange => {
    expect(parseFeeListFilters(JSON.stringify({ ...annuallyIn3ac, paymentDateRange }))).toBeUndefined();
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
