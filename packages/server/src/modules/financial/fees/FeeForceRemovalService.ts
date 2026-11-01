import { Events, EventService, Service, Transaction } from '../../../najm';
import { AcademicYearValidator } from '../../academicYears/AcademicYearValidator';
import { FinancialAuditService } from '../auditLog/FinancialAuditService';
import { InstallmentService } from '../installments/InstallmentService';
import { fromCents, toCents } from '../utils/money';
import { FeeForceRemovalRepository } from './FeeForceRemovalRepository';
import { FeeRepository } from './FeeRepository';
import { FeeValidator } from './FeeValidator';

@Service()
export class FeeForceRemovalService {
  @Events() private events!: EventService;

  constructor(
    private fees: FeeRepository,
    private validator: FeeValidator,
    private repository: FeeForceRemovalRepository,
    private installments: InstallmentService,
    private academicYears: AcademicYearValidator,
    private audit: FinancialAuditService,
  ) { }

  @Transaction()
  async remove(id: string, actor: { id: string; role?: string }) {
    this.validator.ensureForceRemovalActor(actor);
    const target = await this.validator.checkExists(id);
    this.validator.ensureWritableYear(await this.academicYears.resolve(target.academicYear, actor.role), actor.role);

    const receipts = await this.repository.lockPayments(target.studentId, id);
    const lots = await this.repository.lockCreditLots(target.studentId, receipts.map(receipt => receipt.id));
    await this.installments.lockFeeSchedule(id);
    const fee = await this.validator.checkExists(id);
    const allocations = await this.repository.getAllocations(id);
    const applications = await this.repository.getCreditApplications(id);
    const receiptById = new Map(receipts.map(receipt => [receipt.id, receipt]));
    this.validator.ensureForceRemovalUnchanged(fee.studentId === target.studentId
      && allocations.every(allocation => receiptById.has(allocation.paymentId)));

    const lotByPayment = new Map(lots.map(lot => [lot.sourcePaymentId, lot]));
    const applicationByAllocation = new Map(applications.map(application => [application.paymentAllocationId, application]));
    const returnedByPayment = new Map<string, { direct: number; credit: number }>();
    for (const allocation of allocations) {
      const receipt = receiptById.get(allocation.paymentId)!;
      // A void/refund/bounce has already reversed its financial effect.
      if (!['completed', 'pending', 'deposited'].includes(receipt.status ?? '')) continue;
      const returned = returnedByPayment.get(receipt.id) ?? { direct: 0, credit: 0 };
      const application = applicationByAllocation.get(allocation.id);
      if (!application) returned.direct += toCents(allocation.amount);
      else if (application.status === 'active') returned.credit += toCents(application.amount);
      returnedByPayment.set(receipt.id, returned);
    }

    const creditChanges = [];
    for (const [paymentId, returned] of returnedByPayment) {
      if (returned.direct + returned.credit === 0) continue;
      const receipt = receiptById.get(paymentId)!;
      const previous = lotByPayment.get(paymentId);
      const original = toCents(previous?.originalAmount ?? 0) + returned.direct;
      const remaining = toCents(previous?.remainingAmount ?? 0) + returned.direct + returned.credit;
      this.validator.ensureForceRemovalCredit(previous?.status, original, remaining);
      const updated = await this.repository.saveCredit({
        id: previous?.id,
        studentId: previous?.studentId ?? receipt.studentId,
        sourcePaymentId: paymentId,
        originalAmount: fromCents(original),
        remainingAmount: fromCents(remaining),
        status: receipt.status === 'completed' ? 'available' : 'pending',
      });
      creditChanges.push({ before: previous ?? null, after: updated });
    }

    // Fee deletion cascades to installments, allocations and credit applications.
    // Save all of them with their receipt identities before that cascade runs.
    await this.audit.record({
      entityType: 'fee', entityId: id, action: 'fee.forceRemoved', actorId: actor.id,
      before: { ...fee, allocations, creditApplications: applications }, after: null,
      metadata: { receipts: receipts.filter(receipt => allocations.some(allocation => allocation.paymentId === receipt.id)), creditChanges },
    });
    const deleted = this.validator.ensureRecalculationFee(await this.fees.delete(id));
    this.events.emit('fee.deleted', deleted);
    return deleted;
  }
}
