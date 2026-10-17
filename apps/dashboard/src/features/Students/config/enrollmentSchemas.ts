import { z } from 'zod';
import { STUDENT_YEAR_ENROLLMENT_END_STATUS_VALUES } from '@sms/contracts';
import { isDateOnly } from '@sms/contracts/academic-years';

/**
 * Forms for a student's yearly enrollment: enrol in a year, move to another
 * class or section from a date, or end the enrollment. Each is bounded by the
 * dates it depends on so an impossible date is caught before submission; the
 * server re-checks every rule, including dates in the future and draft years.
 * Each takes `t` so a refused field reads in the page's language.
 */

type T = (key: string) => string;
type YearDates = { reportingStartsOn: string; reportingEndsOn: string };

const requiredId = (t: T) => z.string().min(1, t('validationMessages.required'));
const dateOnly = (t: T) => z.string().refine(isDateOnly, t('validationMessages.enterARealDate'));

export const buildEnrollSchema = (t: T, year: YearDates) => z.object({
  classId: requiredId(t),
  sectionId: requiredId(t),
  enrolledOn: dateOnly(t).refine(
    (date) => date >= year.reportingStartsOn && date <= year.reportingEndsOn,
    t('validationMessages.theDateMustFallInsideThisSchoolYear'),
  ),
});

/** A transfer starts after the current placement began and inside the year. */
export const buildTransferSchema = (t: T, year: YearDates, currentFrom: string) => z.object({
  classId: requiredId(t),
  sectionId: requiredId(t),
  validFrom: dateOnly(t).refine(
    (date) => date > currentFrom && date <= year.reportingEndsOn,
    t('validationMessages.theDateMustFollowTheCurrentPlacementAndFallInside'),
  ),
  reason: z.string().trim().min(1, t('validationMessages.required')).max(500),
});

/**
 * An enrollment ends on the first day the student is no longer enrolled, so
 * it must follow the current placement's start. The server also allows the
 * day after the year's last day.
 */
export const buildEndEnrollmentSchema = (t: T, currentFrom: string) => z.object({
  leftOn: dateOnly(t).refine((date) => date > currentFrom, t('validationMessages.theDateMustFollowTheCurrentPlacement')),
  status: z.enum(STUDENT_YEAR_ENROLLMENT_END_STATUS_VALUES),
});

export type EnrollFormValues = z.infer<ReturnType<typeof buildEnrollSchema>>;
export type TransferFormValues = z.infer<ReturnType<typeof buildTransferSchema>>;
export type EndEnrollmentFormValues = z.infer<ReturnType<typeof buildEndEnrollmentSchema>>;
