import { and, eq, gte, isNull, lte, or, sql, type AnyColumn, type SQL } from 'drizzle-orm';
import { settings } from '../settings/settingSchema';

// Selected-year membership for dated records, AND-ed into a read's single
// .where() next to its ownership condition. A stored year is authoritative. A
// legacy row without one is a candidate for the year whose reporting interval
// holds its date until a backfill attributes it. Candidate selection does not
// verify source/assignment/placement consistency.

export type ReportingYear = { id: string; reportingStartsOn: string; reportingEndsOn: string };

export function inReportingInterval(date: AnyColumn, year: ReportingYear) {
  return and(gte(date, year.reportingStartsOn), lte(date, year.reportingEndsOn));
}

/**
 * Whether a date-only day falls in the year's reporting interval. Today's and
 * this month's figures belong only to the year that holds today.
 */
export function holdsDay(year: Omit<ReportingYear, 'id'>, day: string) {
  return day >= year.reportingStartsOn && day <= year.reportingEndsOn;
}

/** Assessments, exams and attendance: the stored year, else the row's date. */
export function inReportingYear(yearId: AnyColumn, date: AnyColumn, year: ReportingYear): SQL {
  return or(eq(yearId, year.id), and(isNull(yearId), inReportingInterval(date, year)))!;
}

// The school's time zone decides which local day, and so which year, an
// instant falls on: 23:30 on the last day of the year is still in that year.
const schoolTimeZone = sql`coalesce((select ${settings.timeZone} from ${settings} order by ${settings.createdAt} desc limit 1), 'UTC')`;

/** The school-local day of a timestamp column or value. */
export function schoolLocalDay(at: AnyColumn | SQL): SQL {
  return sql`((${at})::timestamptz at time zone ${schoolTimeZone})::date`;
}

/**
 * Timestamped events (behavior rewards, discipline): the school-local day of
 * `at` falls in the year's reporting interval. Compared as instants, so an
 * index on `at` still applies.
 */
export function occurredInReportingInterval(at: AnyColumn | SQL, year: ReportingYear): SQL {
  return sql`(${at} >= (${year.reportingStartsOn}::date::timestamp at time zone ${schoolTimeZone})
    and ${at} < ((${year.reportingEndsOn}::date + 1)::timestamp at time zone ${schoolTimeZone}))`;
}
