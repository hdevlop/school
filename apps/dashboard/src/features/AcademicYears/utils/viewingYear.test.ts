import { describe, expect, it } from 'bun:test';
import { dateWithinYear, datedRosterDay, readViewingYear, teachingDateWithinYear, VIEWING_YEAR_PARAM } from './viewingYear';

describe('readViewingYear', () => {
  it('reads the explicit year exactly as the URL carries it', () => {
    expect(VIEWING_YEAR_PARAM).toBe('academicYear');
    expect(readViewingYear(new URLSearchParams('academicYear=2025-2026'))).toBe('2025-2026');
    expect(readViewingYear(new URLSearchParams('academicYear=%202025-2026%20'))).toBe('2025-2026');
    // A malformed value is still passed on, so the server refuses it visibly
    // instead of the dashboard quietly showing the active year.
    expect(readViewingYear(new URLSearchParams('academicYear=all'))).toBe('all');
  });

  it('means the active year when the parameter is absent or empty', () => {
    expect(readViewingYear(new URLSearchParams(''))).toBeUndefined();
    expect(readViewingYear(new URLSearchParams('academicYear='))).toBeUndefined();
    expect(readViewingYear(null)).toBeUndefined();
  });
});

describe('dateWithinYear', () => {
  const year = {
    instructionStartsOn: '2025-09-08',
    instructionEndsOn: '2026-06-30',
    reportingStartsOn: '2025-09-01',
    reportingEndsOn: '2026-08-31',
  };

  it('keeps a date inside the reporting interval, bounds included', () => {
    expect(dateWithinYear('2025-09-01', year)).toBe('2025-09-01');
    expect(dateWithinYear('2026-07-15', year)).toBe('2026-07-15');
    expect(dateWithinYear('2026-08-31', year)).toBe('2026-08-31');
  });

  it('moves a date outside the year to its nearest teaching day', () => {
    expect(dateWithinYear('2025-08-31', year)).toBe('2025-09-08');
    expect(dateWithinYear('2026-09-26', year)).toBe('2026-06-30');
  });

  it('leaves the date alone without a calendar, and an empty date empty', () => {
    expect(dateWithinYear('2026-09-26', undefined)).toBe('2026-09-26');
    expect(dateWithinYear('', year)).toBe('');
  });
});

describe('teachingDateWithinYear', () => {
  const year = {
    instructionStartsOn: '2025-09-08',
    instructionEndsOn: '2026-06-30',
    reportingStartsOn: '2025-09-01',
    reportingEndsOn: '2026-08-31',
  };

  it('initializes an academic source inside the viewed teaching term', () => {
    expect(teachingDateWithinYear('2025-08-31', year)).toBe('2025-09-08');
    expect(teachingDateWithinYear('2026-02-11', year)).toBe('2026-02-11');
    expect(teachingDateWithinYear('2026-07-10', year)).toBe('2026-06-30');
    expect(teachingDateWithinYear('2026-09-26', undefined)).toBe('2026-09-26');
  });
});

describe('datedRosterDay', () => {
  const year = { reportingStartsOn: '2025-09-01', reportingEndsOn: '2026-08-31' };

  it('reads a day of the viewed year, bounds included', () => {
    expect(datedRosterDay('2025-09-01', '2025-2026', year)).toBe('2025-09-01');
    expect(datedRosterDay('2026-03-02', '2025-2026', year)).toBe('2026-03-02');
    expect(datedRosterDay('2026-08-31', '2025-2026', year)).toBe('2026-08-31');
  });

  it('keeps the year list without history, a day, or a day the year holds', () => {
    expect(datedRosterDay('2026-03-02', undefined, year)).toBeUndefined();
    expect(datedRosterDay(undefined, '2025-2026', year)).toBeUndefined();
    expect(datedRosterDay('', '2025-2026', year)).toBeUndefined();
    expect(datedRosterDay('2025-08-31', '2025-2026', year)).toBeUndefined();
    expect(datedRosterDay('2026-09-01', '2025-2026', year)).toBeUndefined();
  });

  it('still asks for a year with no calendar, so the server refuses it visibly', () => {
    expect(datedRosterDay('2026-03-02', '2019-2020', undefined)).toBe('2026-03-02');
  });
});
