import { z } from 'zod';
import { STUDENT_YEAR_ENROLLMENT_END_STATUS_VALUES } from '@sms/contracts';
import { isDateOnly } from '@sms/contracts/academic-years';

/**
 * Forms for a student's yearly enrollment: enrol in a year, move to another
 * class or section from a date, or end the enrollment. Each is bounded by the
 * dates it depends on so an impossible date is caught before submission; the
 * server re-checks every rule, including dates in the future and draft years.
 */

type YearDates = { reportingStartsOn: string; reportingEndsOn: string };

const requiredId = z.string().min(1, 'Required');
const dateOnly = z.string().refine(isDateOnly, 'Enter a real date');

export const buildEnrollSchema = (year: YearDates) => z.object({
  classId: requiredId,
  sectionId: requiredId,
  enrolledOn: dateOnly.refine(
    (date) => date >= year.reportingStartsOn && date <= year.reportingEndsOn,
    'The date must fall inside this school year',
  ),
});

/** A transfer starts after the current placement began and inside the year. */
export const buildTransferSchema = (year: YearDates, currentFrom: string) => z.object({
  classId: requiredId,
  sectionId: requiredId,
  validFrom: dateOnly.refine(
    (date) => date > currentFrom && date <= year.reportingEndsOn,
    'The date must follow the current placement and fall inside this school year',
  ),
  reason: z.string().trim().min(1, 'Required').max(500),
});

/**
 * An enrollment ends on the first day the student is no longer enrolled, so
 * it must follow the current placement's start. The server also allows the
 * day after the year's last day.
 */
export const buildEndEnrollmentSchema = (currentFrom: string) => z.object({
  leftOn: dateOnly.refine((date) => date > currentFrom, 'The date must follow the current placement'),
  status: z.enum(STUDENT_YEAR_ENROLLMENT_END_STATUS_VALUES),
});

export type EnrollFormValues = z.infer<ReturnType<typeof buildEnrollSchema>>;
export type TransferFormValues = z.infer<ReturnType<typeof buildTransferSchema>>;
export type EndEnrollmentFormValues = z.infer<ReturnType<typeof buildEndEnrollmentSchema>>;
