import { describe, expect, test } from 'bun:test';
import {
  ACADEMIC_YEAR_HEADER, ACADEMIC_YEAR_HISTORY_ROLES, ACADEMIC_YEAR_QUERY, canUseOtherAcademicYears,
  defaultSchoolYearCalendar, isDateOnly, isValidSchoolYearCalendar, monthsBetween, parseSchoolYearLabel,
  readAcademicYearSelection,
} from '../src/academicYears';

describe('who works in other school years', () => {
  test('pins administrators and accounting, and no one else', () => {
    // Changing this list changes who can open, and act in, a past year.
    expect([...ACADEMIC_YEAR_HISTORY_ROLES]).toEqual(['admin', 'principal', 'accounting']);
    for (const role of ACADEMIC_YEAR_HISTORY_ROLES) expect(canUseOtherAcademicYears(role)).toBe(true);
    for (const role of ['teacher', 'parent', 'student', 'counselor', 'secretary', 'driver', '', null, undefined]) {
      expect(canUseOtherAcademicYears(role)).toBe(false);
    }
  });
});

describe('school-year calendar contract', () => {
  test('requires consecutive year labels', () => {
    expect(parseSchoolYearLabel('2025-2026')).toEqual({ startYear: 2025, endYear: 2026 });
    expect(parseSchoolYearLabel('2025-2027')).toBeNull();
    expect(parseSchoolYearLabel('all')).toBeNull();
  });

  test('keeps instruction, closeout, and reporting dates distinct', () => {
    const calendar = defaultSchoolYearCalendar('2025-2026');
    expect(calendar).toEqual({
      instructionStartsOn: '2025-09-01',
      instructionEndsOn: '2026-06-30',
      reportingStartsOn: '2025-09-01',
      reportingEndsOn: '2026-08-31',
      paymentCloseoutOn: '2026-07-14',
    });
    expect(isValidSchoolYearCalendar('2025-2026', calendar)).toBe(true);
    expect(isValidSchoolYearCalendar('2025-2026', {
      ...calendar, paymentCloseoutOn: '2026-06-29',
    })).toBe(false);
  });

  test('checks only the calendar dates of a stored year or a create payload', () => {
    // Year creation and calendar verification pass the whole record, whose
    // label, status and note are not dates.
    const calendar = defaultSchoolYearCalendar('2025-2026');
    const stored = {
      id: 'year-1', label: '2025-2026', status: 'draft', provenance: 'assumed',
      provenanceNote: 'Imported from Settings', createdBy: null, ...calendar,
    };
    expect(isValidSchoolYearCalendar(stored.label, stored)).toBe(true);
    expect(isValidSchoolYearCalendar('2025-2026', { ...stored, reportingEndsOn: '2026-02-30' })).toBe(false);
    expect(isValidSchoolYearCalendar('2025-2026', { ...stored, instructionStartsOn: undefined as unknown as string })).toBe(false);
    expect(isValidSchoolYearCalendar('2026-2027', stored)).toBe(false);
  });

  test('rejects impossible dates and accepts leap days', () => {
    expect(isDateOnly('2026-02-29')).toBe(false);
    expect(isDateOnly('2028-02-29')).toBe(true);
    expect(isDateOnly('2028-02-30')).toBe(false);
  });
});

describe('monthsBetween', () => {
  test('lists every month a reporting interval touches, across the new year', () => {
    expect(monthsBetween('2025-09-01', '2026-08-31')).toEqual([
      '2025-09', '2025-10', '2025-11', '2025-12', '2026-01', '2026-02',
      '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08',
    ]);
  });

  test('includes partial months at both ends of a custom calendar', () => {
    expect(monthsBetween('2025-08-25', '2025-10-03')).toEqual(['2025-08', '2025-09', '2025-10']);
    expect(monthsBetween('2025-09-15', '2025-09-20')).toEqual(['2025-09']);
  });

  test('is empty for a reversed interval', () => {
    expect(monthsBetween('2026-09-01', '2025-09-01')).toEqual([]);
  });
});

describe('the selected school year of a request', () => {
  test('names one header and one query value', () => {
    expect(ACADEMIC_YEAR_HEADER).toBe('X-Academic-Year');
    expect(ACADEMIC_YEAR_QUERY).toBe('academicYear');
  });

  test('means the active year when nothing is selected', () => {
    for (const [header, query] of [[undefined, undefined], [null, undefined], ['', '  '], [undefined, '']]) {
      expect(readAcademicYearSelection(header, query)).toEqual({ ok: true, label: undefined });
    }
  });

  test('takes a label from either source, trimmed', () => {
    expect(readAcademicYearSelection(' 2025-2026 ', undefined)).toEqual({ ok: true, label: '2025-2026' });
    expect(readAcademicYearSelection(undefined, '2025-2026')).toEqual({ ok: true, label: '2025-2026' });
    expect(readAcademicYearSelection('2025-2026', '2025-2026')).toEqual({ ok: true, label: '2025-2026' });
  });

  test('refuses "all" and every other malformed value instead of reading all years', () => {
    for (const bad of ['all', 'ALL', '*', '2025', '2025-2027', '2025/2026', 42, ['2025-2026'], {}]) {
      expect(readAcademicYearSelection(bad, undefined)).toEqual({ ok: false, reason: 'malformed' });
      expect(readAcademicYearSelection(undefined, bad)).toEqual({ ok: false, reason: 'malformed' });
    }
  });

  test('refuses a header and query that disagree; neither wins', () => {
    expect(readAcademicYearSelection('2025-2026', '2026-2027')).toEqual({ ok: false, reason: 'conflict' });
  });
});
