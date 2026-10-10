import { describe, expect, it } from 'bun:test';
import { activeAcademicYearState } from '@/features/Settings/utils/activeAcademicYear';

const guess = () => '2030-2031';

describe('the active year before and after the public settings load', () => {
  it('uses the server-rendered label while the settings load, without waiting', () => {
    expect(activeAcademicYearState(undefined, true, '2026-2027', guess))
      .toEqual({ academicYear: '2026-2027', isAcademicYearLoading: false });
  });

  it('lets the loaded settings win, so a later activation is followed', () => {
    expect(activeAcademicYearState('2027-2028', false, '2026-2027', guess))
      .toEqual({ academicYear: '2027-2028', isAcademicYearLoading: false });
  });

  it('keeps waiting without a rendered label, as before', () => {
    expect(activeAcademicYearState(undefined, true, null, guess))
      .toEqual({ academicYear: '2030-2031', isAcademicYearLoading: true });
  });

  it('prefers the rendered label to the calendar guess when the settings have none', () => {
    expect(activeAcademicYearState(undefined, false, '2026-2027', guess).academicYear).toBe('2026-2027');
    expect(activeAcademicYearState(undefined, false, null, guess).academicYear).toBe('2030-2031');
  });
});
