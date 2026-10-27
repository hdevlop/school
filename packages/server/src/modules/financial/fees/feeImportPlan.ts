import type { CreateFeeDto } from './FeeDto';
import type { ScheduleType } from '../utils/scheduleBuilder';
import { buildInstallments, calculateFeeAmounts, getAcademicYearRange, getScheduleConfig,
  parseDateOnly, resolveAcademicPeriodStart, resolveFeeEffectiveDate, toCents, fromCents } from '../utils';

type Assignment = Omit<CreateFeeDto, 'studentId'>;
/** Expand every source charge before grouping: variable monthly prices and gaps survive. */
export function buildImportedFeePlan(lines: Assignment[], context: {
  academicYear: string; enrollmentDate: string; startMonth: string; endMonth: string;
  paymentType: string; defaultAmount: string | number | null;
}) {
  const installments: ReturnType<typeof buildInstallments> = [];
  let grossCents = 0, discountCents = 0;
  for (const line of lines) {
    const effectiveDate = resolveFeeEffectiveDate({ ...context, requestedDate: line.effectiveDate });
    const schedule = context.paymentType === 'oneTime' ? 'oneTime' : line.schedule;
    const amounts = calculateFeeAmounts(context.paymentType, line.baseAmount ?? context.defaultAmount,
      schedule, line.discountAmount ?? 0, { ...context, effectiveDate });
    grossCents += toCents(amounts.grossAmount);
    discountCents += toCents(amounts.totalDiscount);
    const reference = parseDateOnly(effectiveDate);
    const range = getAcademicYearRange(context.startMonth, context.endMonth, context.academicYear, reference);
    const start = resolveAcademicPeriodStart(range.start, range.end, reference);
    installments.push(...buildInstallments({ feeId: '', netAmount: amounts.netAmount,
      ...getScheduleConfig(schedule as ScheduleType, start, range.end), start }));
  }
  installments.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const months = new Set<string>();
  for (const [index, installment] of installments.entries()) {
    const month = installment.dueDate.slice(0, 7);
    if (months.has(month)) throw new Error('overlappingCharges');
    months.add(month);
    installment.number = index + 1;
  }
  return { installments, grossAmount: fromCents(grossCents), discountAmount: fromCents(discountCents),
    netAmount: fromCents(grossCents - discountCents),
    schedule: context.paymentType === 'oneTime' ? 'oneTime' : lines.length > 1 ? 'monthly' : lines[0].schedule };
}

export function sameImportedSchedule(actual: Array<{ dueDate: string; amount: string | number; status?: string }>,
  expected: Array<{ dueDate: string; amount: string | number }>) {
  const ordered = [...actual].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  return ordered.length === expected.length && ordered.every((item, i) => item.status !== 'cancelled'
    && item.dueDate === expected[i].dueDate && toCents(item.amount) === toCents(expected[i].amount));
}
