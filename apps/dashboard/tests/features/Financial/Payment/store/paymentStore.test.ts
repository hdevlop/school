import { describe, expect, it } from 'bun:test';
import { isInstallmentPayable, usePaymentStore } from '@/features/Financial/Payment/store/paymentStore';

describe('cancelled installment selection', () => {
  it('refuses cancelled targets across manual and bulk selection', () => {
    const cancelled = { id: 'cancelled', feeId: 'fee', number: 2, amount: 100, paidAmount: 0, dueDate: '2026-10-01', status: 'cancelled' };
    const active = { ...cancelled, id: 'active', number: 1, status: 'pending' };
    expect(isInstallmentPayable(cancelled)).toBe(false);
    expect(isInstallmentPayable(active)).toBe(true);
    usePaymentStore.getState().reset();
    try {
      usePaymentStore.getState().toggleInstallment(cancelled);
      expect(usePaymentStore.getState().getSelectedCount()).toBe(0);
      usePaymentStore.getState().toggleAllFeeInstallments('fee', [{ id: 'fee', name: 'Tuition', installments: [active, cancelled] }]);
      expect(Object.keys(usePaymentStore.getState().selectedInstallments)).toEqual(['active']);
    } finally { usePaymentStore.getState().reset(); }
  });
});
