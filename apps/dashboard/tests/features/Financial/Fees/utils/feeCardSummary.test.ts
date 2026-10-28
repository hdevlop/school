import { describe, expect, it } from 'bun:test';
import { getFeeCardSummary } from '@/features/Financial/Fees/utils/feeCardSummary';

describe('fee card amounts as of today', () => {
  const totals = { totalFees: 1, netAmount: '15400', totalPaid: '2800', collectedToDate: '2800', totalDue: '12600' };

  it('keeps overdue months separate from payments and the full billed amount', () => {
    const summary = getFeeCardSummary({ ...totals, overdueAmount: '1400' });
    expect(summary.overdueAmount).toBe(1400);
    expect(summary.netAmount).toBe(15400);
    expect(summary.hasOverdue).toBe(true);
    expect(summary.paidAmount).toBe(2800);
    expect(summary.isPaid).toBe(false);
  });

  it('highlights payments collected so far for a student who is paying', () => {
    const summary = getFeeCardSummary({ ...totals, totalPaid: '5600', collectedToDate: '5600', totalDue: '9800', overdueAmount: '0' });
    expect(summary.paidAmount).toBe(5600);
    expect(summary.overdueAmount).toBe(0);
    expect(summary.hasOverdue).toBe(false);
    expect(summary.isPaid).toBe(false);
    expect(Math.round(summary.progress)).toBe(36);
  });

  it('excludes future dated receipts from the highlighted amount and payment progress', () => {
    const summary = getFeeCardSummary({ ...totals, totalPaid: '15400', totalDue: '0', overdueAmount: '0' });
    expect(summary.paidAmount).toBe(2800);
    expect(Math.round(summary.progress)).toBe(18);
    expect(summary.isPaid).toBe(false);
    expect(getFeeCardSummary({ ...totals, collectedToDate: '0' }).paidAmount).toBe(0);
  });

  it('keeps fully paid and no-fee states accurate', () => {
    expect(getFeeCardSummary({ ...totals, totalPaid: '15400', collectedToDate: '15400', totalDue: '0', overdueAmount: '0' }))
      .toMatchObject({ paidAmount: 15400, overdueAmount: 0, isPaid: true, progress: 100 });
    expect(getFeeCardSummary()).toMatchObject({ hasFees: false, isPaid: false, paidAmount: 0, overdueAmount: 0, progress: 0 });
    expect(getFeeCardSummary({ totalFees: 1, netAmount: 0, totalDue: 0 }))
      .toMatchObject({ hasFees: true, isPaid: true, paidAmount: 0, overdueAmount: 0, progress: 100 });
  });

  it('supports older responses without a collected-to-date amount', () => {
    const { collectedToDate: _collectedToDate, ...legacy } = totals;
    expect(getFeeCardSummary(legacy).paidAmount).toBe(2800);
  });
});
