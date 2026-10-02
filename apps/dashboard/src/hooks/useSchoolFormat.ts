'use client';

import { useCallback, useMemo } from 'react';
import { useNajmFormat } from 'najm-kit';
import { SCHOOL_DEFAULT_CURRENCY } from '@/najm.config';
import { usePublicSettings } from '@/features/Settings/hooks/useSettings';
import { formatSchoolDate, schoolDateFormat, schoolTimeFormat, todayInTimeZone } from './schoolDateFormat';

export function toMinorUnits(amount: number | string | null | undefined, fractionDigits: number): number | null {
  if (amount == null || amount === '') return null;
  const text = String(amount).trim();
  const decimal = /^(-?)(\d+)(?:\.(\d+))?$/.exec(text);
  if (!decimal) {
    const value = Number(text);
    return Number.isFinite(value)
      ? toMinorUnits(value.toFixed(fractionDigits + 1), fractionDigits)
      : null;
  }

  const [, sign, whole, fraction = ''] = decimal;
  const scale = BigInt(10) ** BigInt(fractionDigits);
  const digits = fraction.slice(0, fractionDigits).padEnd(fractionDigits, '0');
  let minor = BigInt(whole) * scale + BigInt(digits || '0');
  if (fraction[fractionDigits] && fraction[fractionDigits] >= '5') minor += BigInt(1);
  if (sign) minor = -minor;
  return minor <= BigInt(Number.MAX_SAFE_INTEGER) && minor >= BigInt(Number.MIN_SAFE_INTEGER)
    ? Number(minor)
    : null;
}

function calendarDateValue(value: Date | number | string | null | undefined) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? `${value}T12:00:00Z`
    : value;
}

/** School financial APIs return major currency units; Najm formats minor units. */
export function useSchoolFormat() {
  const format = useNajmFormat();
  const { publicSettings } = usePublicSettings();
  const settings = Array.isArray(publicSettings) ? publicSettings[0] : publicSettings;
  const dateFormat = schoolDateFormat(settings?.dateFormat);
  const timeFormat = schoolTimeFormat(settings?.timeFormat);
  const { money, date, percent } = format;
  const currency = format.currency ?? SCHOOL_DEFAULT_CURRENCY;
  const fractionDigits = useMemo(() => new Intl.NumberFormat(format.locale, {
    style: 'currency',
    currency,
  }).resolvedOptions().maximumFractionDigits, [format.locale, currency]);
  const majorMoney = useCallback((amount: number | string | null | undefined) =>
    money(toMinorUnits(amount, fractionDigits)), [money, fractionDigits]);
  const displayDate = useCallback((
    value: Date | number | string | null | undefined,
    options?: Intl.DateTimeFormatOptions,
  ) => options
    ? date(calendarDateValue(value), options)
    : formatSchoolDate(value, {
      locale: format.locale,
      timeZone: format.timeZone,
      dateFormat,
      timeFormat,
      dateOnly: typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value),
    }), [date, dateFormat, format.locale, format.timeZone, timeFormat]);
  const displayDateOnly = useCallback((value: Date | number | string | null | undefined) =>
    formatSchoolDate(value, {
      locale: format.locale, timeZone: format.timeZone, dateFormat, timeFormat, dateOnly: true,
    }), [dateFormat, format.locale, format.timeZone, timeFormat]);
  const displayDateTime = useCallback((value: Date | number | string | null | undefined) =>
    formatSchoolDate(value, {
      locale: format.locale, timeZone: format.timeZone, dateFormat, timeFormat, withTime: true,
    }), [dateFormat, format.locale, format.timeZone, timeFormat]);
  const percentFromHundred = useCallback((value: number | null | undefined) =>
    percent(value == null ? null : value / 100, 1), [percent]);

  return {
    ...format,
    currency,
    majorMoney,
    displayDate,
    displayDateOnly,
    displayDateTime,
    percentFromHundred,
  };
}

/**
 * Today's date in the school's time zone, which the server render and the
 * browser share; each host's own clock can disagree around midnight.
 */
export function useSchoolToday(): string {
  return todayInTimeZone(useNajmFormat().timeZone);
}
