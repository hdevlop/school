import { Err, I18n, Service } from '../../../najm';
import { AllocationRepository } from './AllocationRepository';
import { PaymentRepository } from '../payments/PaymentRepository';
import { FeeRepository } from '../fees/FeeRepository';
import { InstallmentRepository } from '../installments/InstallmentRepository';


@Service()
export class AllocationValidator {
  @I18n('fees.errors') private t!: (key: string) => string;

  constructor(
    private allocationRepository: AllocationRepository,
    private paymentRepository: PaymentRepository,
    private feeRepository: FeeRepository,
    private installmentRepository: InstallmentRepository,
  ) { }

  ensureMappedInstallment<T>(installment: T | null | undefined, number: number, feeId: string) {
    if (!installment) Err(400, `Installment #${number} does not exist for fee ${feeId}`);
    return installment;
  }

  ensureLockedTargets(count: number) {
    if (count === 0) Err(400, 'No installments matched the requested allocation targets');
  }

  ensurePaymentCapacity(plannedCents: number, paymentCents: number) {
    if (plannedCents > paymentCents) Err(400, 'Allocations cannot exceed the payment amount');
  }

  ensureLockedInstallment<T>(installment: T | null | undefined, number: number, feeId: string) {
    if (!installment) Err(400, `Installment #${number} not found for fee ${feeId}`);
    return installment;
  }

  ensureInstallmentCapacity(plannedCents: number, availableCents: number, amount: number, number: number) {
    if (plannedCents > availableCents) {
      Err(400, `Allocation of ${amount} exceeds available ${(availableCents / 100).toFixed(2)} for installment #${number}`);
    }
  }

  async ensureNoCreditApplication(id: string) {
    if (await this.allocationRepository.hasCreditApplication(id)) {
      Err(409, 'A credit application uses this allocation; reverse the source payment instead');
    }
  }

  ensureDeletedAllocation<T>(allocation: T | null | undefined) {
    if (!allocation) Err(404, 'Payment allocation not found in the selected academic year');
    return allocation;
  }

  // ========== EXISTENCE CHECKS ==========

  async isExists(id) {
    const allocation = await this.allocationRepository.getById(id);
    return !!allocation;
  }

  async checkExists(id) {
    const allocation = await this.allocationRepository.getById(id);
    if (!allocation) {
      Err(404, this.t('allocationNotFound'));
    }
    return allocation;
  }

  async checkPaymentExists(paymentId) {
    const payment = await this.paymentRepository.getById(paymentId);
    if (!payment) {
      Err(404, this.t('paymentNotFound'));
    }
    return payment;
  }

  async checkFeeExists(feeId) {
    const fee = await this.feeRepository.getByIdAllYears(feeId);
    if (!fee) {
      Err(404, this.t('feeNotFound'));
    }
    return fee;
  }

  async checkInstallmentExists(installmentId) {
    const installment = await this.installmentRepository.getByIdAllYears(installmentId);
    if (!installment) {
      Err(404, this.t('installmentNotFound'));
    }
    return installment;
  }

  async validateFeeMatchesInstallment(feeId, installmentId) {
    const installment = await this.checkInstallmentExists(installmentId);
    if (installment.feeId !== feeId) {
      Err(400, this.t('installmentDoesNotBelongToFee'));
    }
    return true;
  }

  // ========== UNIFIED VALIDATION ==========

  async validate(data: Record<string, unknown>) {
    const {
      paymentId,
      feeId,
      installmentId,
      type,
    } = data;

    if (paymentId) {
      await this.checkPaymentExists(paymentId);
    }

    if (installmentId) {
      await this.checkInstallmentExists(installmentId);
    }

    if (feeId) {
      await this.checkFeeExists(feeId);
      if (installmentId) {
        await this.validateFeeMatchesInstallment(feeId, installmentId);
      }
    }

    if (type === 'installment' && !installmentId) {
      Err(400, 'Installment allocations require an installmentId');
    }

    return data;
  }
}
