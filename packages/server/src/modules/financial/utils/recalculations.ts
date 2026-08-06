import { formatDateOnly } from './dateOnly';
import { toCents } from './money';
import { getBusinessDate } from '@server/shared/businessDate';

/**
 * Financial Recalculation Utilities
 *
 * These utilities ensure that fee and installment calculations stay in sync
 * after payments and allocations are created, updated, or deleted.
 */

export interface FeeCalculationResult {
  feeId: string;
  paidAmount: number;
  status: 'pending' | 'paid' | 'partiallyPaid' | 'overdue';
  paidInstallments: number;
  totalInstallments: number;
}

export interface InstallmentCalculationResult {
  installmentId: string;
  allocatedAmount: number;
  status: 'pending' | 'paid' | 'partiallyPaid' | 'overdue';
}

/**
 * Calculate the correct status for a fee based on its payment state
 */
export function calculateFeeStatus(
  netAmount: number,
  paidAmount: number,
  installments: Array<{ dueDate: string; status: string }>
): 'pending' | 'paid' | 'partiallyPaid' | 'overdue' {
  // Fee is fully paid
  if (toCents(paidAmount) >= toCents(netAmount)) {
    return 'paid';
  }

  // Fee has partial payment
  if (paidAmount > 0) {
    return 'partiallyPaid';
  }

  // Check for overdue installments
  const today = formatDateOnly(getBusinessDate());
  const hasOverdue = installments.some(inst => {
    return inst.dueDate < today && inst.status !== 'paid' && inst.status !== 'cancelled';
  });

  return hasOverdue ? 'overdue' : 'pending';
}

/**
 * Calculate the correct status for an installment based on allocated payments
 */
export function calculateInstallmentStatus(
  installmentAmount: number,
  allocatedAmount: number,
  dueDate: string
): 'pending' | 'paid' | 'partiallyPaid' | 'overdue' {
  // Installment is fully paid (with small tolerance for floating point)
  if (toCents(allocatedAmount) >= toCents(installmentAmount)) {
    return 'paid';
  }

  // Installment has partial payment
  if (allocatedAmount > 0) {
    return 'partiallyPaid';
  }

  // Check if overdue
  return dueDate < formatDateOnly(getBusinessDate()) ? 'overdue' : 'pending';
}

/**
 * Calculate summary statistics for a student's fees
 */
export function calculateStudentFeeSummary(fees: Array<{
  netAmount: number;
  paidAmount: number;
  discountAmount: number;
  status: string;
}>) {
  return fees.reduce(
    (summary, fee) => {
      summary.totalFees += 1;
      summary.netAmount += fee.netAmount;
      summary.totalPaid += fee.paidAmount;
      summary.totalDiscount += fee.discountAmount;
      summary.totalDue += fee.netAmount - fee.paidAmount;

      if (fee.status === 'paid') summary.paidCount += 1;
      if (fee.status === 'pending') summary.pendingCount += 1;
      if (fee.status === 'overdue') summary.overdueCount += 1;

      return summary;
    },
    {
      totalFees: 0,
      netAmount: 0,
      totalPaid: 0,
      totalDiscount: 0,
      totalDue: 0,
      paidCount: 0,
      pendingCount: 0,
      overdueCount: 0,
    }
  );
}

/**
 * Validate that allocation amounts don't exceed the installment or fee amounts
 */
export function validateAllocationAmount(
  allocationAmount: number,
  installmentAmount: number,
  alreadyAllocated: number
): { valid: boolean; error?: string } {
  if (allocationAmount <= 0) {
    return {
      valid: false,
      error: 'Allocation amount must be greater than 0',
    };
  }

  const remainingCents = toCents(installmentAmount) - toCents(alreadyAllocated);
  if (toCents(allocationAmount) > remainingCents) {
    return {
      valid: false,
      error: `Allocation amount (${allocationAmount}) exceeds remaining balance (${(remainingCents / 100).toFixed(2)})`,
    };
  }

  return { valid: true };
}
