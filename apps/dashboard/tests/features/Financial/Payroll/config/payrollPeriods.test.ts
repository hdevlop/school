import { describe, expect, it } from 'bun:test';
import { payrollPeriods, shownPayrollPeriod } from '@/features/Financial/Payroll/config/payrollPeriods';

const year = {
  instructionStartsOn: '2024-09-09',
  instructionEndsOn: '2025-06-30',
  reportingStartsOn: '2024-09-01',
  reportingEndsOn: '2025-08-31',
};

describe('payrollPeriods', () => {
  it('lists the reporting months, newest first', () => {
    const periods = payrollPeriods(year);
    expect(periods).toHaveLength(12);
    expect(periods[0]).toBe('2025-08');
    expect(periods.at(-1)).toBe('2024-09');
  });

  it('is empty before the calendar loads', () => {
    expect(payrollPeriods(undefined)).toEqual([]);
  });
});

describe('shownPayrollPeriod', () => {
  const periods = payrollPeriods(year);

  it('opens a past year on its last teaching month, not August', () => {
    expect(shownPayrollPeriod(undefined, '2026-09-29', year, periods)).toBe('2025-06');
  });

  it('opens a future year on its first teaching month', () => {
    expect(shownPayrollPeriod(undefined, '2024-05-10', year, periods)).toBe('2024-09');
  });

  it('opens the year holding the business day on that month', () => {
    expect(shownPayrollPeriod(undefined, '2025-01-01', year, periods)).toBe('2025-01');
  });

  it('keeps a picked month the year has, and drops one it does not', () => {
    expect(shownPayrollPeriod('2024-11', '2026-09-29', year, periods)).toBe('2024-11');
    expect(shownPayrollPeriod('2026-09', '2026-09-29', year, periods)).toBe('2025-06');
  });

  it('uses the business month while the calendar loads', () => {
    expect(shownPayrollPeriod(undefined, '2026-09-29', undefined, [])).toBe('2026-09');
  });
});
