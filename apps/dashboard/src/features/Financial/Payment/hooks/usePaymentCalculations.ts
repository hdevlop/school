import { useMemo } from 'react';

interface Installment {
  id: string;
  amount: number;
  status: string;
  dueDate: string;
  [key: string]: any;
}

interface Fee {
  id: string | number;
  icon?: string;
  color?: string;
  installments: Installment[];
}

interface UsePaymentCalculationsProps {
  fees: Fee[];
  selectedInstallments: Record<string, any>;
}

export const usePaymentCalculations = ({ fees, selectedInstallments }: UsePaymentCalculationsProps) => {
  // Get all unpaid installments across all fees
  const allUnpaidInstallments = useMemo(() => {
    return fees.flatMap(fee =>
      fee.installments
        .filter(inst => inst.status !== 'paid')
        .map(inst => ({
          ...inst,
          feeId: fee.id,
          feeIcon: fee.icon,
          feeColor: fee.color
        }))
    );
  }, [fees]);

  // Calculate total allocated amount from selected installments
  const totalAllocated = useMemo(() => {
    return Object.values(selectedInstallments).reduce(
      (sum, inst) => sum + (inst.allocatedAmount || 0),
      0
    );
  }, [selectedInstallments]);

  // Calculate total overdue amount
  const totalOverdue = useMemo(() => {
    return allUnpaidInstallments
      .filter(inst => inst.status === 'overdue')
      .reduce((sum, inst) => sum + inst.amount, 0);
  }, [allUnpaidInstallments]);

  // Calculate total pending amount
  const totalPending = useMemo(() => {
    return allUnpaidInstallments
      .filter(inst => inst.status === 'pending')
      .reduce((sum, inst) => sum + inst.amount, 0);
  }, [allUnpaidInstallments]);

  // Calculate total unpaid amount
  const totalUnpaid = useMemo(() => {
    return allUnpaidInstallments.reduce((sum, inst) => sum + inst.amount, 0);
  }, [allUnpaidInstallments]);

  // Calculate remaining amount after allocation
  const getRemainingAmount = (paymentAmount: string | number) => {
    const amount = typeof paymentAmount === 'string'
      ? parseFloat(paymentAmount) || 0
      : paymentAmount;
    return amount - totalAllocated;
  };

  return {
    allUnpaidInstallments,
    totalAllocated,
    totalOverdue,
    totalPending,
    totalUnpaid,
    getRemainingAmount
  };
};