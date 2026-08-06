import { describe, expect, it } from 'bun:test';
import { resolveAcademicPeriodStart, getAcademicYearDateRange } from '@server/modules/financial/utils/academicYear';

describe('resolveAcademicPeriodStart (preserves day-of-month)', () => {
  const academicStart = new Date(2026, 8, 1); // 2026-09-01
  const academicEnd = new Date(2027, 5, 30); // 2027-06-30

  it('preserves the 15th when reference is mid-month', () => {
    const result = resolveAcademicPeriodStart(academicStart, academicEnd, new Date(2027, 1, 15));
    expect(result.getDate()).toBe(15);
    expect(result.getMonth()).toBe(1);
  });

  it('returns academicStart when reference is before the year', () => {
    const result = resolveAcademicPeriodStart(academicStart, academicEnd, new Date(2026, 3, 1));
    expect(result.getTime()).toBe(academicStart.getTime());
  });

  it('returns academicStart when reference is after the year end', () => {
    const result = resolveAcademicPeriodStart(academicStart, academicEnd, new Date(2027, 8, 1));
    expect(result.getTime()).toBe(academicStart.getTime());
  });

  it('returns the reference date when inside the year', () => {
    const reference = new Date(2026, 10, 10);
    const result = resolveAcademicPeriodStart(academicStart, academicEnd, reference);
    expect(result.getTime()).toBe(reference.getTime());
  });
});

describe('getAcademicYearDateRange (no UTC shift)', () => {
  it('returns YYYY-MM-DD strings without timezone drift', () => {
    const range = getAcademicYearDateRange('2026-2027');
    expect(range.startDate).toBe('2026-09-01');
    expect(range.endDate).toBe('2027-06-30');
  });
});
