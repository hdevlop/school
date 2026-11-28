/**
 * The school's calendar arithmetic on `YYYY-MM-DD` dates and `HH:MM` times,
 * shared by the dashboards, chat and the fingerprint devices. Dates are
 * calendar days, not instants, so every step works in UTC to stay clear of
 * the server's own zone.
 */

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export type SchoolClock = { date: string; weekday: Weekday; minutes: number };

/**
 * Today's date, weekday and minute of the day on the school's clock. The
 * business-date override (demo and test data) wins for the date; the time of
 * day always comes from the school's time zone.
 */
export function schoolClock(timeZone: string | null | undefined, now = new Date(), dateOverride: string | null = null): SchoolClock {
  const parts = zonedParts(now, timeZone);
  const date = dateOverride ?? `${parts.year}-${parts.month}-${parts.day}`;
  return {
    date,
    weekday: weekdayOf(date),
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

function zonedParts(now: Date, timeZone: string | null | undefined) {
  const read = (zone: string | undefined) => Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: zone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(now).map((part) => [part.type, part.value]),
  ) as Record<'year' | 'month' | 'day' | 'hour' | 'minute', string>;

  try {
    return read(timeZone || undefined);
  } catch {
    // An unknown zone in settings falls back to the server's own clock.
    return read(undefined);
  }
}

export function weekdayOf(date: string): Weekday {
  return WEEKDAYS[new Date(`${date}T00:00:00Z`).getUTCDay()];
}

export function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

/** Every date from `from` to `to`, both included. */
export function datesBetween(from: string, to: string): string[] {
  const dates: string[] = [];
  for (let date = from; date <= to; date = addDays(date, 1)) dates.push(date);
  return dates;
}

/** Minutes since midnight for `HH:MM` or `HH:MM:SS`. */
export function toMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

export function toClockTime(time: string): string {
  return time.slice(0, 5);
}
