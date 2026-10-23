import { describe, expect, it } from 'bun:test';
import { displayInstallmentStatus, isInstallmentDue } from '@/features/Financial/Installment/config/installmentStatus';
import { isInstallmentPayable, usePaymentStore } from '@/features/Financial/Payment/store/paymentStore';

const today = '2026-10-22';
const installment = (id: string, dueDate: string, status = 'pending') => ({
  id, feeId: 'tuition', number: 1, amount: 1000, paidAmount: 0, dueDate, status,
});

describe('installments due for payment', () => {
  it('includes pending installments dated today or earlier, keeping future ones for pay ahead', () => {
    const yesterday = installment('yesterday', '2026-10-21');
    const dueToday = installment('today', today);
    const future = installment('future', '2026-11-22');
    const due = [yesterday, dueToday, future].filter((row) => isInstallmentDue(row, today) && isInstallmentPayable(row));
    expect(due.map((row) => row.id)).toEqual(['yesterday', 'today']);
    usePaymentStore.getState().reset();
    try {
      usePaymentStore.getState().toggleAllFeeInstallments('tuition', [{ id: 'tuition', name: 'Tuition', installments: due }]);
      expect(Object.keys(usePaymentStore.getState().selectedInstallments)).toEqual(['yesterday', 'today']);
      usePaymentStore.getState().clearAllSelections();
      usePaymentStore.getState().toggleInstallment(dueToday);
      expect(Object.keys(usePaymentStore.getState().selectedInstallments)).toEqual(['today']);
      expect(isInstallmentPayable(future)).toBe(true);
    } finally {
      usePaymentStore.getState().reset();
    }
  });

  it('uses the business day, including serialized calendar dates', () => {
    expect(isInstallmentDue(installment('today', '2026-10-22T00:00:00.000Z'), today)).toBe(true);
    expect(isInstallmentDue(installment('tomorrow', '2026-10-23'), today)).toBe(false);
    expect(isInstallmentDue(installment('today', today), '2026-10-21')).toBe(false);
  });

  it('keeps paid, cancelled, and fully reserved installments out of selection', () => {
    for (const status of ['paid', 'cancelled']) {
      expect(isInstallmentDue(installment(status, today, status), today)).toBe(false);
    }
    expect(isInstallmentPayable({ ...installment('reserved', today), reservedAmount: 1000 })).toBe(false);
    expect(isInstallmentDue(installment('partial', '2026-10-01', 'partiallyPaid'), today)).toBe(true);
  });

  it('shows due dates consistently across payment and installment views', () => {
    expect(displayInstallmentStatus('pending', today, today)).toBe('due');
    expect(displayInstallmentStatus('pending', '2026-11-22', today)).toBe('upcoming');
    expect(displayInstallmentStatus('overdue', '2026-10-01', today)).toBe('overdue');
    expect(displayInstallmentStatus('paid', today, today)).toBe('paid');
    expect(displayInstallmentStatus('cancelled', today, today)).toBe('cancelled');
  });
});
