import { afterEach, describe, expect, it } from 'bun:test';
import {
  getBusinessClockInfo,
  getBusinessDate,
  getBusinessDateOnly,
} from '@server/shared/businessDate';
import { getCurrentAcademicYear } from '@server/modules/financial/utils/academicYear';

const originalBusinessDate = process.env.APP_BUSINESS_DATE;

afterEach(() => {
  if (originalBusinessDate === undefined) {
    delete process.env.APP_BUSINESS_DATE;
  } else {
    process.env.APP_BUSINESS_DATE = originalBusinessDate;
  }
});

describe('business date', () => {
  it('uses a valid runtime override', () => {
    process.env.APP_BUSINESS_DATE = '2026-06-15';

    expect(getBusinessDateOnly()).toBe('2026-06-15');
    expect(getBusinessDate().getFullYear()).toBe(2026);
    expect(getBusinessDate().getMonth()).toBe(5);
    expect(getBusinessClockInfo()).toEqual({
      businessDate: '2026-06-15',
      businessDateOverridden: true,
      businessDateSource: 'environment',
    });
  });

  it('rejects invalid overrides with a clear error', () => {
    process.env.APP_BUSINESS_DATE = '2026-02-30';
    expect(() => getBusinessDateOnly()).toThrow('APP_BUSINESS_DATE must be a valid calendar date');
  });

  it('drives academic-year defaults from the runtime override', () => {
    process.env.APP_BUSINESS_DATE = '2026-06-15';

    expect(getCurrentAcademicYear('september')).toBe('2025-2026');
  });
});
