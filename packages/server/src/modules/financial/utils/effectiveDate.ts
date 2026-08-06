import { compareDateOnly, formatDateOnly, isValidDateOnly } from './dateOnly';
import { getAcademicYearRange } from './academicYear';

export type ResolveFeeEffectiveDateInput = {
  requestedDate?: string | null;
  enrollmentDate: string;
  startMonth: string;
  endMonth: string;
  academicYear: string;
};

export type ResolveFeeEffectiveDateError =
  | 'studentNotEnrolledInAcademicYear'
  | 'effectiveDateOutsideEnrollmentPeriod'
  | 'invalidRequestedDate'
  | 'invalidEnrollmentDate';

export class FeeEffectiveDateError extends Error {
  readonly code: ResolveFeeEffectiveDateError;

  constructor(code: ResolveFeeEffectiveDateError, message: string) {
    super(message);
    this.code = code;
    this.name = 'FeeEffectiveDateError';
  }
}

export function resolveFeeEffectiveDate(input: ResolveFeeEffectiveDateInput): string {
  const { requestedDate, enrollmentDate, startMonth, endMonth, academicYear } = input;

  if (!isValidDateOnly(enrollmentDate)) {
    throw new FeeEffectiveDateError('invalidEnrollmentDate', 'Invalid enrollment date');
  }

  if (requestedDate !== undefined && requestedDate !== null && requestedDate !== '') {
    if (!isValidDateOnly(requestedDate)) {
      throw new FeeEffectiveDateError('invalidRequestedDate', 'Invalid effective date');
    }
  }

  const { start, end } = getAcademicYearRange(startMonth, endMonth, academicYear);
  const rangeStart = formatDateOnly(start) as string;
  const rangeEnd = formatDateOnly(end) as string;

  if (compareDateOnly(enrollmentDate, rangeEnd) > 0) {
    throw new FeeEffectiveDateError(
      'studentNotEnrolledInAcademicYear',
      'Student was not enrolled in the target academic year',
    );
  }

  const minimumDate = compareDateOnly(enrollmentDate, rangeStart) < 0
    ? rangeStart
    : enrollmentDate;

  const resolved = (requestedDate && requestedDate.length > 0) ? requestedDate : minimumDate;

  if (
    compareDateOnly(resolved, minimumDate) < 0 ||
    compareDateOnly(resolved, rangeEnd) > 0
  ) {
    throw new FeeEffectiveDateError(
      'effectiveDateOutsideEnrollmentPeriod',
      'Effective date is outside the billable enrollment period',
    );
  }

  return resolved;
}
