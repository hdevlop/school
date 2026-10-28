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
  const occasional = lines.some(line => line.schedule === 'occasional');
  if (occasional && lines.some(line => line.schedule !== 'occasional')) throw new Error('overlappingCharges');
  let grossCents = 0, discountCents = 0;
  for (const line of lines) {
    const effectiveDate = resolveFeeEffectiveDate({ ...context, requestedDate: line.effectiveDate });
    if (occasional) {
      if (!line.effectiveDate || toCents(line.discountAmount ?? 0) !== 0) throw new Error('overlappingCharges');
      const amount = Number(line.baseAmount ?? context.defaultAmount);
      grossCents += toCents(amount);
      installments.push(...buildInstallments({ feeId: '', netAmount: amount, count: 1, interval: 0, start: parseDateOnly(effectiveDate) }));
      continue;
    }
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
    if (!occasional && months.has(month)) throw new Error('overlappingCharges');
    months.add(month);
    installment.number = index + 1;
  }
  return { installments, grossAmount: fromCents(grossCents), discountAmount: fromCents(discountCents),
    netAmount: fromCents(grossCents - discountCents),
    schedule: occasional ? 'occasional' : context.paymentType === 'oneTime' ? 'oneTime' : lines.length > 1 ? 'monthly' : lines[0].schedule };
}

/** Stable source identities let a re-import keep meals added later from the UI. */
export function planOccasionalImport(feeId: string,
  current: Array<{ id: string; number: number; dueDate: string; amount: string | number; status: string }>,
  expected: Array<{ dueDate: string; amount: string | number; status: string }>) {
  const counts = new Map<string, number>();
  let number = Math.max(0, ...current.map(item => item.number));
  const source = expected.map(item => {
    const ordinal = (counts.get(item.dueDate) ?? 0) + 1;
    counts.set(item.dueDate, ordinal);
    const id = `imp_occ_${feeId}_${item.dueDate}_${ordinal}`;
    const existing = current.find(row => row.id === id);
    if (existing && (existing.status === 'cancelled' || existing.dueDate !== item.dueDate || toCents(existing.amount) !== toCents(item.amount))) {
      throw new Error('existingFeeConflict');
    }
    return existing ?? { id, feeId, number: ++number, dueDate: item.dueDate, amount: String(item.amount), paidAmount: '0.00', status: item.status };
  });
  // A changed source must never quietly leave removed historical charges behind.
  const ids = new Set(source.map(item => item.id));
  if (current.some(item => item.id.startsWith(`imp_occ_${feeId}_`) && !ids.has(item.id))) throw new Error('existingFeeConflict');
  return { source, additions: source.filter(item => !current.some(row => row.id === item.id)) };
}

export function sameImportedSchedule(actual: Array<{ dueDate: string; amount: string | number; status?: string }>,
  expected: Array<{ dueDate: string; amount: string | number }>) {
  const ordered = [...actual].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  return ordered.length === expected.length && ordered.every((item, i) => item.status !== 'cancelled'
    && item.dueDate === expected[i].dueDate && toCents(item.amount) === toCents(expected[i].amount));
}
