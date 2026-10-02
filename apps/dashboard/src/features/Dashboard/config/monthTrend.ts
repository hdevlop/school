// Monthly trend series cover the whole school year. A month after the business
// day's month has not happened yet: its figures are unknown, not zero, so the
// charts leave a gap there instead of drawing every line down to 0.

/** Whether `month` ('YYYY-MM', or a longer date) comes after the business day's month. */
export function isFutureMonth(month: string, businessDate: string | undefined): boolean {
  if (!businessDate || !month) return false;
  return month.slice(0, 7) > businessDate.slice(0, 7);
}

/** `value` for a month that has happened, otherwise null so the chart draws nothing. */
export function monthValue(value: number | null | undefined, month: string, businessDate: string | undefined): number | null {
  return isFutureMonth(month, businessDate) ? null : Number(value ?? 0);
}

/** True when no month that has happened carries a figure. */
export function hasNoFigures<T>(rows: readonly T[], read: (row: T) => readonly (number | null)[]): boolean {
  return rows.every((row) => read(row).every((value) => !value));
}
