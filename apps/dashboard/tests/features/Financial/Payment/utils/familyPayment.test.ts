import { describe, expect, it } from 'bun:test';
import { buildFamilyChildren, childSelectedTotal, dueInstallments, tagFeesWithChild } from '@/features/Financial/Payment/utils/familyPayment';
import { familyReceiptData } from '@/features/Financial/Payment/components/ReceiptPrint/receiptData';
import { usePaymentStore } from '@/features/Financial/Payment/store/paymentStore';

const installment = (id: string, number: number, dueDate: string, status = 'pending', amount = 1500) =>
  ({ id, number, dueDate, status, amount, paidAmount: 0 });
const amineFees = tagFeesWithChild([{ id: 'fee-a', name: 'Tuition', installments: [
  installment('a-10', 3, '2026-11-01'), installment('a-11', 4, '2026-12-01'), installment('a-9', 2, '2026-10-01', 'paid'),
] }], { id: 'amine', name: 'Amine' });
const salmaFees = tagFeesWithChild([{ id: 'fee-s', name: 'Tuition', installments: [
  installment('s-10', 3, '2026-11-01', 'overdue', 1200), installment('s-c', 4, '2026-11-01', 'cancelled'),
] }], { id: 'salma', name: 'Salma' });

describe('family payment selection', () => {
  it('selects what every child owes now, never paid, cancelled or upcoming installments', () => {
    const due = dueInstallments([...amineFees, ...salmaFees], '2026-11-12');
    expect(due.map((row) => [row.id, row.studentId, row.feeId])).toEqual([
      ['a-10', 'amine', 'fee-a'],
      ['s-10', 'salma', 'fee-s'],
    ]);
  });

  it('splits the shared selection into one payment per child, in the order shown', () => {
    usePaymentStore.getState().reset();
    try {
      usePaymentStore.getState().selectInstallments(dueInstallments([...amineFees, ...salmaFees], '2026-11-12'));
      usePaymentStore.getState().updateAllocatedAmount('s-10', '600.255');
      const selected = usePaymentStore.getState().selectedInstallments;
      expect(buildFamilyChildren(selected, ['salma', 'amine'])).toEqual([
        { studentId: 'salma', allocations: [{ feeId: 'fee-s', number: 3, amount: 600.26 }] },
        { studentId: 'amine', allocations: [{ feeId: 'fee-a', number: 3, amount: 1500 }] },
      ]);
      expect(childSelectedTotal(selected, 'salma')).toBe(600.26);
      expect(childSelectedTotal(selected, 'adam')).toBe(0);
    } finally { usePaymentStore.getState().reset(); }
  });

  it('leaves out a child whose lines are all zero', () => {
    const selected = { x: { id: 'x', studentId: 'amine', feeId: 'fee-a', number: 3, allocatedAmount: 0 } };
    expect(buildFamilyChildren(selected, ['amine'])).toEqual([]);
  });
});

describe('family receipt data', () => {
  const base = { currency: 'MAD' };
  const receipt = { id: 'family', receiptNumber: 'RCP-F', status: 'completed', amount: '2700.00', paymentDate: '2026-11-12',
    paymentMethod: 'cash', parent: { name: 'Fatima' }, payments: [
      { amount: '1500.00', student: { name: 'Amine', studentCode: 'S1' }, receiptItems: [{ feeType: 'Tuition', amount: '1500', remainingAmount: '0' }] },
      { amount: '1200.00', student: { name: 'Salma', studentCode: 'S2' }, receiptItems: [] },
    ] };

  it('maps each child, the payer and the total', () => {
    const data = familyReceiptData(receipt, base);
    expect(data).toMatchObject({ receiptNumber: 'RCP-F', payerName: 'Fatima', amount: 2700, currency: 'MAD' });
    expect(data.children!.map((child) => [child.studentName, child.amount, child.items.length])).toEqual([
      ['Amine', 1500, 1], ['Salma', 1200, 0],
    ]);
  });

  it('refuses a cheque still at the bank and a receipt missing a child\'s lines', () => {
    expect(() => familyReceiptData({ ...receipt, status: 'pending' }, base)).toThrow();
    expect(() => familyReceiptData({ ...receipt, payments: [{ ...receipt.payments[0], receiptItems: undefined }] }, base)).toThrow();
  });
});
