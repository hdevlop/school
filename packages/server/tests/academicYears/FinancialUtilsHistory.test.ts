import { describe, expect, it } from 'bun:test';
import {
  getAcademicYearRange,
  getAcademicYearDateRange,
  parseAcademicYear,
} from '../../src/modules/financial/utils/academicYear';
import { calculateFeeAmounts } from '../../src/modules/financial/utils/calculations';
import { resolveFeeEffectiveDate } from '../../src/modules/financial/utils/effectiveDate';
import { buildInstallments } from '../../src/modules/financial/utils/scheduleBuilder';
import { toCents } from '../../src/modules/financial/utils/money';

describe('financial utility historical year calculations', () => {
  it('uses the explicit charged year for September-June billing', () => {
    expect(getAcademicYearDateRange('2025-2026')).toEqual({
      startDate: '2025-09-01',
      endDate: '2026-06-30',
    });
    expect(getAcademicYearDateRange('2026-2027')).toEqual({
      startDate: '2026-09-01',
      endDate: '2027-06-30',
    });
    const effectiveDate = resolveFeeEffectiveDate({
      enrollmentDate: '2025-01-15',
      academicYear: '2025-2026',
      startMonth: 'september',
      endMonth: 'june',
    });
    expect(effectiveDate).toBe('2025-09-01');
    expect(calculateFeeAmounts('recurring', '10.25', 'monthly', '0.10', {
      academicYear: '2025-2026',
      startMonth: 'september',
      endMonth: 'june',
      effectiveDate,
    })).toMatchObject({
      grossAmount: 102.5,
      totalDiscount: 1,
      netAmount: 101.5,
      monthsRemaining: 10,
      periods: 10,
    });
    const schedule = buildInstallments({
      feeId: 'historical-fee',
      netAmount: 101.5,
      count: 10,
      interval: 1,
      start: getAcademicYearRange('september', 'june', '2025-2026').start,
    });
    expect(schedule.map((item) => item.dueDate)).toEqual([
      '2025-09-01', '2025-10-01', '2025-11-01', '2025-12-01',
      '2026-01-01', '2026-02-01', '2026-03-01', '2026-04-01',
      '2026-05-01', '2026-06-01',
    ]);
    expect(schedule.reduce((sum, item) => sum + toCents(item.amount), 0)).toBe(10150);
  });

  it('does not interpret July payment closeout as a billing month', () => {
    expect(getAcademicYearDateRange('2025-2026').endDate).toBe('2026-06-30');
    expect(() => resolveFeeEffectiveDate({
      requestedDate: '2026-07-10',
      enrollmentDate: '2025-09-01',
      academicYear: '2025-2026',
      startMonth: 'september',
      endMonth: 'june',
    })).toThrow('Effective date is outside the billable enrollment period');
  });

  it('rejects invalid explicit years instead of using the current year', () => {
    expect(parseAcademicYear('2025-2027')).toBeNull();
    expect(() => getAcademicYearRange('september', 'june', '2025-2027'))
      .toThrow('Expected consecutive academic year');
    expect(() => getAcademicYearRange('september', 'june', 'invalid'))
      .toThrow('Expected consecutive academic year');
  });
});
