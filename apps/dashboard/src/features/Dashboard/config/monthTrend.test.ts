import { describe, expect, it } from 'bun:test';
import { hasNoFigures, isFutureMonth, monthValue } from './monthTrend';

describe('isFutureMonth', () => {
  it('treats the business month and earlier as happened', () => {
    expect(isFutureMonth('2026-09', '2026-10-01')).toBe(false);
    expect(isFutureMonth('2026-10', '2026-10-01')).toBe(false);
  });

  it('treats later months, across the new year, as not yet happened', () => {
    expect(isFutureMonth('2026-11', '2026-10-01')).toBe(true);
    expect(isFutureMonth('2027-01', '2026-10-31')).toBe(true);
  });

  it('keeps every month of a past year', () => {
    expect(isFutureMonth('2025-06', '2026-10-01')).toBe(false);
  });

  it('does not guess without a business date', () => {
    expect(isFutureMonth('2027-06', undefined)).toBe(false);
  });
});

describe('monthValue', () => {
  it('keeps a happened month, zero included, and blanks a future one', () => {
    expect(monthValue(0, '2026-10', '2026-10-01')).toBe(0);
    expect(monthValue(undefined, '2026-09', '2026-10-01')).toBe(0);
    expect(monthValue(120, '2026-12', '2026-10-01')).toBeNull();
  });
});

describe('hasNoFigures', () => {
  it('reads blanks and zeros alike', () => {
    expect(hasNoFigures([{ a: 0, b: null }, { a: null, b: null }], (row) => [row.a, row.b])).toBe(true);
    expect(hasNoFigures([{ a: 0, b: 3 }], (row) => [row.a, row.b])).toBe(false);
  });
});
