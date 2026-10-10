import { describe, expect, it } from 'bun:test';

import { academicYearStartDate, firstYearEnrolledOn } from '@/features/Students/config/newStudentEnrollment';

describe('academicYearStartDate', () => {
  it('starts a labelled year on September 1', () => {
    expect(academicYearStartDate('2026-2027')).toBe('2026-09-01');
  });

  it('falls back to the teaching year of the reference date', () => {
    expect(academicYearStartDate(null, '2027-03-10')).toBe('2026-09-01');
    expect(academicYearStartDate(undefined, '2026-10-02')).toBe('2026-09-01');
  });
});

describe('firstYearEnrolledOn', () => {
  it('places a student admitted during the year on their admission day', () => {
    expect(firstYearEnrolledOn('2026-10-02', '2026-2027')).toBe('2026-10-02');
  });

  it('starts an earlier admission on the first day of the class year', () => {
    expect(firstYearEnrolledOn('2024-09-01', '2026-2027')).toBe('2026-09-01');
  });

  it('uses the admission day when the class has no year label', () => {
    expect(firstYearEnrolledOn('2026-11-15', null)).toBe('2026-11-15');
  });
});
