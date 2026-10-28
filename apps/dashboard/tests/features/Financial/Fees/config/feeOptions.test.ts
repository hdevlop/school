import { describe, expect, it } from 'bun:test';
import { SCHEDULE_VALUES } from '@sms/contracts';
import { buildFeeListFrequencyOptions, buildScheduleOptions, getFeeListFrequencyFilter } from '@/features/Financial/Fees/config/feeOptions';

describe('fee roster frequencies', () => {
  it('treats Annually as full-year tuition paid, without requiring an annual billing schedule', () => {
    expect(getFeeListFrequencyFilter('annually')).toEqual({ tuitionPayment: 'paidInFull' });
    expect(buildFeeListFrequencyOptions(key => key).find(option => option.value === 'annually')?.label)
      .toBe('fees.filters.fullTuitionPaid');
  });

  it('keeps the other frequencies exact and clears the filter for All', () => {
    for (const schedule of SCHEDULE_VALUES.filter(value => value !== 'annually')) {
      expect(getFeeListFrequencyFilter(schedule)).toEqual({ schedule });
    }
    expect(getFeeListFrequencyFilter()).toEqual({});
  });

  it('preserves actual billing schedules in fee forms', () => {
    expect(buildScheduleOptions(key => key).map(option => option.value)).toEqual([...SCHEDULE_VALUES]);
  });
});
