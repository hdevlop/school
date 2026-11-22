/**
 * The relative dates a question names, computed from the school date so the
 * model does not do the arithmetic: on Saturday 2026-11-21 OSS20B took "la
 * semaine dernière" as 7-13 November instead of 9-15. Weeks run Monday to
 * Sunday. Pure date arithmetic on YYYY-MM-DD, in UTC so no offset moves a day.
 */
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const day = (date: Date) => date.toISOString().slice(0, 10);
const shift = (date: Date, days: number) => new Date(date.getTime() + days * 86_400_000);

export function schoolDateRanges(schoolDate: string): string {
  const today = new Date(`${schoolDate}T00:00:00Z`);
  if (Number.isNaN(today.getTime())) return '';
  const sinceMonday = (today.getUTCDay() + 6) % 7;
  const monday = shift(today, -sinceMonday);
  const year = today.getUTCFullYear(), month = today.getUTCMonth();
  const monthStart = new Date(Date.UTC(year, month, 1));
  const monthEnd = new Date(Date.UTC(year, month + 1, 0));
  const lastMonthStart = new Date(Date.UTC(year, month - 1, 1));
  const lastMonthEnd = new Date(Date.UTC(year, month, 0));
  return `Today is ${WEEKDAYS[today.getUTCDay()]} ${schoolDate}; yesterday ${day(shift(today, -1))}; `
    + `this week ${day(monday)} to ${day(shift(monday, 6))}; last week ${day(shift(monday, -7))} to ${day(shift(monday, -1))}; `
    + `this month ${day(monthStart)} to ${day(monthEnd)}; last month ${day(lastMonthStart)} to ${day(lastMonthEnd)}. Use these dates for relative periods.`;
}
