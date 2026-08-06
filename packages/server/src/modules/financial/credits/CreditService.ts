import { Err, Service, Transaction } from '@server/najm';
import { CreditRepository } from './CreditRepository';
import { AllocationRepository } from '../allocations/AllocationRepository';
import { AllocationService } from '../allocations/AllocationService';
import { InstallmentRepository } from '../installments/InstallmentRepository';
import { FeeService } from '../fees/FeeService';
import { FinancialAuditService } from '../auditLog/FinancialAuditService';
import type { ApplyCreditDto } from './CreditDto';
import { fromCents, toCents } from '../utils/money';

@Service()
export class CreditService {
  constructor(
    private creditRepository: CreditRepository,
    private allocationRepository: AllocationRepository,
    private allocationService: AllocationService,
    private installmentRepository: InstallmentRepository,
    private feeService: FeeService,
    private auditService: FinancialAuditService,
  ) { }

  async getByStudent(studentId: string) {
    return this.creditRepository.listLotsForStudent(studentId);
  }

  /**
   * Create a credit lot for a completed non-check payment. Called by
   * PaymentService when (amount - sum(allocations)) > 0 and the caller
   * has opted in via keepRemainderAsCredit.
   */
  async createLotForPaymentRemainder(input: {
    studentId: string;
    sourcePaymentId: string;
    paymentAmount: number;
    allocatedTotal: number;
    paymentStatus: string;
    actorId?: string | null;
  }) {
    const remainderCents = toCents(input.paymentAmount) - toCents(input.allocatedTotal);
    if (remainderCents <= 0) return null;

    const lotStatus = input.paymentStatus === 'completed' ? 'available' : 'pending';
    const lot = await this.creditRepository.createLot({
      studentId: input.studentId,
      sourcePaymentId: input.sourcePaymentId,
      originalAmount: Number(fromCents(remainderCents)),
      remainingAmount: Number(fromCents(remainderCents)),
      status: lotStatus,
    });

    await this.auditService.record({
      entityType: 'student_credit_lot',
      entityId: lot.id,
      action: 'creditLot.created',
      actorId: input.actorId,
      before: null,
      after: lot,
      metadata: { sourcePaymentId: input.sourcePaymentId, status: lotStatus },
    });

    return lot;
  }

  @Transaction()
  async applyStudentCredit(dto: ApplyCreditDto, actorId?: string) {
    const availableLots = await this.creditRepository.listAvailableLotsForUpdate(dto.studentId);
    const totalAvailable = availableLots.reduce(
      (sum, lot) => sum + toCents(lot.remainingAmount),
      0,
    );
    const requestedCents = toCents(dto.amount);

    if (totalAvailable < requestedCents) {
      Err(400, `Requested credit ${dto.amount} exceeds available balance ${(totalAvailable / 100).toFixed(2)}`);
    }

    const installments = await this.installmentRepository.getByStudentForAutoAllocationForUpdate(dto.studentId);
    if (!installments || installments.length === 0) {
      Err(400, 'No installments available to apply credit to');
    }

    const installmentIds = installments.map((i) => i.id);
    const [completedMap, reservedMap] = await Promise.all([
      this.allocationRepository.getCompletedTotalByInstallmentIds(installmentIds),
      this.allocationRepository.getReservedTotalByInstallmentIds(installmentIds),
    ]);

    const targets: Array<{
      feeId: string;
      number: number;
      amount: number;
      installmentId: string;
    }> = [];

    let remainingCents = requestedCents;
    for (const inst of installments) {
      if (remainingCents <= 0) break;
      const completed = toCents(completedMap.get(inst.id) || 0);
      const reserved = toCents(reservedMap.get(inst.id) || 0);
      const availableCents = toCents(inst.amount) - completed - reserved;
      if (availableCents <= 0) continue;
      const allocCents = Math.min(remainingCents, availableCents);
      targets.push({
        feeId: inst.feeId,
        number: inst.number,
        amount: Number(fromCents(allocCents)),
        installmentId: inst.id,
      });
      remainingCents -= allocCents;
    }

    if (remainingCents > 0) {
      Err(400, `Credit exceeds available installment balance by ${(remainingCents / 100).toFixed(2)}`);
    }

    // Walk lots FIFO. Each application links back to the source payment.
    const applications = [];
    const lotUpdates = new Map<string, { id: string; remaining: number; status: string }>();
    const lotCursors = new Map<string, number>();
    for (const lot of availableLots) {
      lotCursors.set(lot.id, toCents(lot.remainingAmount));
    }

    for (const target of targets) {
      // For simplicity, allocate target.amount to the first lot with remaining balance
      // and link a new payment_allocation row referencing the source payment.
      let targetCents = toCents(target.amount);
      for (const lot of availableLots) {
        const lotRemaining = lotCursors.get(lot.id) || 0;
        if (lotRemaining <= 0) continue;
        const takeCents = Math.min(lotRemaining, targetCents);

        const allocation = await this.allocationService.create({
          paymentId: lot.sourcePaymentId,
          feeId: target.feeId,
          installmentId: target.installmentId,
          amount: Number(fromCents(takeCents)),
          type: 'installment',
          notes: `Credit application from lot ${lot.id}`,
        }, actorId);

        const application = await this.creditRepository.createApplication({
          creditLotId: lot.id,
          feeId: target.feeId,
          installmentId: target.installmentId,
          paymentAllocationId: allocation.id,
          amount: Number(fromCents(takeCents)),
          status: 'active',
          appliedBy: actorId,
        });
        applications.push(application);

        const newRemaining = lotRemaining - takeCents;
        lotCursors.set(lot.id, newRemaining);
        const newStatus = newRemaining === 0 ? 'consumed' : 'available';
        lotUpdates.set(lot.id, {
          id: lot.id,
          remaining: Number(fromCents(newRemaining)),
          status: newStatus,
        });

        targetCents -= takeCents;
        if (targetCents <= 0) break;
      }
    }

    for (const update of lotUpdates.values()) {
      await this.creditRepository.updateLot(update.id, {
        remainingAmount: update.remaining,
        status: update.status,
      });
    }

    const studentFeeIds = (await this.feeService.recalcFinancialsByStudent(dto.studentId)) as any;

    await this.auditService.record({
      entityType: 'student_credit',
      entityId: dto.studentId,
      action: 'creditLot.applied',
      actorId,
      before: null,
      after: { applications, lotUpdates: [...lotUpdates.values()] },
      metadata: { studentId: dto.studentId, amount: dto.amount },
    });

    return { applications, lotUpdates: [...lotUpdates.values()], studentFeeIds };
  }

  @Transaction()
  async activateCreditForSourcePayment(sourcePaymentId: string, actorId?: string) {
    const lot = await this.creditRepository.activatePendingLotBySourcePayment(sourcePaymentId);
    if (!lot) return null;
    await this.auditService.record({
      entityType: 'student_credit_lot',
      entityId: lot.id,
      action: 'creditLot.activated',
      actorId,
      before: { status: 'pending' },
      after: lot,
      metadata: { sourcePaymentId },
    });
    return lot;
  }

  async cancelCreditForSourcePayment(sourcePaymentId: string, actorId?: string) {
    const lots = await this.creditRepository.cancelLotsBySourcePayment(sourcePaymentId);
    const reversed = await this.creditRepository.reverseApplicationsByPayment(sourcePaymentId);

    for (const lot of lots) {
      await this.auditService.record({
        entityType: 'student_credit_lot',
        entityId: lot.id,
        action: 'creditLot.cancelled',
        actorId,
        before: { status: lot.status },
        after: lot,
        metadata: { sourcePaymentId, reason: 'source payment bounced/refunded/voided' },
      });
    }

    return { lots, reversedApplications: reversed };
  }
}
