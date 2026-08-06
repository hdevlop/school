import { describe, expect, it } from 'bun:test';
import {
  calculateFeeAmounts,
  calculateRemainingMonthsInYear,
} from '@server/modules/financial/utils';

describe('financial calculations', () => {
  it('calculates recurring fee totals from the configured academic-year period', () => {
    const result = calculateFeeAmounts(
      'recurring',
      '100',
      'monthly',
      0,
      {
        academicYear: '2026-2027',
        startMonth: 'september',
        endMonth: 'june',
        effectiveDate: new Date('2027-01-15'),
      },
    );

    expect(result.monthsRemaining).toBe(6);
    expect(result.grossAmount).toBe(600);
    expect(result.netAmount).toBe(600);
  });

  it('uses the full academic year when the reference date falls outside the targeted academic year', () => {
    const monthsRemaining = calculateRemainingMonthsInYear({
      academicYear: '2026-2027',
      startMonth: 'september',
      endMonth: 'june',
      effectiveDate: new Date('2028-01-15'),
    });

    expect(monthsRemaining).toBe(10);
  });
});
