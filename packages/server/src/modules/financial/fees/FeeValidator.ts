import { Err, I18n, Service } from '@server/najm';
import { FeeRepository } from './FeeRepository';
import { StudentValidator } from '../../students/StudentValidator';
import { FeeTypeValidator } from '../feeTypes/FeeTypeValidator';
import { getCurrentAcademicYear } from '../utils';
import { SettingsRepository } from '../../settings/SettingsRepository';

@Service()
export class FeeValidator {
  @I18n('fees.errors') private t!: (key: string) => string;

  constructor(
    private feeRepository: FeeRepository,
    private studentValidator: StudentValidator,
    private feeTypeValidator: FeeTypeValidator,
    private settingsRepository: SettingsRepository,
  ) { }

  private async resolveAcademicYear(academicYear?: string | null) {
    if (academicYear) return academicYear;

    const settings = await this.settingsRepository.getAdminSettings();
    return (
      settings?.currentAcademicYear ||
      getCurrentAcademicYear(settings?.startMonth || 'september')
    );
  }

  async isExists(id) {
    const existingFee = await this.feeRepository.getById(id);
    return !!existingFee;
  }



  async checkExists(id) {
    const feeExists = await this.feeRepository.getById(id);
    if (!feeExists) {
      Err(404, this.t('notFound'));
    }
    return feeExists;
  }

  async checkFeeIsUnique(
    studentId,
    feeTypeId,
    academicYear,
    excludeId = null
  ) {
    const existingFee = await this.feeRepository.getByStudentAndYear(
      studentId,
      academicYear,
      feeTypeId
    );

    if (existingFee && existingFee.id !== excludeId) {
      Err(409, this.t('feeAlreadyExists'));
    }
  }

  async validateFeeStatus(status) {
    const validStatuses = ['pending', 'paid', 'partiallyPaid', 'overdue', 'cancelled'];
    if (!validStatuses.includes(status)) {
      Err(400, this.t('invalidStatus'));
    }
    return true;
  }

  async validateDiscountAmount(netAmount: number, discountAmount: number) {
    const net = Number(netAmount) || 0;
    const discount = Number(discountAmount) || 0;

    if (discount < 0) {
      Err(400, this.t('invalidDiscount'));
    }

    if (net < 0) {
      Err(400, this.t('invalidNetAmount'));
    }

    return true;
  }

  async validateStudentExists(studentId) {
    await this.studentValidator.checkExists(studentId);
  }

  async validateFeeTypeExists(feeTypeId) {
    return await this.feeTypeValidator.checkExists(feeTypeId);
  }

  async validate(data, excludeId = null) {
    const isUpdate = excludeId !== null;
    const existingFee = isUpdate
      ? await this.checkExists(excludeId)
      : null;

    const {
      studentId,
      feeTypeId,
      academicYear,
      discountAmount,
      netAmount,
      status
    } = data;

    if (studentId) {
      await this.studentValidator.checkExists(studentId);
    }

    if (feeTypeId && !isUpdate) {
      await this.validateFeeTypeExists(feeTypeId);
    }

    const targetStudentId = studentId || existingFee?.studentId;
    const targetFeeTypeId = existingFee?.feeTypeId || feeTypeId;
    const targetAcademicYear = await this.resolveAcademicYear(
      academicYear || existingFee?.academicYear,
    );

    if (targetStudentId && targetFeeTypeId && targetAcademicYear) {
      await this.checkFeeIsUnique(
        targetStudentId,
        targetFeeTypeId,
        targetAcademicYear,
        excludeId,
      );
    }

    if (status) {
      await this.validateFeeStatus(status);
    }

    if (discountAmount !== undefined && netAmount !== undefined) {
      await this.validateDiscountAmount(netAmount, discountAmount);
    }

    return data;
  }


}
