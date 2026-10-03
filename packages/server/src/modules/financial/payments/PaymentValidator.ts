import { Err, I18n, Service } from '../../../najm';
import { PaymentRepository } from './PaymentRepository';
import { StudentValidator } from '../../students/StudentValidator';
import { InstallmentValidator } from '../installments/InstallmentValidator';
import { FeeRepository } from '../fees/FeeRepository';
import { validateAllocationAmount } from '../utils';
import { AllocationRepository } from '../allocations/AllocationRepository';
import { InstallmentRepository } from '../installments/InstallmentRepository';
import { createHash } from 'crypto';
import type { CreatePaymentDto } from './PaymentDto';
import { toCents } from '../utils/money';

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  pending: ['deposited', 'bounced', 'voided'],
  deposited: ['completed', 'bounced', 'voided'],
  completed: ['bounced', 'refunded', 'voided'],
  bounced: [], refunded: [], voided: [], failed: [],
};

function canTransition(from: string, to: string) {
  return from !== to && (ALLOWED_TRANSITIONS[from] || []).includes(to);
}

type FeeInstallmentSnapshot = {
  number?: number | string | null;
  amount?: number | string | null;
  paidAmount?: number | string | null;
  status?: string | null;
};

type FeeSnapshot = {
  id: string;
  studentId: string;
  netAmount?: number | string | null;
  paidAmount?: number | string | null;
  installments?: unknown;
};

const STATUS_FIELDS = [
  'paymentMethod', 'paymentDate', 'checkNumber', 'checkDueDate', 'checkBank',
  'transactionRef', 'notes', 'amount', 'studentId', 'autoAllocate',
  'keepRemainderAsCredit',
];

function canonicalize(value: any): any {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) {
    return value
      .map(canonicalize)
      .map((item) => (typeof item === 'object' && item !== null ? JSON.stringify(item) : item))
      .sort();
  }
  if (typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .reduce<Record<string, any>>((acc, key) => {
        acc[key] = canonicalize(value[key]);
        return acc;
      }, {});
  }
  return value;
}

export function computeIdempotencyHash(payload: Record<string, any>): string {
  const filtered: Record<string, any> = {};
  for (const key of STATUS_FIELDS) {
    if (payload[key] !== undefined) {
      filtered[key] = payload[key];
    }
  }
  if (payload.allocations) {
    const canonical = canonicalize(payload.allocations).map((s) => JSON.parse(s));
    canonical.sort((a, b) => {
      const ka = `${a.feeId}:${a.number}`;
      const kb = `${b.feeId}:${b.number}`;
      return ka.localeCompare(kb);
    });
    filtered.allocations = canonical;
  }
  return createHash('sha256').update(JSON.stringify(filtered)).digest('hex');
}

@Service()
export class PaymentValidator {
  @I18n('fees.errors') private ft!: (key: string) => string;
  @I18n('payments.errors') private pt!: (key: string, params?: Record<string, unknown>) => string;

  constructor(
    private paymentRepository: PaymentRepository,
    private studentValidator: StudentValidator,
    private installmentValidator: InstallmentValidator,
    private feeRepository: FeeRepository,
    private allocationRepository: AllocationRepository,
    private installmentRepository: InstallmentRepository,
  ) { }

  ensureAutoAllocationRemainder(remainingCents: number, keepRemainderAsCredit: boolean) {
    if (remainingCents > 0 && !keepRemainderAsCredit) {
      Err(400, this.pt('exceedsInstallmentsKeepCredit', { excess: (remainingCents / 100).toFixed(2) }));
    }
  }

  ensureRecordedRemainder(remainingCents: number, keepRemainderAsCredit: boolean) {
    if (remainingCents > 0 && !keepRemainderAsCredit) {
      Err(400, this.pt('overAllocates', { excess: (remainingCents / 100).toFixed(2) }));
    }
  }

  ensureLockedPayment<T>(payment: T | null | undefined) {
    if (!payment) Err(404, this.pt('paymentNotFound'));
    return payment;
  }

  ensureHardDeleteDisabled(): never {
    Err(400, this.pt('hardDeleteDisabled'));
  }

  ensureRefundable(status: string) {
    if (status !== 'completed') Err(400, this.pt('refundCompletedOnly'));
  }

  ensureVoidable(status: string) {
    if (!canTransition(status, 'voided')) Err(409, this.pt('cannotVoidStatus', { status }));
  }

  ensureCheckTransition(payment: { paymentMethod: string; status: string }, status: string) {
    if (payment.paymentMethod !== 'check') Err(400, this.pt('checkStatusChecksOnly'));
    if (!canTransition(payment.status, status)) Err(409, this.pt('checkTransitionInvalid', { from: payment.status, to: status }));
  }

  ensureMethodEditable(previousMethod: string, requestedMethod?: string) {
    // FIX: SEC-008 — crossing the check boundary requires a new receipt lifecycle.
    if (requestedMethod && (previousMethod === 'check') !== (requestedMethod === 'check')) {
      Err(409, this.pt('methodChangeNeedsNewReceipt'));
    }
  }

  ensurePayableInstallment(status: string) {
    // FIX: SEC-007 — explicit allocation and check settlement share this rule.
    if (status === 'cancelled') Err(409, this.ft('cannotPayCancelledInstallment'));
  }

  ensureCheckInstallmentExists<T>(installment: T | null | undefined) {
    if (!installment) Err(409, this.pt('checkTargetMissing'));
    return installment;
  }

  ensureCheckInstallmentCapacity(consumedCents: number, amountCents: number, number: number) {
    if (consumedCents > amountCents) Err(409, this.pt('checkAllocationsExceed', { number }));
  }

  async isInstallmentExists(id) {
    return !!(await this.installmentRepository.getByIdAllYears(id));
  }

  async isExists(id) {
    const existingPayment = await this.paymentRepository.getById(id);
    return !!existingPayment;
  }

  async checkExists(id) {
    const paymentExists = await this.paymentRepository.getById(id);
    if (!paymentExists) {
      Err(404, this.pt('paymentNotFound'));
    }
    return paymentExists;
  }

  async checkReceiptNumberExists(receiptNumber) {
    const payment = await this.paymentRepository.getByReceiptNumber(receiptNumber);
    if (!payment) {
      Err(404, this.pt('receiptNumberNotFound'));
    }
    return payment;
  }

  async checkInstallmentExists(id) {
    const installment = await this.installmentRepository.getByIdAllYears(id);
    if (!installment) Err(404, this.ft('installmentNotFound'));
    return installment;
  }

  async checkReceiptNumberUnique(receiptNumber, excludeId = null) {
    if (!receiptNumber) return true;

    const existingPayment = await this.paymentRepository.getByReceiptNumber(receiptNumber);

    if (existingPayment && existingPayment.id !== excludeId) {
      Err(409, this.pt('receiptNumberExists'));
    }

    return true;
  }

  async validateRefund(paymentId) {
    const payment = await this.checkExists(paymentId);
    if (payment.status !== 'completed') {
      Err(400, this.pt('paymentNotCompleted'));
    }
    return payment;
  }

  async checkStudentExists(studentId) {
    return this.studentValidator.checkExists(studentId);
  }

  private getAllocationTotal(allocations?) {
    if (!allocations || allocations.length === 0) return 0;

    return allocations.reduce((sum, allocation) => {
      const value = Number(allocation?.amount ?? 0);
      return sum + (isNaN(value) ? 0 : value);
    }, 0);
  }

  async validateAllocationTotal(data) {
    const { amount, allocations } = data;
    const totalAllocationCents = allocations.reduce(
      (sum, allocation) => sum + toCents(allocation?.amount ?? 0),
      0,
    );
    const paymentCents = toCents(amount);
    const valid = data.keepRemainderAsCredit
      ? totalAllocationCents <= paymentCents
      : totalAllocationCents === paymentCents;

    if (!valid) {
      Err(400, this.pt('allocationTotalMismatch'));
    }
  }

  private findInstallmentByNumber(
    fee: FeeSnapshot,
    installmentNumber: number,
  ) {
    const installments = Array.isArray(fee.installments)
      ? fee.installments as FeeInstallmentSnapshot[]
      : [];

    return installments.find(
      (installment) => Number(installment.number) === installmentNumber,
    );
  }

  private async getFeesByAllocation(allocations: NonNullable<CreatePaymentDto['allocations']>) {
    const feeIds = [...new Set(allocations.map((allocation) => allocation.feeId))];
    const fees = await Promise.all(
      feeIds.map(async (feeId) => {
        const fee = await this.feeRepository.getByIdAllYears(feeId);
        if (!fee) {
          Err(404, this.ft('feeNotFound'));
        }
        return [feeId, fee!] as const;
      }),
    );

    return new Map(fees);
  }

  /**
   * Structural validation only. Does not lock rows.
   * Use validateAllocationBalanceUnderLock for authoritative balance checks
   * when targeting existing installments.
   */
  async validateAllocationStudents(studentId: string, allocations?) {
    if (!studentId || !allocations?.length) return;

    const feeMap = await this.getFeesByAllocation(allocations);
    const plannedByFee = new Map<string, number>();
    const plannedByInstallment = new Map<string, number>();

    for (const allocation of allocations) {
      const fee = feeMap.get(allocation.feeId);
      if (!fee) {
        Err(404, this.ft('feeNotFound'));
      }
      const resolvedFee = fee!;

      if (resolvedFee.studentId !== studentId) {
        Err(400, this.pt('allocationsOtherStudent'));
      }

      const installment = this.findInstallmentByNumber(resolvedFee, allocation.number);
      if (!installment) {
        Err(400, this.pt('installmentMissingForFee', { number: allocation.number, feeId: allocation.feeId }));
      }
      const resolvedInstallment = installment!;
      this.ensurePayableInstallment(resolvedInstallment.status);

      if (resolvedInstallment.status === 'paid') {
        Err(400, this.pt('installmentAlreadyPaid', { number: allocation.number }));
      }

      const installmentKey = `${allocation.feeId}:${allocation.number}`;
      const alreadyAllocated = toCents(resolvedInstallment.paidAmount || 0)
        + (plannedByInstallment.get(installmentKey) || 0);
      const validation = validateAllocationAmount(
        Number(allocation.amount),
        Number(resolvedInstallment.amount || 0),
        alreadyAllocated / 100,
      );

      if (!validation.valid) {
        Err(400, validation.error || 'Invalid allocation amount');
      }

      plannedByInstallment.set(
        installmentKey,
        (plannedByInstallment.get(installmentKey) || 0) + toCents(allocation.amount),
      );

      const remainingFeeBalance =
        toCents(resolvedFee.netAmount || 0) - toCents(resolvedFee.paidAmount || 0);
      const plannedFeeAmount =
        (plannedByFee.get(resolvedFee.id) || 0) + toCents(allocation.amount);

      if (plannedFeeAmount > remainingFeeBalance) {
        Err(400, this.pt('allocationsExceedFee', { feeId: resolvedFee.id }));
      }

      plannedByFee.set(resolvedFee.id, plannedFeeAmount);
    }
  }

  /**
   * Locked balance check. Acquire FOR UPDATE locks on the target installments
   * sorted by (feeId, number), then verify that completed totals + active
   * reservations + planned allocations do not exceed the installment amount.
   * Must be called inside the same transaction that will insert the
   * allocations to be safe under concurrent writers.
   */
  async validateAllocationBalanceUnderLock(input: {
    allocations: NonNullable<CreatePaymentDto['allocations']>;
    excludePaymentId?: string;
  }) {
    const { allocations, excludePaymentId } = input;
    if (!allocations || allocations.length === 0) return;

    const targets = allocations.map((a) => ({ feeId: a.feeId, number: a.number }));
    const locked = await this.installmentRepository.getByFeeAndNumbersForUpdate(targets);

    if (locked.length === 0) {
      Err(400, this.pt('noInstallmentsMatched'));
    }

    const installmentIds = locked.map((row) => row.id);
    const [completedMap, reservedMap] = await Promise.all([
      this.allocationRepository.getCompletedTotalByInstallmentIds(installmentIds, excludePaymentId),
      this.allocationRepository.getReservedTotalByInstallmentIds(installmentIds, excludePaymentId),
    ]);

    const plannedByInstallment = new Map<string, number>();

    for (const allocation of allocations) {
      const lockedRow = locked.find(
        (row) => row.feeId === allocation.feeId && row.number === allocation.number,
      );
      if (!lockedRow) {
        Err(400, this.pt('installmentNotFoundForFee', { number: allocation.number, feeId: allocation.feeId }));
      }
      this.ensurePayableInstallment(lockedRow.status);

      const completed = toCents(completedMap.get(lockedRow.id) || 0);
      const reserved = toCents(reservedMap.get(lockedRow.id) || 0);
      const available = toCents(lockedRow.amount) - completed - reserved;
      const planned = (plannedByInstallment.get(lockedRow.id) || 0) + toCents(allocation.amount);

      if (planned > available) {
        Err(
          400,
          this.pt('allocationExceedsAvailable', { amount: allocation.amount, available: (available / 100).toFixed(2), number: allocation.number }),
        );
      }

      plannedByInstallment.set(lockedRow.id, planned);
    }
  }

  /**
   * Idempotency lookup. If a payment already exists with the given
   * idempotencyKey:
   *   - same hash: returns the existing payment (callers should return 200)
   *   - different hash: returns 409
   * If no payment exists with that key, returns null.
   */
  async findByIdempotencyKey(key: string, payloadHash: string) {
    const existing = await this.paymentRepository.getByIdempotencyKey(key);
    if (!existing) return null;
    if (existing.idempotencyHash !== payloadHash) {
      Err(409, this.pt('idempotencyKeyConflict'));
    }
    return existing;
  }

  async validate(data, excludeId = null) {
    const isUpdate = excludeId !== null;

    if (isUpdate) {
      await this.checkExists(excludeId);
    }

    const { studentId, receiptNumber, allocations } = data;

    if (studentId) {
      await this.studentValidator.checkExists(studentId);
    }

    if (receiptNumber) {
      await this.checkReceiptNumberUnique(receiptNumber, excludeId);
    }

    if (allocations && allocations.length > 0) {
      await this.validateAllocationTotal(data);
      if (studentId) {
        await this.validateAllocationStudents(studentId, allocations);
      }
    } else if (!isUpdate && !data.autoAllocate) {
      Err(400, this.pt('allocationsRequired'));
    }

    return data;
  }
}
