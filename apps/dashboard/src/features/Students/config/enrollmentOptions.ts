import { STUDENT_YEAR_ENROLLMENT_END_STATUS_VALUES } from '@sms/contracts';
import type { StudentYearEnrollmentEndStatus } from '@sms/contracts';

type Translate = (key: string, ...args: any[]) => string;

export const ENROLLMENT_END_STATUS_TRANSLATION_PREFIX = 'students.enrollment.endStatus';

/** How an enrollment ended: every value the end command accepts. */
export const buildEnrollmentEndStatusOptions = (t: Translate) =>
  STUDENT_YEAR_ENROLLMENT_END_STATUS_VALUES.map((value) => ({
    value,
    label: t(`${ENROLLMENT_END_STATUS_TRANSLATION_PREFIX}.${value}`),
  })) as readonly { readonly value: StudentYearEnrollmentEndStatus; readonly label: string }[];
