import { Err, I18n, Service } from '../../../najm';
import { InstallmentRepository } from './InstallmentRepository';
import { FeeValidator } from '../fees/FeeValidator';

@Service()
export class InstallmentValidator {
  @I18n('fees.errors') private t!: (key: string) => string;

  constructor(
    private installmentRepository: InstallmentRepository,
    private feeValidator: FeeValidator,
  ) { }

  ensurePaymentStateUntouched(data: { paidAmount?: unknown; status?: unknown }) {
    if (data.paidAmount !== undefined || data.status !== undefined) Err(400, this.t('installmentStateManaged'));
  }

  async ensureCanEdit(id: string) {
    if (await this.installmentRepository.hasAllocations(id)) Err(409, this.t('installmentEditHasAllocations'));
  }

  async ensureCanDelete(id: string) {
    if (await this.installmentRepository.hasAllocations(id)) Err(409, this.t('installmentDeleteHasAllocations'));
  }

  // ========== EXISTENCE CHECKS ==========

  async isExists(id) {
    const existing = await this.installmentRepository.getById(id);
    return !!existing;
  }

  async checkExists(id) {
    const installment = await this.installmentRepository.getById(id);
    if (!installment) {
      Err(404, this.t('installmentNotFound'));
    }
    return installment;
  }

  async validateFeeExists(id) {
    return this.feeValidator.checkExists(id)
  }

  async validateSourceFeeExists(id: string) {
    return this.feeValidator.checkExistsAllYears(id);
  }


  async validatePayment(installmentId) {
    const installment = await this.checkExists(installmentId);

    if (installment.status === 'paid') {
      Err(400, this.t('installmentAlreadyPaid'));
    }

    if (installment.status === 'cancelled') {
      Err(400, this.t('cannotPayCancelledInstallment'));
    }

    return installment;
  }

  // ========== BUSINESS RULES ==========

  async validateInstallmentNumberUnique(feeId: string, installmentNumber: number, excludeId: string | null = null) {
    const existingInstallments = await this.installmentRepository.getByFeeId(feeId);
    const duplicate = existingInstallments.find(
      (inst) => inst.number === installmentNumber && inst.id !== excludeId
    );

    if (duplicate) {
      Err(409, this.t('installmentNumberExists'));
    }

    return true;
  }


  // ========== UNIFIED COMPREHENSIVE VALIDATION ==========

  async validate(data, excludeId= null) {
    const isUpdate = excludeId !== null;
    const existing = isUpdate ? await this.checkExists(excludeId) : null;

    const { feeId, number } = data;

    const targetFeeId = feeId ?? existing?.feeId;
    if (!targetFeeId) Err(400, this.t('feeNotFound'));
    await this.feeValidator.checkExists(targetFeeId);

    if (existing && feeId && feeId !== existing.feeId) {
      Err(400, this.t('installmentDoesNotBelongToFee'));
    }

    if (number) {
      await this.validateInstallmentNumberUnique(targetFeeId, number, excludeId);
    }

    return data;
  }
}
