import {
  getAcademicYearRange,
  getCurrentAcademicYear,
  resolveAcademicPeriodStart,
} from './academicYear';
import { fromCents, toCents } from './money';
import { getBusinessDate } from '@server/shared/businessDate';

export function roundAmount(amount: number): number {
  return Number(amount.toFixed(2));
}

export function amountToString(amount: number): string {
  return amount.toFixed(2);
}

export interface FeeCalculationContext {
  academicYear?: string | null;
  startMonth?: string | null;
  endMonth?: string | null;
  effectiveDate?: string | Date | null;
}

function normalizeDate(value: string | Date): Date {
  const normalized = value instanceof Date ? new Date(value) : new Date(value);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

export const calculateRemainingMonths = (startDateStr: string | Date, endDateStr: string | Date): number => {
  const start = normalizeDate(startDateStr);
  const end = normalizeDate(endDateStr);
  if (start > end) return 0;
  const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
  return Math.max(0, months);
};

export const calculateRemainingMonthsInYear = (
  context: FeeCalculationContext = {},
): number => {
  const effectiveDate = context.effectiveDate
    ? normalizeDate(context.effectiveDate)
    : getBusinessDate();
  const startMonth = context.startMonth || 'september';
  const endMonth = context.endMonth || 'june';
  const academicYear =
    context.academicYear || getCurrentAcademicYear(startMonth, effectiveDate);

  const { start, end } = getAcademicYearRange(
    startMonth,
    endMonth,
    academicYear,
    effectiveDate,
  );
  const chargeableStart = resolveAcademicPeriodStart(start, end, effectiveDate);

  return calculateRemainingMonths(chargeableStart, end);
};

export const calculateFeeAmounts = (
  paymentType: string,
  amount: string | number | null,
  schedule: string = 'monthly',
  discount: number | string | null = 0,
  context: FeeCalculationContext = {},
) => {
  const baseCents = toCents(amount ?? 0);
  const discountCents = toCents(discount ?? 0);

  if (schedule === 'oneTime') {
    const totalDiscountCents = Math.min(discountCents, baseCents);
    return {
      grossAmount: Number(fromCents(baseCents)),
      totalDiscount: Number(fromCents(totalDiscountCents)),
      netAmount: Number(fromCents(Math.max(0, baseCents - totalDiscountCents))),
      periods: 1,
      monthsRemaining: 1,
    };
  }

  const monthsRemaining = calculateRemainingMonthsInYear(context);

  const isRecurring = paymentType === 'recurring';

  let grossCents: number;
  let totalDiscountCents: number;
  let periods: number;

  if (!isRecurring) {
    grossCents = baseCents;
    totalDiscountCents = Math.min(discountCents, grossCents);
    periods = 1;
  } else {
    grossCents = baseCents * monthsRemaining;
    totalDiscountCents = discountCents * monthsRemaining;
    
    switch (schedule) {
      case 'monthly':
        periods = monthsRemaining;
        break;
      case 'quarterly':
        periods = Math.ceil(monthsRemaining / 3);
        break;
      case 'semester':
        periods = Math.ceil(monthsRemaining / 6);
        break;
      case 'annually':
        periods = 1;
        break;
      default:
        periods = 1;
    }
  }

  const netCents = Math.max(0, grossCents - totalDiscountCents);

  return {
    grossAmount: Number(fromCents(grossCents)),
    totalDiscount: Number(fromCents(totalDiscountCents)),
    netAmount: Number(fromCents(netCents)),
    periods,
    monthsRemaining
  };
};

export const calculateNetAmount = (paymentType, amount, schedule, discount) => {
  return calculateFeeAmounts(paymentType, amount, schedule, discount).netAmount;
};

export const extractUniqueIds = (ids: any[]) => {
  return [...new Set(ids.filter(Boolean))];
}

export const extractIds = <T extends Record<string, any>>(
  items: T[],
  field: keyof T
) => {
  return [...new Set(items.map(item => item[field]).filter(Boolean))];
}

export const installmentIds = <T extends { installmentId?: any }>(allocations: T[]) => {
  return extractUniqueIds(allocations.map(a => a.installmentId));
}

export const feeIds = <T extends { feeId?: any }>(allocations: T[]) => {
  return extractUniqueIds(allocations.map(a => a.feeId));
}
