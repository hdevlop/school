import { describe, expect, it } from 'bun:test';
import {
  getConfiguredSeedAcademicYear, getDemoReferenceDate, getHistoryAcademicYears, getSeedAcademicYear, isDemoCollectionDay,
  parseSeedAcademicYear,
} from './academic-year';

describe('seed academic year', () => {
  it('anchors historical demos inside their year and refuses future demos', () => {
    const now = new Date('2026-09-28T12:00:00.000Z');
    expect(getDemoReferenceDate('2025-2026', now).toISOString()).toBe('2026-06-15T12:00:00.000Z');
    expect(getDemoReferenceDate('2026-2027', now).toISOString()).toBe(now.toISOString());
    expect(() => getDemoReferenceDate('2027-2028', now)).toThrow('current or a past');
  });
  it('accepts a selected year in either CLI form and rejects invalid years', () => {
    expect(getConfiguredSeedAcademicYear(new Date(2027, 8, 1), ['--year=2024-2025'])).toBe('2024-2025');
    expect(getConfiguredSeedAcademicYear(new Date(2027, 8, 1), ['--year', '2025-2026'])).toBe('2025-2026');
    expect(() => parseSeedAcademicYear('2025-2027')).toThrow();
    expect(() => getConfiguredSeedAcademicYear(new Date(), ['--year'])).toThrow();
  });
  it('keeps July closeout and summer in the prior teaching year', () => {
    expect(getSeedAcademicYear(new Date(2027, 6, 14))).toBe('2026-2027');
    expect(getSeedAcademicYear(new Date(2027, 6, 15))).toBe('2026-2027');
    expect(getSeedAcademicYear(new Date(2027, 7, 31))).toBe('2026-2027');
    expect(getSeedAcademicYear(new Date(2027, 8, 1))).toBe('2027-2028');
  });

  it('limits generated collections to term and July 1-14', () => {
    expect(isDemoCollectionDay(new Date(2027, 5, 30))).toBe(true);
    expect(isDemoCollectionDay(new Date(2027, 6, 14))).toBe(true);
    expect(isDemoCollectionDay(new Date(2027, 6, 15))).toBe(false);
    expect(isDemoCollectionDay(new Date(2027, 7, 1))).toBe(false);
    expect(isDemoCollectionDay(new Date(2027, 8, 1))).toBe(true);
  });

  it('seeds history as consecutive years ending with the current teaching year', () => {
    expect(getHistoryAcademicYears(3, new Date(2026, 8, 30))).toEqual(['2024-2025', '2025-2026', '2026-2027']);
    expect(getHistoryAcademicYears(2, new Date(2027, 6, 20))).toEqual(['2025-2026', '2026-2027']);
    expect(getHistoryAcademicYears(1, new Date(2026, 8, 30))).toEqual(['2026-2027']);
    for (const count of [0, 11, 2.5, Number.NaN]) expect(() => getHistoryAcademicYears(count)).toThrow('between 1 and 10');
  });
});
