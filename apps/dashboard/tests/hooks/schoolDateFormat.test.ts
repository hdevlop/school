import { describe, expect, test } from 'bun:test';
import { formatSchoolDate, schoolDateFormat, schoolTimeFormat, todayInTimeZone } from '@/hooks/schoolDateFormat';

const base = {
  locale: 'en-US',
  timeZone: 'America/Los_Angeles',
  dateFormat: 'MM/DD/YYYY' as const,
  timeFormat: '12' as const,
};

describe('school date formatting', () => {
  test('uses the saved numeric date pattern', () => {
    const value = '2026-06-14';
    expect(formatSchoolDate(value, { ...base, dateOnly: true })).toBe('06/14/2026');
    expect(formatSchoolDate(value, { ...base, dateOnly: true, dateFormat: 'DD/MM/YYYY' })).toBe('14/06/2026');
    expect(formatSchoolDate(value, { ...base, dateOnly: true, dateFormat: 'DD-MM-YY' })).toBe('14-06-26');
    expect(formatSchoolDate(value, { ...base, dateOnly: true, dateFormat: 'DD-MM-YYYY' })).toBe('14-06-2026');
    expect(formatSchoolDate(value, { ...base, dateOnly: true, dateFormat: 'YYYY-MM-DD' })).toBe('2026-06-14');
  });

  test('keeps a calendar date unchanged across time zones', () => {
    expect(formatSchoolDate('2026-06-14T00:00:00Z', { ...base, dateOnly: true })).toBe('06/14/2026');
  });

  test('applies the selected time zone and 12 or 24 hour clock to timestamps', () => {
    const instant = '2026-06-14T20:05:00Z';
    expect(formatSchoolDate(instant, { ...base, withTime: true })).toBe('06/14/2026, 1:05 PM');
    expect(formatSchoolDate(instant, { ...base, timeFormat: '24', withTime: true })).toBe('06/14/2026, 13:05');
    expect(formatSchoolDate(instant, { ...base, timeZone: 'UTC', withTime: true })).toBe('06/14/2026, 8:05 PM');
    expect(formatSchoolDate('2026-06-15T07:05:00Z', { ...base, timeFormat: '24', withTime: true })).toBe('06/15/2026, 00:05');
  });

  test('uses saved-setting fallbacks for missing or invalid values', () => {
    expect(schoolDateFormat(undefined)).toBe('MM/DD/YYYY');
    expect(schoolDateFormat('unexpected')).toBe('MM/DD/YYYY');
    expect(schoolTimeFormat(undefined)).toBe('12');
    expect(schoolTimeFormat('24')).toBe('24');
  });
});

describe('school today', () => {
  test('names the day in the school time zone, not the host one', () => {
    const lateEvening = new Date('2026-10-01T23:43:00Z');
    expect(todayInTimeZone('UTC', lateEvening)).toBe('2026-10-01');
    expect(todayInTimeZone('Africa/Casablanca', lateEvening)).toBe('2026-10-02');
    expect(todayInTimeZone('America/Los_Angeles', lateEvening)).toBe('2026-10-01');
  });
});
