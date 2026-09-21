'use client';

import { useCallback, useMemo } from 'react';
import { useNajmFormat } from 'najm-kit';
import { SCHOOL_DEFAULT_CURRENCY } from '@/najm.config';

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
  const { money, date, percent } = format;
  const currency = format.currency ?? SCHOOL_DEFAULT_CURRENCY;
  const fractionDigits = useMemo(() => new Intl.NumberFormat(format.locale, {
    style: 'currency',
    currency,
  }).resolvedOptions().maximumFractionDigits, [format.locale, currency]);
  const majorMoney = useCallback((amount: number | string | null | undefined) =>
    money(toMinorUnits(amount, fractionDigits)), [money, fractionDigits]);
  const displayDate = useCallback((value: Date | number | string | null | undefined) =>
    date(calendarDateValue(value)), [date]);
  const percentFromHundred = useCallback((value: number | null | undefined) =>
    percent(value == null ? null : value / 100, 1), [percent]);

  return {
    ...format,
    currency,
    majorMoney,
    displayDate,
    percentFromHundred,
  };
}
