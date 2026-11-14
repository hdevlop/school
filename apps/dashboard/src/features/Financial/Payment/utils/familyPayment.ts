import { isInstallmentDue } from '@/features/Financial/Installment/config/installmentStatus';
import { getInstallmentAvailableAmount, isInstallmentPayable } from '../store/paymentStore';

export interface FamilyChild {
  id: string;
  name: string;
  studentCode?: string | null;
  image?: string | null;
  class?: { name?: string | null } | null;
  section?: { name?: string | null } | null;
}

/**
 * Each installment names its child, so a selection in the shared payment
 * store (keyed by installment ID, unique across students) can be split back
 * into one payment per child.
 */
export function tagFeesWithChild(fees: any[], child: Pick<FamilyChild, 'id' | 'name'>) {
  return fees.map((fee) => ({
    ...fee,
    installments: (fee.installments ?? []).map((installment: any) => ({
      ...installment,
      studentId: child.id,
      studentName: child.name,
    })),
  }));
}

/** What every child owes now, ready for `selectInstallments`. */
export function dueInstallments(fees: any[], businessDate: string) {
  return fees.flatMap((fee) => (fee.installments ?? [])
    .filter((installment: any) => isInstallmentDue(installment, businessDate) && isInstallmentPayable(installment))
    .map((installment: any) => ({
      ...installment,
      feeId: fee.id,
      feeIcon: fee.icon,
      feeColor: fee.color,
      feeName: fee.name,
    })));
}

export const sumAvailable = (installments: any[]) =>
  installments.reduce((sum, installment) => sum + getInstallmentAvailableAmount(installment), 0);

const cents = (value: unknown) => Math.round((Number(value) || 0) * 100);

/**
 * The family payment's children, in the order they are shown, each with the
 * installments selected for them. A child with nothing selected is left out;
 * a zero line is not sent.
 */
export function buildFamilyChildren(selected: Record<string, any>, childOrder: string[]) {
  const byChild = new Map<string, Array<{ feeId: string; number: number; amount: number }>>();
  for (const installment of Object.values(selected)) {
    const amountCents = cents(installment.allocatedAmount);
    if (!installment.studentId || amountCents <= 0) continue;
    const lines = byChild.get(installment.studentId) ?? [];
    lines.push({ feeId: installment.feeId, number: installment.number, amount: amountCents / 100 });
    byChild.set(installment.studentId, lines);
  }
  return childOrder
    .filter((studentId) => byChild.has(studentId))
    .map((studentId) => ({ studentId, allocations: byChild.get(studentId)! }));
}

/** The amount selected for one child, in major units. */
export function childSelectedTotal(selected: Record<string, any>, studentId: string) {
  return Object.values(selected)
    .filter((installment) => installment.studentId === studentId)
    .reduce((sum, installment) => sum + cents(installment.allocatedAmount), 0) / 100;
}
