import { describe, expect, it } from 'bun:test';
import { withFeeYear } from './feeUtils';

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
