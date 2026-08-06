import { Err, I18n, Service } from '@server/najm';
import { FeeTypeRepository } from './FeeTypeRepository';

@Service()
export class FeeTypeValidator {
  @I18n('feeTypes.errors') private t!: (key: string) => string;

  constructor(
    private feeTypeRepository: FeeTypeRepository,
  ) { }


  // ========== UNIQUENESS CHECKS ==========

  async checkIdIsUnique(id: string) {
    const existingFeeType = await this.feeTypeRepository.getById(id);
    if (existingFeeType) {
      Err(409, this.t('idExists'));
    }
  }

  async checkNameIsUnique(name: string, excludeId = null) {
    if (!name) return;
    const existingFeeType = await this.feeTypeRepository.getByName(name);
    if (existingFeeType && existingFeeType.id !== excludeId) {
      Err(409, this.t('nameAlreadyExists'));
    }
  }

  // ========== EXISTENCE CHECKS ==========

  async isExists(id) {
    const existingFeeType = await this.feeTypeRepository.getById(id);
    return !!existingFeeType;
  }

  async isNameExists(name) {
    if (!name) return false;
    const existingFeeType = await this.feeTypeRepository.getByName(name);
    return !!existingFeeType;
  }

  async checkExists(id) {
    const existingFeeType = await this.feeTypeRepository.getById(id);
    if (!existingFeeType) {
      Err(404, this.t('notFound'));
    }
    return existingFeeType;
  }

  async checkNameExists(name) {
    const feeType = await this.feeTypeRepository.getByName(name);
    if (!feeType) {
      Err(404, this.t('notFound'));
    }
    return feeType;
  }

  // ========== FIELD VALIDATION ==========

  async validateAmount(amount) {
    if (amount <= 0) {
      Err(400, this.t('invalidAmount'));
    }

    if (amount > 1000000) {
      Err(400, this.t('amountTooLarge'));
    }

    return true;
  }

  async validateFeeTypeStatus(status) {
    const validStatuses = ['active', 'inactive', 'archived'];
    if (!validStatuses.includes(status)) {
      Err(400, this.t('invalidStatus'));
    }
    return true;
  }

  async validatePaymentType(paymentType) {
    const validPaymentTypes = ['recurring', 'oneTime'];
    if (!validPaymentTypes.includes(paymentType)) {
      Err(400, this.t('invalidPaymentType'));
    }
    return true;
  }

  // ========== UNIFIED VALIDATION METHOD ==========

  async validate(data, excludeId: string | null = null) {
    const isUpdate = excludeId !== null;

    if (isUpdate) {
      await this.checkExists(excludeId);
    }

    const { id, name, amount, status, paymentType } = data;

    if (!isUpdate) {
      if (id) await this.checkIdIsUnique(id);
    }

    if (name) await this.checkNameIsUnique(name, excludeId);
    if (amount) await this.validateAmount(amount);
    if (status) await this.validateFeeTypeStatus(status);
    if (paymentType) await this.validatePaymentType(paymentType);

    return data;
  }
}
