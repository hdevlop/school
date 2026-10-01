import { Service, Transaction, Events, EventService } from '../../../najm';
import { PaymentRepository } from './PaymentRepository';
import { PaymentValidator, computeIdempotencyHash } from './PaymentValidator';
import { pickProps } from '../../../shared';
import { generateReceiptNumber } from '../utils';
import { AllocationService } from '../allocations/AllocationService';
import { AllocationRepository } from '../allocations/AllocationRepository';
import { FeeService } from '../fees/FeeService';
import { InstallmentRepository } from '../installments/InstallmentRepository';
import { FinancialAuditService } from '../auditLog/FinancialAuditService';
import { CreditService } from '../credits/CreditService';
import { formatDateOnly } from '../utils/dateOnly';
import { fromCents, toCents } from '../utils/money';
import { getBusinessDate } from '../../../shared/businessDate';
import type {
  CreatePaymentDto,
  UpdatePaymentDto,
  CheckStatusDto,
  VoidPaymentDto,
} from './PaymentDto';

const UPDATE_KEYS = [
  'paymentMethod', 'paymentDate', 'checkNumber', 'checkDueDate', 'checkBank',
  'transactionRef', 'receiptNumber', 'notes'
];

function isUniqueViolation(error: any): boolean {
  return error?.code === '23505' || /unique|duplicate key/i.test(String(error?.message ?? ''));
}

@Service()
export class PaymentService {
  @Events() private events!: EventService;

  constructor(
    private paymentRepository: PaymentRepository,
    private paymentValidator: PaymentValidator,
    private allocationService: AllocationService,
    private allocationRepository: AllocationRepository,
    private feeService: FeeService,
    private installmentRepository: InstallmentRepository,
    private auditService: FinancialAuditService,
    private creditService: CreditService
  ) { }

  // The receipts allocated to fees charged to the year, each once with its
  // allocated portion beside the full amount.
  async getAll() {
    return await this.paymentRepository.getAll();
  }

  async getToday() {
    const [payments, summary] = await Promise.all([
      this.paymentRepository.getTodayPayments(),
      this.paymentRepository.getTodayPaymentsTotal(),
    ]);
    return { payments, summary };
  }

  async getThisMonth() {
    const [payments, summary] = await Promise.all([
      this.paymentRepository.getThisMonthPayments(),
      this.paymentRepository.getThisMonthPaymentsTotal(),
    ]);
    return { payments, summary };
  }

  async getThisWeek() {
    const [payments, summary] = await Promise.all([
      this.paymentRepository.getThisWeekPayments(),
      this.paymentRepository.getThisWeekPaymentsTotal(),
    ]);
    return { payments, summary };
  }

  async getById(id: string) {
    await this.paymentValidator.checkExists(id);
    return this.paymentRepository.getById(id);
  }

  async getByStudent(studentId: string) {
    await this.paymentValidator.checkStudentExists(studentId);
    return this.paymentRepository.getByStudent(studentId);
  }

  async getByFeeId(feeId: string) {
    await this.feeService.getById(feeId);
    return this.paymentRepository.getByFeeId(feeId);
  }

  async getByReceiptNumber(receiptNumber: string) {
    return this.paymentValidator.checkReceiptNumberExists(receiptNumber);
  }

  async getPendingChecks() {
    return await this.paymentRepository.getPendingChecks();
  }

  async getOverdueChecks() {
    return await this.paymentRepository.getOverdueChecks();
  }

  async getTotalRevenue() {
    return this.allocationRepository.getTotalRevenue();
  }

  async getRevenueByDateRange(startDate: string, endDate: string) {
    return this.allocationRepository.getRevenueByDateRange(startDate, endDate);
  }

  async getRevenueByPaymentMethod() {
    return this.allocationRepository.getRevenueByPaymentMethod();
  }

  async getMonthlyRevenue(year: number) {
    return this.allocationRepository.getMonthlyRevenue(year);
  }

  async getRevenueStats() {
    return this.allocationRepository.getRevenueStats();
  }

  async getTopPayingStudents(limit: number = 10) {
    return this.allocationRepository.getTopPayingStudents(limit);
  }

  private async getImpactedStudentIds(paymentId?: string, primaryStudentId?: string) {
    const studentIds = new Set<string>();

    if (primaryStudentId) {
      studentIds.add(primaryStudentId);
    }

    if (paymentId) {
      const allocations = await this.allocationRepository.getByPaymentId(paymentId);
      for (const allocation of allocations) {
        const feeStudentId = allocation.fee?.studentId;
        if (feeStudentId) {
          studentIds.add(feeStudentId);
        }
      }
    }

    return [...studentIds];
  }

  private async recalculateImpactedStudents(studentIds: string[]) {
    await Promise.all(
      [...new Set(studentIds.filter(Boolean))]
        .map((studentId) => this.feeService.recalcFinancialsByStudent(studentId))
    );
  }

  private async autoAllocateFromExistingInstallments(
    studentId: string,
    amount: number,
    keepRemainderAsCredit: boolean,
    excludePaymentId?: string,
  ): Promise<{
    allocations: Array<{ feeId: string; number: number; amount: number }>;
    remainderCents: number;
  }> {
    const installments = await this.installmentRepository.getByStudentForAutoAllocationForUpdate(studentId);
    const paymentCents = toCents(amount);
    if (paymentCents <= 0) return { allocations: [], remainderCents: 0 };

    const ids = installments.map((i) => i.id);
    const [completedMap, reservedMap] = await Promise.all([
      this.allocationRepository.getCompletedTotalByInstallmentIds(ids, excludePaymentId),
      this.allocationRepository.getReservedTotalByInstallmentIds(ids, excludePaymentId),
    ]);

    const allocations: Array<{ feeId: string; number: number; amount: number }> = [];
    let remaining = paymentCents;

    for (const inst of installments) {
      if (remaining <= 0) break;
      const completed = toCents(completedMap.get(inst.id) || 0);
      const reserved = toCents(reservedMap.get(inst.id) || 0);
      const availableCents = toCents(inst.amount) - completed - reserved;
      if (availableCents <= 0) continue;

      const allocCents = Math.min(remaining, availableCents);
      allocations.push({
        feeId: inst.feeId,
        number: inst.number,
        amount: Number(fromCents(allocCents)),
      });
      remaining -= allocCents;
    }

    this.paymentValidator.ensureAutoAllocationRemainder(remaining, keepRemainderAsCredit);

    return { allocations, remainderCents: remaining };
  }

  @Transaction()
  private async recordTransaction(data: CreatePaymentDto, processedBy?: string) {
    const idempotencyHash = data.idempotencyKey ? computeIdempotencyHash(data as any) : null;
    if (data.idempotencyKey) {
      const existing = await this.paymentValidator.findByIdempotencyKey(
        data.idempotencyKey,
        idempotencyHash!,
      );
      if (existing) {
        const allocations = await this.allocationRepository.getByPaymentId(existing.id);
        return { payment: existing, allocations, replayed: true };
      }
    }

    await this.paymentValidator.validate(data);

    let resolvedAllocations: Array<{ feeId: string; number: number; amount: number }> =
      (data.allocations as Array<{ feeId: string; number: number; amount: number }>) || [];
    if (data.autoAllocate) {
      const autoAllocation = await this.autoAllocateFromExistingInstallments(
        data.studentId,
        data.amount,
        data.keepRemainderAsCredit,
      );
      resolvedAllocations = autoAllocation.allocations;
    }

    await this.paymentValidator.validateAllocationStudents(data.studentId, resolvedAllocations);

    const isCheck = data.paymentMethod === 'check';
    const initialStatus = isCheck ? 'pending' : 'completed';
    const settledDate = isCheck ? null : data.paymentDate;

    const payment = await this.paymentRepository.create({
      studentId: data.studentId,
      amount: String(data.amount),
      paymentDate: data.paymentDate,
      paymentMethod: data.paymentMethod,
      checkNumber: data.checkNumber ?? null,
      checkDueDate: data.checkDueDate ?? null,
      checkBank: data.checkBank ?? null,
      settledDate,
      statusChangedAt: new Date().toISOString(),
      transactionRef: data.transactionRef ?? null,
      receiptNumber: generateReceiptNumber(),
      status: initialStatus,
      processedBy: processedBy,
      idempotencyKey: data.idempotencyKey ?? null,
      idempotencyHash,
      notes: data.notes,
    });

    if (resolvedAllocations.length > 0) {
      const mapped = await this.allocationService.mapAllocations({
        allocations: resolvedAllocations,
      });
      await this.allocationService.processLockedAllocations({
        paymentId: payment.id,
        allocations: mapped,
        paymentAmount: Number(data.amount),
        actorId: processedBy,
      });
    }

    const allocations = await this.allocationRepository.getByPaymentId(payment.id);
    const allocatedTotalCents = allocations.reduce(
      (sum, a) => sum + toCents(a.amount),
      0,
    );
    const paymentCents = toCents(data.amount);
    const remainderCents = paymentCents - allocatedTotalCents;

    if (data.keepRemainderAsCredit && remainderCents > 0) {
      await this.creditService.createLotForPaymentRemainder({
        studentId: data.studentId,
        sourcePaymentId: payment.id,
        paymentAmount: Number(data.amount),
        allocatedTotal: Number(fromCents(allocatedTotalCents)),
        paymentStatus: initialStatus,
        actorId: processedBy,
      });
    } else {
      this.paymentValidator.ensureRecordedRemainder(remainderCents, data.keepRemainderAsCredit);
    }

    await this.auditService.record({
      entityType: 'payment',
      entityId: payment.id,
      action: isCheck ? 'payment.checkRecorded' : 'payment.completed',
      actorId: processedBy,
      before: null,
      after: payment,
      metadata: { allocationIds: allocations.map((a) => a.id) },
    });
    await this.recalculateImpactedStudents([data.studentId]);
    return { payment, allocations, replayed: false };
  }

  async record(data: CreatePaymentDto, processedBy?: string) {
    let result;
    try {
      result = await this.recordTransaction(data, processedBy);
    } catch (error) {
      if (!data.idempotencyKey || !isUniqueViolation(error)) throw error;
      const existing = await this.paymentValidator.findByIdempotencyKey(
        data.idempotencyKey,
        computeIdempotencyHash(data as any),
      );
      if (!existing) throw error;
      result = {
        payment: existing,
        allocations: await this.allocationRepository.getByPaymentId(existing.id),
        replayed: true,
      };
    }
    this.events.emit('payment.recorded', result);
    return result.payment;
  }

  async recordBulk(payments: CreatePaymentDto[], processedBy?: string) {
    const results = [];
    for (const p of payments) {
      const r = await this.record(p, processedBy);
      results.push(r);
    }
    return { count: results.length, items: results };
  }

  @Transaction()
  async update(id: string, data: UpdatePaymentDto, actorId?: string) {
    await this.paymentValidator.validate(data, id);
    const previous = this.paymentValidator.ensureLockedPayment(await this.paymentRepository.getByIdForUpdate(id));
    const paymentData = pickProps(data, UPDATE_KEYS);
    if (
      data.paymentDate !== undefined
      && previous.status === 'completed'
      && previous.paymentMethod !== 'check'
    ) {
      paymentData.settledDate = data.paymentDate;
    }
    const updated = await this.paymentRepository.update(id, paymentData);
    const studentIds = await this.getImpactedStudentIds(id, updated.studentId);
    await this.recalculateImpactedStudents(studentIds);
    await this.auditService.record({
      entityType: 'payment',
      entityId: id,
      action: 'payment.updated',
      actorId,
      before: previous,
      after: updated,
      metadata: { changedFields: Object.keys(paymentData) },
    });
    this.events.emit('payment.updated', updated);
    return updated;
  }

  async delete(_id: string) {
    return this.paymentValidator.ensureHardDeleteDisabled();
  }

  async clearForSeedReset() {
    const result = await this.paymentRepository.clearForSeedReset();
    this.events.emit('payments.deleted', result);
    return result;
  }

  async deleteBulk(_ids: string[]) {
    return this.paymentValidator.ensureHardDeleteDisabled();
  }

  @Transaction()
  async refund(id: string, reason?: string, actorId?: string) {
    const payment = this.paymentValidator.ensureLockedPayment(await this.paymentRepository.getByIdForUpdate(id));
    this.paymentValidator.ensureRefundable(payment.status);
    const previous = { ...payment };
    const updated = await this.paymentRepository.update(id, {
      status: 'refunded',
      statusChangedAt: new Date().toISOString(),
      notes: reason ? `Refunded: ${reason}` : 'Refunded',
    });
    const studentIds = await this.getImpactedStudentIds(id, updated.studentId);
    await this.recalculateImpactedStudents(studentIds);
    await this.creditService.cancelCreditForSourcePayment(id, actorId);
    await this.auditService.record({
      entityType: 'payment',
      entityId: id,
      action: 'payment.refunded',
      actorId,
      before: previous,
      after: updated,
      metadata: { reason },
    });
    this.events.emit('payment.refunded', { before: previous, after: updated, actorId, reason });
    return updated;
  }

  @Transaction()
  async voidPayment(id: string, dto: VoidPaymentDto, actorId?: string) {
    const payment = this.paymentValidator.ensureLockedPayment(await this.paymentRepository.getByIdForUpdate(id));
    this.paymentValidator.ensureVoidable(payment.status);
    const previous = { ...payment };
    const updated = await this.paymentRepository.update(id, {
      status: 'voided',
      statusChangedAt: new Date().toISOString(),
      voidReason: dto.reason,
      voidedAt: new Date().toISOString(),
      voidedBy: actorId ?? null,
    });
    const studentIds = await this.getImpactedStudentIds(id, updated.studentId);
    await this.recalculateImpactedStudents(studentIds);
    await this.creditService.cancelCreditForSourcePayment(id, actorId);
    await this.auditService.record({
      entityType: 'payment',
      entityId: id,
      action: 'payment.voided',
      actorId,
      before: previous,
      after: updated,
      metadata: { reason: dto.reason },
    });
    this.events.emit('payment.voided', { before: previous, after: updated, actorId, reason: dto.reason });
    return updated;
  }

  @Transaction()
  async updateCheckStatus(id: string, dto: CheckStatusDto, actorId?: string) {
    const payment = this.paymentValidator.ensureLockedPayment(await this.paymentRepository.getByIdForUpdate(id));
    this.paymentValidator.ensureCheckTransition(payment, dto.status);
    const previous = { ...payment };
    const allocations = await this.allocationRepository.getByPaymentId(id);
    const targetAllocations = allocations.filter((allocation) => allocation.installment?.number != null);
    if (targetAllocations.length > 0) {
      const locked = await this.installmentRepository.getByFeeAndNumbersForUpdate(
        targetAllocations.map((allocation) => ({
          feeId: allocation.feeId,
          number: Number(allocation.installment.number),
        })),
      );
      const lockedById = new Map(locked.map((row) => [row.id, row]));
      const installmentIds = locked.map((row) => row.id);
      const [completedMap, reservedMap] = await Promise.all([
        this.allocationRepository.getCompletedTotalByInstallmentIds(installmentIds, id),
        this.allocationRepository.getReservedTotalByInstallmentIds(installmentIds, id),
      ]);
      const ownByInstallment = new Map<string, number>();
      for (const allocation of targetAllocations) {
        if (!allocation.installmentId) continue;
        ownByInstallment.set(
          allocation.installmentId,
          (ownByInstallment.get(allocation.installmentId) || 0) + toCents(allocation.amount),
        );
      }
      for (const [installmentId, ownCents] of ownByInstallment) {
        const installment = this.paymentValidator.ensureCheckInstallmentExists(lockedById.get(installmentId));
        const consumedCents = toCents(completedMap.get(installmentId) || 0)
          + toCents(reservedMap.get(installmentId) || 0)
          + ownCents;
        this.paymentValidator.ensureCheckInstallmentCapacity(consumedCents, toCents(installment.amount), installment.number);
      }
    }
    const now = new Date().toISOString();
    const settledDate = dto.status === 'completed'
      ? (dto.settledDate ?? formatDateOnly(getBusinessDate()))
      : (previous.settledDate ?? null);

    const updated = await this.paymentRepository.update(id, {
      status: dto.status,
      statusChangedAt: now,
      settledDate,
      bouncedReason: dto.status === 'bounced' ? (dto.reason ?? null) : null,
    });

    if (dto.status === 'completed') {
      await this.creditService.activateCreditForSourcePayment(id, actorId);
    } else if (dto.status === 'bounced') {
      await this.creditService.cancelCreditForSourcePayment(id, actorId);
    }

    const studentIds = await this.getImpactedStudentIds(id, updated.studentId);
    await this.recalculateImpactedStudents(studentIds);
    await this.auditService.record({
      entityType: 'payment',
      entityId: id,
      action: `payment.check.${dto.status}`,
      actorId,
      before: previous,
      after: updated,
      metadata: { reason: dto.reason },
    });
    this.events.emit('payment.checkStatusChanged', {
      before: previous,
      after: updated,
      actorId,
      reason: dto.reason,
    });
    return updated;
  }
}
