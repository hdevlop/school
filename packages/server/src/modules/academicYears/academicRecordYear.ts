import { and, eq, gte, isNull, lte, or, type AnyColumn, type SQL } from 'drizzle-orm';

// Selected-year membership for dated records, AND-ed into a read's single
// .where() next to its ownership condition. A stored year is authoritative. A
// legacy row without one is a candidate for the year whose reporting interval
// holds its date until a backfill attributes it. Candidate selection does not
// verify source/assignment/placement consistency.

export type ReportingYear = { id: string; reportingStartsOn: string; reportingEndsOn: string };

export function inReportingInterval(date: AnyColumn, year: ReportingYear) {
  return and(gte(date, year.reportingStartsOn), lte(date, year.reportingEndsOn));
}

/** Assessments, exams and attendance: the stored year, else the row's date. */
export function inReportingYear(yearId: AnyColumn, date: AnyColumn, year: ReportingYear): SQL {
  return or(eq(yearId, year.id), and(isNull(yearId), inReportingInterval(date, year)))!;
}
