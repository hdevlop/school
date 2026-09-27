// Date helpers for the viewed year, and the legacy `academicYear` link
// parameter. The tab's selection (`store/yearSelectionStore`) owns the viewing
// year; a link carrying the parameter only initializes it, then the parameter
// is removed.

import type { AcademicYearCalendar } from '@sms/contracts/academic-years';

export const VIEWING_YEAR_PARAM = 'academicYear';

type SearchParamsLike = { get(name: string): string | null } | null | undefined;

/** The year a legacy entry link asks for, exactly as the URL carries it. */
export function readViewingYear(search: SearchParamsLike): string | undefined {
  const value = search?.get(VIEWING_YEAR_PARAM)?.trim();
  return value || undefined;
}

type SchoolYearDates = Pick<
  AcademicYearCalendar,
  'instructionStartsOn' | 'instructionEndsOn' | 'reportingStartsOn' | 'reportingEndsOn'
>;

/**
 * `date` while the year's reporting interval holds it; otherwise the year's
 * nearest teaching day, so a date-driven screen stays in the viewed year.
 * An empty date stays empty.
 */
export function dateWithinYear(date: string, year: SchoolYearDates | undefined): string {
  if (!year || !date) return date;
  if (date < year.reportingStartsOn) return year.instructionStartsOn;
  if (date > year.reportingEndsOn) return year.instructionEndsOn;
  return date;
}

/** A sensible initial date for an academic source, inside the teaching term. */
export function teachingDateWithinYear(date: string, year: SchoolYearDates | undefined): string {
  if (!year || !date) return date;
  if (date < year.instructionStartsOn) return year.instructionStartsOn;
  if (date > year.instructionEndsOn) return year.instructionEndsOn;
  return date;
}

/**
 * The day a dated roster is read for, or undefined to keep the year's list.
 * It needs a viewing year and a day; a day the loaded year does not hold (a
 * source flagged out of year) keeps the list rather than a refused request,
 * while a year with no calendar (unknown to the selector) is still asked, so
 * the server refuses it visibly.
 */
export function datedRosterDay(
  date: string | undefined,
  viewingYear: string | undefined,
  year: Pick<SchoolYearDates, 'reportingStartsOn' | 'reportingEndsOn'> | undefined,
): string | undefined {
  if (!viewingYear || !date) return undefined;
  if (year && (date < year.reportingStartsOn || date > year.reportingEndsOn)) return undefined;
  return date;
}
