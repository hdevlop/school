import { Err, I18n, Service } from '@server/najm';
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
    const fee = await this.feeRepository.getById(feeId);
    if (!fee) {
      Err(404, this.t('feeNotFound'));
    }
    return fee;
  }

  async checkInstallmentExists(installmentId) {
    const installment = await this.installmentRepository.getById(installmentId);
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
