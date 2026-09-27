/** A school year is identified by its starting and following calendar years. */
export type AcademicYearStatus = 'draft' | 'open' | 'closed';
export type AcademicYearProvenance = 'verified' | 'assumed';

/**
 * The roles that view and work in school years other than the active one,
 * with the same actions as in the active year. Every other role works in the
 * active year only: the server refuses it another year and the dashboard
 * shows it no year selector. Draft years stay with administrators.
 */
export const ACADEMIC_YEAR_HISTORY_ROLES = ['admin', 'principal', 'accounting'] as const;
export type AcademicYearHistoryRole = (typeof ACADEMIC_YEAR_HISTORY_ROLES)[number];

export function canUseOtherAcademicYears(role: string | null | undefined): boolean {
  return (ACADEMIC_YEAR_HISTORY_ROLES as readonly string[]).includes(role ?? '');
}

export interface AcademicYearCalendar {
  instructionStartsOn: string;
  instructionEndsOn: string;
  reportingStartsOn: string;
  reportingEndsOn: string;
  paymentCloseoutOn: string;
}

export interface AcademicYearOption extends AcademicYearCalendar {
  id: string;
  label: string;
  status: AcademicYearStatus;
  provenance: AcademicYearProvenance;
}

export interface AcademicYearContext {
  activeYear: AcademicYearOption;
  viewingYear: AcademicYearOption;
}

/** `GET /academic-years`: the years the signed-in role may view, and the active pointer. */
export interface AcademicYearList {
  activeAcademicYearId: string | null;
  years: AcademicYearOption[];
}

export function parseSchoolYearLabel(value: string): { startYear: number; endYear: number } | null {
  const match = /^(\d{4})-(\d{4})$/.exec(value);
  if (!match) return null;
  const startYear = Number(match[1]);
  const endYear = Number(match[2]);
  return startYear >= 1000 && startYear < 9999 && endYear === startYear + 1
    ? { startYear, endYear } : null;
}

/**
 * The request header naming the school year a request works in, as a
 * `YYYY-YYYY` label. The dashboard's shared HTTP layer sends it; feature code
 * never does. Without it the server works in the active year, for every role.
 */
export const ACADEMIC_YEAR_HEADER = 'X-Academic-Year';

/**
 * The query value (and MCP tool argument) carrying the same label, for clients
 * that cannot send the header.
 */
export const ACADEMIC_YEAR_QUERY = 'academicYear';

export type AcademicYearSelection =
  /** `label` undefined: nothing was selected, so the active year. */
  | { ok: true; label: string | undefined }
  | { ok: false; reason: 'malformed' | 'conflict' };

function selectedLabel(value: unknown): string | undefined | null {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') return null;
  const label = value.trim();
  if (!label) return undefined;
  return parseSchoolYearLabel(label) ? label : null;
}

/**
 * One selection from the header and the query value. Absent or blank means
 * the active year. A present value must be a `YYYY-YYYY` label: `all` and
 * anything else are malformed, never a read across every year. When both are
 * present they must agree; neither silently wins.
 */
export function readAcademicYearSelection(header: unknown, query: unknown): AcademicYearSelection {
  const fromHeader = selectedLabel(header);
  const fromQuery = selectedLabel(query);
  if (fromHeader === null || fromQuery === null) return { ok: false, reason: 'malformed' };
  if (fromHeader && fromQuery && fromHeader !== fromQuery) return { ok: false, reason: 'conflict' };
  return { ok: true, label: fromHeader ?? fromQuery };
}

export function isDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function defaultSchoolYearCalendar(label: string): AcademicYearCalendar {
  const years = parseSchoolYearLabel(label);
  if (!years) throw new RangeError('Academic year must contain consecutive years');
  return {
    instructionStartsOn: `${years.startYear}-09-01`,
    instructionEndsOn: `${years.endYear}-06-30`,
    reportingStartsOn: `${years.startYear}-09-01`,
    reportingEndsOn: `${years.endYear}-08-31`,
    paymentCloseoutOn: `${years.endYear}-07-14`,
  };
}

/**
 * Checks the five calendar dates only, so a stored year or a create payload,
 * which also carry a label, status or note, can be passed as they are.
 */
export function isValidSchoolYearCalendar(label: string, calendar: AcademicYearCalendar): boolean {
  const years = parseSchoolYearLabel(label);
  const { instructionStartsOn, instructionEndsOn, reportingStartsOn, reportingEndsOn, paymentCloseoutOn } = calendar;
  const dates = [instructionStartsOn, instructionEndsOn, reportingStartsOn, reportingEndsOn, paymentCloseoutOn];
  if (!years || !dates.every((value) => typeof value === 'string' && isDateOnly(value))) return false;
  return reportingStartsOn.startsWith(`${years.startYear}-`)
    && reportingEndsOn.startsWith(`${years.endYear}-`)
    && reportingStartsOn < reportingEndsOn
    && reportingStartsOn <= instructionStartsOn
    && instructionStartsOn <= instructionEndsOn
    && instructionEndsOn <= reportingEndsOn
    && instructionEndsOn <= paymentCloseoutOn
    && paymentCloseoutOn <= reportingEndsOn;
}

/** The `YYYY-MM` months an inclusive date-only interval touches, in order. */
export function monthsBetween(startsOn: string, endsOn: string): string[] {
  let year = Number(startsOn.slice(0, 4));
  let month = Number(startsOn.slice(5, 7));
  const endYear = Number(endsOn.slice(0, 4));
  const endMonth = Number(endsOn.slice(5, 7));
  const months: string[] = [];
  while (year < endYear || (year === endYear && month <= endMonth)) {
    months.push(`${year}-${String(month).padStart(2, '0')}`);
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return months;
}
