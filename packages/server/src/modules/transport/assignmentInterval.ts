import { and, gt, isNull, lte, or, type AnyColumn } from 'drizzle-orm';
import type { ReportingYear } from '../academicYears/academicRecordYear';

/** Assignment end dates are exclusive: the first day without the assignment. */
export function assignmentOverlapsYear(start: AnyColumn, end: AnyColumn, year: ReportingYear) {
  return and(
    lte(start, year.reportingEndsOn),
    or(isNull(end), gt(end, year.reportingStartsOn)),
  )!;
}
