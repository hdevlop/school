import type { ReceiptData, ReceiptItem } from './printReceipt';

export const toReceiptItems = (rows: any[]): ReceiptItem[] => rows.map((item) => ({
  feeType: item.feeType,
  feeTypeLabels: item.feeTypeLabels,
  academicYear: item.academicYear,
  schedule: item.schedule,
  dueDates: item.dueDates,
  amount: Number(item.amount),
  remainingAmount: Number(item.remainingAmount),
}));

type ReceiptBase = Omit<ReceiptData, 'receiptNumber' | 'paymentDate' | 'studentName' | 'studentCode' | 'amount' | 'paymentMethod'>;

/**
 * A family receipt's printable data. A receipt not yet completed (a cheque
 * still at the bank) or missing any child's lines is refused rather than
 * printed as a total alone.
 */
export function familyReceiptData(receipt: any, base: ReceiptBase): ReceiptData {
  const payments = Array.isArray(receipt?.payments) ? receipt.payments : [];
  if (receipt?.status !== 'completed' || payments.length === 0 || payments.some((payment: any) => !Array.isArray(payment.receiptItems))) {
    throw new Error('Receipt details unavailable');
  }
  return {
    ...base,
    receiptNumber: receipt.receiptNumber,
    paymentDate: receipt.paymentDate,
    studentName: '',
    studentCode: '',
    payerName: receipt.parent?.name ?? undefined,
    amount: Number(receipt.amount),
    paymentMethod: receipt.paymentMethod,
    transactionRef: receipt.transactionRef ?? undefined,
    checkNumber: receipt.checkNumber ?? undefined,
    notes: receipt.notes ?? undefined,
    children: payments.map((payment: any) => ({
      studentName: payment.student?.name ?? '',
      studentCode: payment.student?.studentCode ?? '',
      amount: Number(payment.amount),
      items: toReceiptItems(payment.receiptItems),
    })),
  };
}
