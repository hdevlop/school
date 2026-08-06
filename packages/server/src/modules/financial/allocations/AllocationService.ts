import { Err, Service, Transaction, Events, EventService } from '@server/najm';
import { AllocationRepository } from './AllocationRepository';
import { InstallmentRepository } from '../installments/InstallmentRepository';
import { AllocationValidator } from './AllocationValidator';
import { InstallmentService } from '../installments/InstallmentService';
import { FeeService } from '../fees/FeeService';
import type { CreateAllocationDto } from './AllocationDto';
import { FinancialAuditService } from '../auditLog/FinancialAuditService';
import { fromCents, toCents } from '../utils/money';

type AllocationTarget = {
  feeId: string;
  number: number;
  amount: number;
};

type MappedAllocation = {
  feeId: string;
  installmentId: string;
  installmentNumber: number;
  amount: number;
  installmentData: any;
};

@Service()
export class AllocationService {
  @Events() private events!: EventService;

  constructor(
    private allocationRepository: AllocationRepository,
    private allocationValidator: AllocationValidator,
    private installmentRepository: InstallmentRepository,
    private installmentService: InstallmentService,
    private feeService: FeeService,
    private auditService: FinancialAuditService,
  ) { }

  async getAll() {
    return this.allocationRepository.getAll();
  }

  async getById(id: string) {
    return this.allocationValidator.checkExists(id);
  }

  async getByPaymentId(paymentId: string) {
    await this.allocationValidator.checkPaymentExists(paymentId);
    return this.allocationRepository.getByPaymentId(paymentId);
  }

  async getByStudentId(studentId: string) {
    return this.allocationRepository.getByStudentId(studentId);
  }

  @Transaction()
  async create(data: CreateAllocationDto, actorId?: string) {
    await this.allocationValidator.validate(data);
    const created = await this.allocationRepository.create({ ...data, amount: fromCents(toCents(data.amount)) });
    await this.auditService.record({
      entityType: 'payment_allocation',
      entityId: created.id,
      action: 'allocation.created',
      actorId,
      before: null,
      after: created,
    });
    return created;
  }

  async mapAllocations(data: { allocations: AllocationTarget[] }): Promise<MappedAllocation[]> {
    const allocations = data.allocations;
    const feeIds = [...new Set(allocations.map((alloc) => alloc.feeId))];
    const allInstallmentsArrays = await Promise.all(
      feeIds.map((feeId) => this.installmentRepository.getByFeeId(feeId))
    );
    const feeInstallmentsMap = new Map();
    feeIds.forEach((feeId, index) => {
      const installments = allInstallmentsArrays[index];
      const instMap = new Map(installments.map((inst) => [inst.number, inst]));
      feeInstallmentsMap.set(feeId, instMap);
    });
    return allocations.map((alloc) => {
      const feeId = alloc.feeId;
      const installmentMap = feeInstallmentsMap.get(feeId);
      const inst = installmentMap.get(alloc.number);

      if (!inst) {
        Err(400, `Installment #${alloc.number} does not exist for fee ${feeId}`);
      }

      return {
        feeId: feeId,
        installmentId: inst.id,
        amount: alloc.amount,
        installmentNumber: alloc.number,
        installmentData: inst,
      };
    });
  }

  @Transaction()
  async processLockedAllocations(input: {
    paymentId: string;
    allocations: MappedAllocation[];
    paymentAmount: number;
    excludePaymentId?: string;
    actorId?: string;
  }) {
    const { paymentId, allocations, excludePaymentId, actorId } = input;

    if (!allocations || allocations.length === 0) return [];

    const targets = allocations.map((a) => ({ feeId: a.feeId, number: a.installmentNumber }));
    const locked = await this.installmentRepository.getByFeeAndNumbersForUpdate(targets);

    if (locked.length === 0) {
      Err(400, 'No installments matched the requested allocation targets');
    }

    const lockedByKey = new Map(
      locked.map((row) => [`${row.feeId}:${row.number}`, row])
    );

    const installmentIds = locked.map((row) => row.id);
    const [completedMap, reservedMap] = await Promise.all([
      this.allocationRepository.getCompletedTotalByInstallmentIds(installmentIds, excludePaymentId),
      this.allocationRepository.getReservedTotalByInstallmentIds(installmentIds, excludePaymentId),
    ]);

    const plannedByInstallment = new Map<string, number>();
    const plannedByFee = new Map<string, number>();
    const existingPaymentTotal = toCents(await this.allocationRepository.getTotalAllocatedForPayment(paymentId));
    const requestedTotal = allocations.reduce((sum, item) => sum + toCents(item.amount), 0);
    if (existingPaymentTotal + requestedTotal > toCents(input.paymentAmount)) {
      Err(400, 'Allocations cannot exceed the payment amount');
    }

    for (const a of allocations) {
      const key = `${a.feeId}:${a.installmentNumber}`;
      const lockedRow = lockedByKey.get(key);
      if (!lockedRow) {
        Err(400, `Installment #${a.installmentNumber} not found for fee ${a.feeId}`);
      }

      const completed = toCents(completedMap.get(lockedRow.id) || 0);
      const reserved = toCents(reservedMap.get(lockedRow.id) || 0);
      const available = toCents(lockedRow.amount) - completed - reserved;
      const planned = (plannedByInstallment.get(lockedRow.id) || 0) + toCents(a.amount);

      if (planned > available) {
        Err(400, `Allocation of ${a.amount} exceeds available ${(available / 100).toFixed(2)} for installment #${a.installmentNumber}`);
      }

      plannedByInstallment.set(lockedRow.id, planned);

      const feeKey = a.feeId;
      plannedByFee.set(feeKey, (plannedByFee.get(feeKey) || 0) + toCents(a.amount));
    }

    const created = [];
    for (const item of allocations) {
      const allocation = await this.allocationRepository.create({
        paymentId,
        feeId: item.feeId,
        installmentId: item.installmentId,
        amount: fromCents(toCents(item.amount)),
        type: 'installment',
        notes: `Allocated to installment #${item.installmentNumber} for fee ${item.feeId}`,
      });
      await this.auditService.record({
        entityType: 'payment_allocation',
        entityId: allocation.id,
        action: 'allocation.created',
        actorId,
        before: null,
        after: allocation,
      });
      created.push(allocation);
    }

    this.events.emit('allocations.created', created);
    return created;
  }

  async processAllocation(data: {
    paymentId: string;
    allocations?: AllocationTarget[];
    notes?: string;
  }) {
    if (!data.allocations || data.allocations.length === 0) return [];
    const mapped = await this.mapAllocations({ allocations: data.allocations });
    return this.processLockedAllocations({
      paymentId: data.paymentId,
      allocations: mapped,
      paymentAmount: 0,
    });
  }

  @Transaction()
  async delete(id: string, actorId?: string) {
    const existing = await this.allocationValidator.checkExists(id);
    const result = await this.allocationRepository.delete(id);
    await this.auditService.record({
      entityType: 'payment_allocation',
      entityId: id,
      action: 'allocation.deleted',
      actorId,
      before: existing,
      after: null,
    });

    if (existing?.installmentId) {
      await this.installmentService.recalculate(existing.installmentId);
    }
    if (existing?.feeId) {
      await this.feeService.recalculate(existing.feeId);
    }

    this.events.emit('allocation.deleted', result);
    return result;
  }

  async deleteBulk(ids) {
    const results = await Promise.all(
      ids.map((id) => this.delete(id))
    );
    return {
      deletedCount: results.length,
      deletedFees: results,
    };
  }

  async clearForSeedReset() {
    const result = await this.allocationRepository.deleteAll();
    this.events.emit('allocations.deleted', result);
    return result;
  }
}
