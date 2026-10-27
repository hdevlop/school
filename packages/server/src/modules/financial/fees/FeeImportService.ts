import { Service, Transaction } from '../../../najm';
import { Year } from '../../academicYears/requestYear';
import { AcademicYearValidator, type ResolvedAcademicYear } from '../../academicYears/AcademicYearValidator';
import { StudentRepository } from '../../students/StudentRepository';
import { SettingsRepository } from '../../settings/SettingsRepository';
import { FeeService } from './FeeService';
import { FeeRepository } from './FeeRepository';
import { FeeValidator } from './FeeValidator';
import { FeeImportRepository } from './FeeImportRepository';
import { FeeImportValidator } from './FeeImportValidator';
import { InstallmentRepository } from '../installments/InstallmentRepository';
import { PaymentService } from '../payments/PaymentService';
import { PaymentRepository } from '../payments/PaymentRepository';
import { AllocationRepository } from '../allocations/AllocationRepository';
import { FinancialAuditService } from '../auditLog/FinancialAuditService';
import { buildImportedFeePlan, sameImportedSchedule } from './feeImportPlan';
import { toCents, fromCents } from '../utils';
import type { ImportStudentFeesDto } from './FeeImportDto';
import type { ImportDateCorrectionDto } from '../../studentEnrollments/StudentEnrollmentDto';
import { StudentEnrollmentService } from '../../studentEnrollments/StudentEnrollmentService';

@Service()
export class FeeImportService {
  @Year() private readonly year!: ResolvedAcademicYear;
  constructor(private feeService: FeeService, private fees: FeeRepository, private feeValidator: FeeValidator,
    private repository: FeeImportRepository, private validator: FeeImportValidator,
    private students: StudentRepository, private settings: SettingsRepository, private years: AcademicYearValidator,
    private installments: InstallmentRepository, private payments: PaymentService, private paymentRepository: PaymentRepository,
    private allocations: AllocationRepository, private audit: FinancialAuditService,
    private enrollments: StudentEnrollmentService) {}

  async previewDates(sources: Array<{ studentId: string; enrollmentDate: string }>) {
    const roster = new Map((await this.students.getAll()).map(student => [student.id, student]));
    return this.enrollments.previewImportDates(sources.map(source => {
      const student = roster.get(source.studentId);
      if (!student) this.validator.refuse('unknownStudent');
      return { studentId: student.id, studentCode: student.studentCode, name: student.name,
        enrollmentDate: student.enrollmentDate, sourceDate: source.enrollmentDate };
    }));
  }

  @Transaction()
  async importStudent(data: ImportStudentFeesDto & { dateCorrection?: ImportDateCorrectionDto }, actor: { id: string; role?: string }) {
    const year = await this.years.resolve(this.year.label, actor.role ?? '');
    this.feeValidator.ensureWritableYear(year, actor.role);
    this.feeValidator.ensureSelectedFeeYears(data.fees, year.label);
    await this.repository.lock(data.studentId, year.label, data.payments.map(payment => payment.receiptNumber));
    if (data.dateCorrection) {
      if (!data.enrollmentDate) this.validator.refuse('invalidDate');
      await this.enrollments.correctDatesFromImport(data.studentId, data.enrollmentDate, data.dateCorrection,
        { id: actor.id, role: actor.role ?? '' });
    }
    // This read requires both ownership and an enrollment in the selected year.
    const student = (await this.students.getAll({ studentId: data.studentId }))[0];
    if (!student) this.validator.refuse('unknownStudent');
    const settings = await this.settings.getAdminSettings();
    const grouped = Map.groupBy(data.fees, fee => fee.feeTypeId);
    const feeMap = new Map<string, { id: string; paymentType: string; installments: Array<{ number: number; dueDate: string; amount: string | number }> }>();
    let createdFees = 0, createdPayments = 0, reusedFees = 0, reusedPayments = 0, settledPayments = 0;
    for (const [feeTypeId, lines] of grouped) {
      const type = await this.feeValidator.validateFeeTypeExists(feeTypeId, true);
      for (const line of lines) this.feeValidator.ensureDiscountWithinAmount(line.baseAmount ?? type.amount, line.discountAmount);
      let plan: ReturnType<typeof buildImportedFeePlan>;
      try {
        plan = buildImportedFeePlan(lines, { academicYear: year.label, enrollmentDate: student.enrollment.enrolledOn,
          startMonth: settings?.startMonth || 'september', endMonth: settings?.endMonth || 'june', paymentType: type.paymentType, defaultAmount: type.amount });
      } catch (error) {
        if (error instanceof Error && error.message === 'overlappingCharges') this.validator.refuse('overlappingCharges');
        this.feeValidator.mapEffectiveDateError(error);
      }
      const existingFee = await this.fees.getByStudentAndYear(data.studentId, year.label, feeTypeId);
      let fee: { id: string; netAmount: string } = existingFee;
      const before = existingFee;
      if (fee) {
        await this.installments.lockFeeSchedules([fee.id]);
        const locked = await this.fees.getByStudentAndYear(data.studentId, year.label, feeTypeId);
        if (!locked) this.validator.refuse('existingFeeConflict');
        const current = await this.installments.getByFeeId(fee.id);
        if (sameImportedSchedule(current, plan.installments) && toCents(locked.netAmount) === toCents(plan.netAmount)
          && toCents(locked.grossAmount) === toCents(plan.grossAmount) && toCents(locked.discountAmount ?? 0) === toCents(plan.discountAmount)
          && locked.schedule === plan.schedule) {
          feeMap.set(feeTypeId, { id: fee.id, paymentType: type.paymentType, installments: current });
          reusedFees++;
          continue;
        }
        if (await this.fees.hasAllocations(fee.id)) this.validator.refuse('existingFeeConflict');
      } else {
        fee = await this.feeService.create({ ...lines[0], studentId: data.studentId, academicYear: year.label }, actor.id, actor.role);
      }
      await this.installments.lockFeeSchedules([fee.id]);
      await this.installments.deleteByFeeId(fee.id);
      const saved = await this.installments.createBulk(plan.installments.map(item => ({ ...item, feeId: fee.id, amount: String(item.amount), paidAmount: '0' })));
      const updated = await this.fees.update(fee.id, { grossAmount: plan.grossAmount, netAmount: plan.netAmount,
        discountAmount: plan.discountAmount, schedule: plan.schedule, effectiveDate: plan.installments[0].dueDate,
        notes: [...new Set(lines.map(line => line.notes).filter(Boolean))].join('\n') || null,
        baseAmount: String(lines.at(-1)!.baseAmount ?? type.amount) });
      await this.feeService.recalculate(fee.id);
      await this.audit.record({ entityType: 'fee', entityId: fee.id, action: 'fee.imported', actorId: actor.id,
        before, after: updated, metadata: { source: 'MyskoolPlus', sourceCharges: lines, installments: saved } });
      feeMap.set(feeTypeId, { id: fee.id, paymentType: type.paymentType, installments: saved });
      createdFees++;
    }
    const seenReceipts = new Set<string>();
    for (const payment of data.payments) {
      if (seenReceipts.has(payment.receiptNumber)) this.validator.refuse('receiptConflict');
      seenReceipts.add(payment.receiptNumber);
      const allocations = [] as Array<{ feeId: string; number: number; amount: number }>;
      for (const line of payment.allocations) {
        let fee = feeMap.get(line.feeTypeId);
        if (!fee) {
          const existing = await this.fees.getByStudentAndYear(data.studentId, year.label, line.feeTypeId);
          if (!existing) this.validator.refuse('missingInstallment');
          const type = await this.feeValidator.validateFeeTypeExists(line.feeTypeId);
          fee = { id: existing.id, paymentType: type.paymentType, installments: await this.installments.getByFeeId(existing.id) };
          feeMap.set(line.feeTypeId, fee);
        }
        const matching = line.month === 'registration'
          ? (fee.paymentType === 'oneTime' && fee.installments.length === 1 ? fee.installments : [])
          : fee.installments.filter(item => item.dueDate.slice(0, 7) === line.month);
        if (matching.length !== 1) this.validator.refuse('missingInstallment');
        allocations.push({ feeId: fee.id, number: matching[0].number, amount: line.amount });
      }
      const isCheck = payment.paymentMethod === 'check';
      const checkNumber = isCheck ? payment.checkNumber || 'NON SAISI' : null;
      const checkDueDate = isCheck ? payment.checkDueDate || payment.paymentDate : null;
      const notes = [...new Set([payment.notes,
        isCheck && !payment.checkDueDate ? 'Échéance non connue (reprise MyskoolPlus)' : '',
        checkNumber === 'NON SAISI' ? 'N° de chèque non saisi dans MyskoolPlus' : '',
      ].filter(Boolean).flatMap(note => note!.split('\n')))].join('\n') || undefined;
      const amount = Number(fromCents(allocations.reduce((sum, item) => sum + toCents(item.amount), 0)));
      const existing = await this.paymentRepository.getByReceiptNumber(payment.receiptNumber);
      if (existing) {
        const prior = await this.allocations.getByPaymentId(existing.id);
        const canonical = (items: typeof allocations) => items.map(item => `${item.feeId}:${item.number}:${toCents(item.amount)}`).sort().join('|');
        if (existing.studentId !== data.studentId || existing.paymentDate !== payment.paymentDate || existing.paymentMethod !== payment.paymentMethod
          || toCents(existing.amount) !== toCents(amount) || (existing.checkNumber ?? null) !== checkNumber
          || (existing.checkDueDate ?? null) !== checkDueDate || (existing.transactionRef ?? '') !== (payment.myskoolPlusReceipt ?? '')
          || (existing.notes ?? '') !== (notes ?? '')
          || !['completed', 'pending', 'deposited'].includes(existing.status!)
          || canonical(prior.map(item => ({ feeId: item.feeId, number: item.installment!.number, amount: Number(item.amount) }))) !== canonical(allocations)) {
          this.validator.refuse('receiptConflict');
        }
        // A cheque imported earlier as pending that the file now says was cashed takes the usual two steps.
        if (isCheck && payment.settledDate && existing.status !== 'completed') {
          if (existing.status === 'pending') await this.payments.updateCheckStatus(existing.id, { status: 'deposited' }, actor.id);
          await this.payments.updateCheckStatus(existing.id, { status: 'completed', settledDate: payment.settledDate }, actor.id);
          settledPayments++;
        }
        reusedPayments++;
        continue;
      }
      await this.payments.recordImported({ studentId: data.studentId, receiptNumber: payment.receiptNumber,
        transactionRef: payment.myskoolPlusReceipt, paymentDate: payment.paymentDate, paymentMethod: payment.paymentMethod,
        checkNumber, checkDueDate, notes, amount, allocations, autoAllocate: false, keepRemainderAsCredit: false }, actor.id,
        isCheck ? payment.settledDate : undefined);
      createdPayments++;
    }
    return { createdFees, createdPayments, reusedFees, reusedPayments, settledPayments };
  }
}
