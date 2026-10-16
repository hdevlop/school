import { expect, it } from 'bun:test';
import { isPayrollPeriodAfterHire } from '../src/payroll';

it('includes mid-month hires in their hire month, excludes earlier months and unknown hire dates', () => {
  expect(isPayrollPeriodAfterHire('2026-09', '2026-10-15')).toBe(false);
  expect(isPayrollPeriodAfterHire('2026-10', '2026-10-15')).toBe(true);
  expect(isPayrollPeriodAfterHire('2027-01', '2026-10-15')).toBe(true);
  expect(isPayrollPeriodAfterHire('2025-12', '2026-01-01')).toBe(false);
  expect(isPayrollPeriodAfterHire('2026-10', undefined)).toBe(false);
});
