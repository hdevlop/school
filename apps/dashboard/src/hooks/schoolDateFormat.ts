import {
  SETTINGS_DATE_FORMAT_VALUES,
  type SchoolDateFormat,
  type SchoolTimeFormat,
} from '@/features/Settings/config/dateTimeFormats';

export const schoolDateFormat = (value: unknown): SchoolDateFormat =>
  SETTINGS_DATE_FORMAT_VALUES.includes(value as SchoolDateFormat) ? value as SchoolDateFormat : 'MM/DD/YYYY';

export const schoolTimeFormat = (value: unknown): SchoolTimeFormat =>
  value === '24' ? '24' : '12';

type FormatOptions = {
  locale: string;
  timeZone: string;
  dateFormat: SchoolDateFormat;
  timeFormat: SchoolTimeFormat;
  dateOnly?: boolean;
  withTime?: boolean;
};

/** Numeric school dates follow the saved pattern; instants use the selected time zone. */
export function formatSchoolDate(
  value: Date | number | string | null | undefined,
  { locale, timeZone, dateFormat, timeFormat, dateOnly = false, withTime = false }: FormatOptions,
): string {
  if (value == null || value === '') return '—';
  const calendarValue = dateOnly && typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)
    ? `${value.slice(0, 10)}T12:00:00Z`
    : value;
  const date = calendarValue instanceof Date ? calendarValue : new Date(calendarValue);
  if (Number.isNaN(date.getTime())) return '—';
  const zone = dateOnly ? 'UTC' : timeZone;
  const parts = new Intl.DateTimeFormat(locale, {
    year: 'numeric', month: '2-digit', day: '2-digit', timeZone: zone, numberingSystem: 'latn',
  }).formatToParts(date);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? '';
  const year = part('year');
  const month = part('month');
  const day = part('day');
  const formattedDate = dateFormat === 'YYYY-MM-DD' ? `${year}-${month}-${day}`
    : dateFormat === 'DD/MM/YYYY' ? `${day}/${month}/${year}`
      : dateFormat === 'DD-MM-YY' ? `${day}-${month}-${year.slice(-2)}`
        : dateFormat === 'DD-MM-YYYY' ? `${day}-${month}-${year}`
          : `${month}/${day}/${year}`;
  if (!withTime) return formattedDate;
  const formattedTime = new Intl.DateTimeFormat(locale, {
    hour: 'numeric', minute: '2-digit', hourCycle: timeFormat === '12' ? 'h12' : 'h23', timeZone,
  }).format(date);
  return `${formattedDate}, ${formattedTime}`;
}

/**
 * Today's calendar date ("yyyy-MM-dd") in the school's time zone. The server
 * and the browser may sit in different zones, so "today" read from either
 * host's clock can name different days around midnight.
 */
export function todayInTimeZone(timeZone: string, now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric', month: '2-digit', day: '2-digit', timeZone, numberingSystem: 'latn',
  }).formatToParts(now);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}
