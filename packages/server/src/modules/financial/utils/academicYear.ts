import { formatDateOnly, parseDateOnly } from './dateOnly';
import { getBusinessDate } from '@server/shared/businessDate';

const MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december'
] as const;

export type MonthName = typeof MONTHS[number];

const DEFAULT_START_MONTH: MonthName = 'september';
const DEFAULT_END_MONTH: MonthName = 'june';

function normalizeMonthIndex(monthName: string, fallback: MonthName): number {
  const index = MONTHS.indexOf(monthName.toLowerCase() as MonthName);
  return index >= 0 ? index : MONTHS.indexOf(fallback);
}

function normalizeDate(date: Date) {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

function asDateOnly(value: Date | string | null | undefined): Date {
  if (value instanceof Date) return normalizeDate(value);
  const parsed = parseDateOnly(value as string | null | undefined);
  if (!parsed) throw new RangeError('Expected YYYY-MM-DD');
  return parsed;
}

export function getMonthIndex(monthName: string): number {
  return normalizeMonthIndex(monthName, DEFAULT_START_MONTH);
}

export function getMonthNames(): readonly string[] {
  return MONTHS;
}

export function getCurrentAcademicYear(
  startMonth: string = DEFAULT_START_MONTH,
  referenceDate: Date = getBusinessDate(),
) {
  const startIdx = normalizeMonthIndex(startMonth, DEFAULT_START_MONTH);
  const normalizedReference = normalizeDate(referenceDate);
  const currentYear = normalizedReference.getFullYear();
  const startYear =
    normalizedReference.getMonth() >= startIdx
      ? currentYear
      : currentYear - 1;

  return `${startYear}-${startYear + 1}`;
}

export function parseAcademicYear(academicYear?: string | null) {
  if (!academicYear) return null;

  const match = academicYear.match(/^(\d{4})-(\d{4})$/);
  if (!match) return null;

  return {
    startYear: Number(match[1]),
    endYear: Number(match[2]),
  };
}

export function getAcademicYearRange(
  startMonth: string,
  endMonth: string,
  academicYear?: string | null,
  referenceDate: Date = getBusinessDate(),
) {
  const startIdx = normalizeMonthIndex(startMonth, DEFAULT_START_MONTH);
  const endIdx = normalizeMonthIndex(endMonth, DEFAULT_END_MONTH);
  const parsedAcademicYear =
    parseAcademicYear(academicYear) ||
    parseAcademicYear(getCurrentAcademicYear(startMonth, referenceDate));

  if (!parsedAcademicYear) {
    throw new Error('Unable to resolve academic year');
  }

  const startYear = parsedAcademicYear.startYear;
  const endYear =
    endIdx < startIdx ? parsedAcademicYear.endYear : parsedAcademicYear.startYear;

  return {
    start: new Date(startYear, startIdx, 1),
    end: new Date(endYear, endIdx + 1, 0),
    academicYear: `${startYear}-${parsedAcademicYear.endYear}`,
  };
}

export function resolveAcademicPeriodStart(
  academicStart: Date,
  academicEnd: Date,
  referenceDate: Date | string = getBusinessDate(),
) {
  const reference = referenceDate instanceof Date
    ? normalizeDate(referenceDate)
    : asDateOnly(referenceDate);
  const start = normalizeDate(academicStart);
  const end = normalizeDate(academicEnd);

  if (reference < start) return start;
  if (reference > end) return start;

  return reference;
}

export function getAcademicYearDateRange(
  academicYear?: string | null,
  startMonth: string = DEFAULT_START_MONTH,
  endMonth: string = DEFAULT_END_MONTH,
  referenceDate: Date = getBusinessDate(),
): { startDate: string; endDate: string } {
  const { start, end } = getAcademicYearRange(
    startMonth,
    endMonth,
    academicYear,
    referenceDate,
  );

  return {
    startDate: formatDateOnly(start) as string,
    endDate: formatDateOnly(end) as string,
  };
}
