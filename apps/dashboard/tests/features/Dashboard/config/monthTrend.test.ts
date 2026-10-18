import { describe, expect, it } from 'bun:test';
import { cashTrendRows, hasNoFigures, isFutureMonth, monthValue } from '@/features/Dashboard/config/monthTrend';

describe('reported monthly cash', () => {
  const months = [
    { month: '2026-06', income: 100, expenses: 10 },
    { month: '2026-07', income: 20, expenses: 5 },
    { month: '2026-08', income: 30, expenses: 7 },
  ];

  it('keeps July and August cash so historical charts reconcile with the year', () => {
    const rows = cashTrendRows(months, '2026-09-01');
    expect(rows).toEqual(months);
    expect(rows.reduce((sum, row) => sum + row.income!, 0)).toBe(150);
    expect(rows.reduce((sum, row) => sum + row.expenses!, 0)).toBe(22);
  });

  it('keeps summer months present while future figures remain unknown', () => {
    expect(cashTrendRows(months, '2026-07-14')).toEqual([
      months[0], months[1], { month: '2026-08', income: null, expenses: null },
    ]);
  });
});

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
