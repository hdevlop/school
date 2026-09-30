import type { AcademicYearCalendar } from '@sms/contracts/academic-years';
import { dateWithinYear } from '@/features/AcademicYears/utils/viewingYear';

type PayrollYear = Pick<
  AcademicYearCalendar,
  'instructionStartsOn' | 'instructionEndsOn' | 'reportingStartsOn' | 'reportingEndsOn'
>;

/** The year's payroll periods ('YYYY-MM'), newest first: each month its reporting interval starts in. */
export function payrollPeriods(year: PayrollYear | undefined): string[] {
  if (!year) return [];
  const [startYear, startMonth] = year.reportingStartsOn.slice(0, 7).split('-').map(Number);
  const [endYear, endMonth] = year.reportingEndsOn.slice(0, 7).split('-').map(Number);
  const periods: string[] = [];
  for (let index = startYear * 12 + startMonth - 1; index <= endYear * 12 + endMonth - 1; index++) {
    const value = `${Math.floor(index / 12)}-${String(index % 12 + 1).padStart(2, '0')}`;
    if (`${value}-01` >= year.reportingStartsOn && `${value}-01` <= year.reportingEndsOn) periods.push(value);
  }
  return periods.reverse();
}

/**
 * The period the payroll screen shows: the one picked, while the viewed year
 * has it; otherwise the business day's month, or, for another year, the month
 * of that year's nearest teaching day. A past year therefore opens on June,
 * its last teaching month, not on an August with no payslips.
 */
export function shownPayrollPeriod(
  picked: string | undefined,
  businessDate: string,
  year: PayrollYear | undefined,
  periods: readonly string[],
): string {
  const fallback = dateWithinYear(businessDate, year).slice(0, 7);
  if (picked && periods.includes(picked)) return picked;
  if (periods.length === 0 || periods.includes(fallback)) return fallback;
  return periods[0];
}
