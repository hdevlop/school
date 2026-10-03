import { describe, expect, it } from 'bun:test';
import { calculateFeeAmounts, getFeeDiscountPerPeriod, withFeeYear } from './feeUtils';

describe('withFeeYear', () => {
  it('charges new fees to the viewed year without changing the submitted payload', () => {
    const data = { fees: [{ studentId: 'student-1', feeTypeId: 'tuition' }, { studentId: 'student-1', feeTypeId: 'bus' }] };
    expect<unknown>(withFeeYear(data, '2025-2026')).toEqual({
      fees: [
        { studentId: 'student-1', feeTypeId: 'tuition', academicYear: '2025-2026' },
        { studentId: 'student-1', feeTypeId: 'bus', academicYear: '2025-2026' },
      ],
    });
    expect(data.fees[0]).toEqual({ studentId: 'student-1', feeTypeId: 'tuition' });
  });

  it('keeps a year the fee already names', () => {
    const data = { fees: [{ feeTypeId: 'tuition', academicYear: '2026-2027' }, { feeTypeId: 'bus', academicYear: null }] };
    expect<unknown>(withFeeYear(data, '2025-2026').fees).toEqual([
      { feeTypeId: 'tuition', academicYear: '2026-2027' },
      { feeTypeId: 'bus', academicYear: '2025-2026' },
    ]);
  });

  it('leaves the year to the server when no year is viewed', () => {
    const data = { fees: [{ feeTypeId: 'tuition' }] };
    expect(withFeeYear(data, undefined)).toBe(data);
  });
});

describe('fee edit discount units', () => {
  it('shows the monthly rate instead of the stored yearly total', () => {
    expect(getFeeDiscountPerPeriod({ schedule: 'monthly', baseAmount: 100, grossAmount: 1000, discountAmount: 100 })).toBe(10);
    expect(getFeeDiscountPerPeriod({ schedule: 'quarterly', baseAmount: 100, grossAmount: 500, discountAmount: 50 })).toBe(10);
    expect(getFeeDiscountPerPeriod({ schedule: 'oneTime', baseAmount: 100, grossAmount: 100, discountAmount: 10 })).toBe(10);
    expect(calculateFeeAmounts('recurring', 100, 'monthly', 10, { academicYear: '2026-2027', effectiveDate: '2026-09-01' }).netAmount).toBe(900);
    expect(calculateFeeAmounts('recurring', 100, 'oneTime', 10, { academicYear: '2026-2027', effectiveDate: '2026-09-01' }).netAmount).toBe(90);
  });
});
