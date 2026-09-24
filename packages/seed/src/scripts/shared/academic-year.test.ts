import { describe, expect, it } from 'bun:test';
import { getSeedAcademicYear, isDemoCollectionDay } from './academic-year';

describe('seed academic year', () => {
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
});
