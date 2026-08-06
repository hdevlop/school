import { fromCents, toCents } from './money';
import { getBusinessDate } from '@server/shared/businessDate';

function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function buildDueDate(start: Date, monthOffset: number): Date {
  const year = start.getFullYear();
  const month = start.getMonth() + monthOffset;
  const desiredDay = start.getDate();
  const lastDay = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(desiredDay, lastDay));
}

export type ScheduleType =
  | 'monthly'
  | 'quarterly'
  | 'semester'
  | 'annually'
  | 'oneTime';

export interface ScheduleConfig {
  count: number;
  interval: number;
}

export interface InstallmentParams {
  feeId: string;
  netAmount: number;
  count: number;
  interval: number;
  start: Date;
}

export interface Installment {
  feeId: string;
  number: number;
  dueDate: string;
  amount: number;
  status: 'pending' | 'paid' | 'overdue';
}


export function getScheduleConfig(type: ScheduleType, start: Date, end: Date): ScheduleConfig {
  const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;

  switch (type) {
    case 'monthly':
      return { count: months, interval: 1 };
    case 'quarterly':
      return { count: Math.ceil(months / 3), interval: 3 };
    case 'semester':
      return { count: Math.ceil(months / 6), interval: 6 };
    case 'annually':
      return { count: 1, interval: 12 };
    default:
      return { count: 1, interval: 0 };
  }
}

export function buildInstallments(params: InstallmentParams): Installment[] {
  const { feeId, netAmount, count, interval, start } = params;
  if (count <= 0) return [];

  const totalCents = toCents(netAmount);
  const baseCents = Math.floor(totalCents / count);
  const today = getBusinessDate();

  return Array.from({ length: count }, (_, i) => {
    const dueDate = buildDueDate(start, i * interval);

    const isLast = i === count - 1;
    const amountCents = isLast ? totalCents - (baseCents * (count - 1)) : baseCents;
    const isPast = dueDate < today;

    return {
      feeId,
      number: i + 1,
      dueDate: formatLocalDate(dueDate),
      amount: Number(fromCents(amountCents)),
      status: isPast ? 'overdue' : 'pending'
    };
  });
}

export function calculatePaidTotal(installments: Installment[]): number {
  return installments
    .filter(i => i.status === 'paid')
    .reduce((sum, i) => sum + i.amount, 0);
}
