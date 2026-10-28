import { isDateOnly } from '@sms/contracts/academic-years';
import { createFeeSchemas } from './feeSchemas';
import { findFeeTypesByName, PAYMENT_METHOD_VALUES, type StudentFinancialImport } from '@sms/contracts';

type Student = { id: string; studentCode: string };
type FeeType = { id: string; name: string; labels?: Record<string, string> | null; paymentType: string; amount?: unknown };
type Translate = (key: string) => string;

/** Summary and detail reports lack the receipt metadata needed to import payments. */
export function isFeeReport(rows: Record<string, unknown>[]): boolean {
  return rows.some(row => !Array.isArray(row.fees) && !row.feeType && !row.feeTypeId && (
    (Object.hasOwn(row, 'Total due') && Object.hasOwn(row, 'Total paid') && Object.hasOwn(row, 'Remaining'))
    || ['item', 'service', 'due', 'paid', 'remaining'].every(field => Object.hasOwn(row, field))
  ));
}

/** Resolve file references; the server owns schedules, balances and receipt writes. */
export function buildFeeImport(
  rows: Record<string, unknown>[], students: Student[], feeTypes: FeeType[], academicYear: string, t: Translate,
) {
  const schema = createFeeSchemas(t).fee;
  const seen = new Set<string>();
  const problems: Array<{ row: number; message: string }> = [];
  const fees: Array<ReturnType<typeof schema.parse>> = [];
  const imports = new Map<string, StudentFinancialImport & { row: number }>();
  const receipts = new Map<string, { studentId: string; payment: StudentFinancialImport['payments'][number] }>();
  if (isFeeReport(rows)) {
    return { fees, students: [], problems: [{ row: 2, message: t('fees.import.reportFile') }] };
  }
  const text = (value: unknown) => typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
  const normalize = (value: unknown) => text(value).toLocaleLowerCase();

  const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
  rows.forEach((source, index) => {
    const fail = (key: string) => problems.push({ row: index + 2, message: t(`fees.import.${key}`) });
    const matches = students.filter(student => normalize(student.studentCode) === normalize(source.studentCode));
    if (!text(source.studentCode) || matches.length !== 1) { fail('unknownStudent'); return; }
    const studentId = matches[0].id;
    const enrollmentDate = text(source.enrollmentDate);
    if (enrollmentDate && !isDateOnly(enrollmentDate)) { fail('invalidDate'); return; }
    let target = imports.get(studentId);
    if (!target) { target = { studentId, fees: [], payments: [], row: index + 2 }; imports.set(studentId, target); }
    if (enrollmentDate) {
      if (target.enrollmentDate && target.enrollmentDate !== enrollmentDate) { fail('invalidDate'); return; }
      target.enrollmentDate = enrollmentDate;
    }
    const nested = source.fees !== undefined;
    if (nested && (!Array.isArray(source.fees) || !source.fees.every(record))) { fail('invalidRow'); return; }
    const entries = nested ? source.fees as Record<string, unknown>[] : [source];
    for (const entry of entries) {
      const row: Record<string, unknown> = { ...entry, studentCode: source.studentCode };
      const fields = ['studentCode', 'feeType', 'feeTypeId', 'academicYear', 'schedule', 'baseAmount', 'discountAmount', 'effectiveDate', 'discountReason', 'notes'];
      if (fields.some(field => row[field] != null && typeof row[field] !== 'string' && typeof row[field] !== 'number')) {
        fail('invalidRow'); continue;
      }
      const feeTypeName = normalize(row.feeType);
      if (!text(row.feeTypeId) && !feeTypeName) { fail('unknownFeeType'); continue; }
      const types = row.feeTypeId
        ? feeTypes.filter(type => type.id === text(row.feeTypeId))
        : findFeeTypesByName(feeTypes, text(row.feeType));
      if (types.length !== 1) { fail('unknownFeeType'); continue; }
      if (row.academicYear && text(row.academicYear) !== academicYear) { fail('wrongYear'); continue; }
      const effectiveDate = text(row.effectiveDate);
      if (effectiveDate && !isDateOnly(effectiveDate)) { fail('invalidDate'); continue; }

      const type = types[0];
      const parsed = schema.safeParse({
        studentId,
        feeTypeId: type.id,
        academicYear,
        schedule: text(row.schedule) || (type.paymentType === 'oneTime' ? 'oneTime' : 'monthly'),
        baseAmount: text(row.baseAmount) || type.amount,
        discountAmount: text(row.discountAmount) || 0,
        effectiveDate: effectiveDate || undefined,
        discountReason: text(row.discountReason) || undefined,
        notes: text(row.notes) || undefined,
      });
      if (!parsed.success) {
        problems.push({ row: index + 2, message: parsed.error.issues.map(issue => issue.message).join('; ') });
        continue;
      }
      const key = JSON.stringify([parsed.data.studentId, parsed.data.feeTypeId, ...(nested ? [parsed.data.effectiveDate ?? '', parsed.data.schedule] : [])]);
      if (seen.has(key)) { fail('duplicate'); continue; }
      seen.add(key);
      fees.push(parsed.data);
      target.fees.push({ ...parsed.data, feeTypeId: type.id });
    }
    if (source.payments !== undefined && (!Array.isArray(source.payments) || !source.payments.every(record))) { fail('invalidPayment'); return; }
    for (const line of (source.payments ?? []) as Record<string, unknown>[]) {
      const fields = ['feeType', 'feeTypeId', 'month', 'amount', 'receiptNumber', 'myskoolPlusReceipt', 'paymentDate', 'paymentMethod', 'checkNumber', 'checkDueDate', 'settledDate', 'notes'];
      if (fields.some(field => line[field] != null && typeof line[field] !== 'string' && typeof line[field] !== 'number')) {
        fail('invalidPayment'); continue;
      }
      const types = line.feeTypeId ? feeTypes.filter(type => type.id === text(line.feeTypeId))
        : findFeeTypesByName(feeTypes, text(line.feeType));
      if (types.length !== 1) { fail('unknownFeeType'); continue; }
      const amount = Number(line.amount);
      const month = text(line.month);
      const receiptNumber = text(line.receiptNumber);
      const paymentDate = text(line.paymentDate);
      const paymentMethod = PAYMENT_METHOD_VALUES.find(value => value === text(line.paymentMethod));
      if (!receiptNumber || receiptNumber.length > 50 || !isDateOnly(paymentDate) || !paymentMethod
        || !Number.isFinite(amount) || amount <= 0 || Math.abs(amount * 100 - Math.round(amount * 100)) > 1e-7
        || (month !== 'registration' && !/^\d{4}-(0[1-9]|1[0-2])$/.test(month))) { fail('invalidPayment'); continue; }
      const checkNumber = paymentMethod === 'check' ? text(line.checkNumber) || 'NON SAISI' : undefined;
      const checkDueDate = paymentMethod === 'check' ? text(line.checkDueDate) || paymentDate : undefined;
      if ((checkNumber && checkNumber.length > 50) || (checkDueDate && !isDateOnly(checkDueDate))) { fail('invalidPayment'); continue; }
      // A cheque the source already cashed; only a cheque can be, and not before it was received.
      const settledDate = text(line.settledDate);
      if (settledDate && (paymentMethod !== 'check' || !isDateOnly(settledDate) || settledDate < paymentDate)) { fail('invalidPayment'); continue; }
      const notes = [text(line.notes), paymentMethod === 'check' && !text(line.checkDueDate) ? 'Échéance non connue (reprise MyskoolPlus)' : '',
        checkNumber === 'NON SAISI' ? 'N° de chèque non saisi dans MyskoolPlus' : ''].filter(Boolean).join('\n');
      const details = { receiptNumber, myskoolPlusReceipt: text(line.myskoolPlusReceipt) || undefined,
        paymentDate, paymentMethod, checkNumber, checkDueDate, settledDate: settledDate || undefined, notes: notes || undefined };
      if (notes.length > 800 || (details.myskoolPlusReceipt?.length ?? 0) > 100) { fail('invalidPayment'); continue; }
      let existing = receipts.get(receiptNumber);
      if (existing && (existing.studentId !== studentId || JSON.stringify({ ...existing.payment, allocations: undefined }) !== JSON.stringify(details))) {
        fail('receiptConflict'); continue;
      }
      if (!existing) {
        existing = { studentId, payment: { ...details, allocations: [] } };
        receipts.set(receiptNumber, existing);
        target.payments.push(existing.payment);
      }
      existing.payment.allocations.push({ feeTypeId: types[0].id, month, amount });
    }
  });
  return { fees, students: [...imports.values()], problems };
}
