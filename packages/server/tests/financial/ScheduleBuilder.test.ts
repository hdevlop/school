import { describe, expect, it } from 'bun:test';
import {
  buildDueDate,
  buildInstallments,
  getScheduleConfig,
} from '@server/modules/financial/utils/scheduleBuilder';

describe('getScheduleConfig', () => {
  it('returns count=months for a monthly schedule', () => {
    const start = new Date(2026, 8, 1);
    const end = new Date(2027, 5, 1);
    const config = getScheduleConfig('monthly', start, end);
    expect(config).toEqual({ count: 10, interval: 1 });
  });
});

describe('buildDueDate', () => {
  it('preserves the day-of-month across consecutive months', () => {
    const start = new Date(2026, 1, 15);
    const dates = [0, 1, 2, 3, 4].map((offset) => buildDueDate(start, offset));
    expect(dates.map((d) => d.getDate())).toEqual([15, 15, 15, 15, 15]);
  });

  it('clamps Jan 31 to the last day of February in non-leap years', () => {
    const start = new Date(2026, 0, 31);
    const feb = buildDueDate(start, 1);
    expect(feb.getFullYear()).toBe(2026);
    expect(feb.getMonth()).toBe(1);
    expect(feb.getDate()).toBe(28);
  });

  it('clamps Jan 31 to Feb 29 in leap years', () => {
    const start = new Date(2024, 0, 31);
    const feb = buildDueDate(start, 1);
    expect(feb.getFullYear()).toBe(2024);
    expect(feb.getMonth()).toBe(1);
    expect(feb.getDate()).toBe(29);
  });
});

describe('buildInstallments (deterministic)', () => {
  it('produces 15th-of-month due dates for a monthly schedule starting 2026-02-15', () => {
    const start = new Date(2026, 1, 15);
    const installments = buildInstallments({
      feeId: 'fee_01',
      netAmount: 500,
      count: 5,
      interval: 1,
      start,
    });

    expect(installments.map((i) => i.dueDate)).toEqual([
      '2026-02-15',
      '2026-03-15',
      '2026-04-15',
      '2026-05-15',
      '2026-06-15',
    ]);
  });

  it('is deterministic — repeated calls with the same input return identical due dates', () => {
    const start = new Date(2026, 8, 1);
    const params = { feeId: 'fee_01', netAmount: 1200, count: 10, interval: 1, start };

    const first = buildInstallments(params);
    const second = buildInstallments(params);

    expect(first.map((i) => i.dueDate)).toEqual(second.map((i) => i.dueDate));
  });

  it('sums to the net amount when last-installment rounding is applied (evenly divisible)', () => {
    const start = new Date(2026, 0, 1);
    const installments = buildInstallments({
      feeId: 'fee_01',
      netAmount: 900,
      count: 3,
      interval: 1,
      start,
    });

    const total = installments.reduce((sum, inst) => sum + inst.amount, 0);
    expect(Number(total.toFixed(2))).toBe(900);
  });

  it('sums to the net amount for uneven centime splits such as 1000/3', () => {
    const start = new Date(2026, 0, 1);
    const installments = buildInstallments({
      feeId: 'fee_01',
      netAmount: 1000,
      count: 3,
      interval: 1,
      start,
    });

    const total = installments.reduce((sum, inst) => sum + inst.amount, 0);
    expect(installments.map((inst) => inst.amount)).toEqual([333.33, 333.33, 333.34]);
    expect(Number(total.toFixed(2))).toBe(1000);
  });
});
