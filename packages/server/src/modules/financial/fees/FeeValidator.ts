import { Err, I18n, Service } from '../../../najm';
import { FeeRepository } from './FeeRepository';
import { StudentValidator } from '../../students/StudentValidator';
import { FeeTypeValidator } from '../feeTypes/FeeTypeValidator';
import { FeeEffectiveDateError, getCurrentAcademicYear, isValidDateOnly } from '../utils';
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

  mapEffectiveDateError(error: unknown): never {
    if (error instanceof FeeEffectiveDateError) Err(400, error.message);
    throw error;
  }

  ensureWritableYear(year: { status: string }, role?: string) {
    if (role && year.status === 'draft') Err(409, 'Fees cannot be charged to a draft academic year');
  }

  ensureSelectedFeeYear(academicYear: string | undefined, selectedYear: string) {
    if (academicYear && academicYear !== selectedYear) Err(409, 'Fee year must match the selected academic year');
  }

  ensureSelectedFeeYears(fees: Array<{ academicYear?: string }>, selectedYear: string) {
    for (const fee of fees) this.ensureSelectedFeeYear(fee.academicYear, selectedYear);
  }

  ensureStudentRecord<T>(student: T | null | undefined): T {
    if (!student) Err(404, 'Student not found');
    return student;
  }

  ensureEnrollmentDate(date: string) {
    if (!isValidDateOnly(date)) Err(400, 'Student is missing a valid enrollment date');
  }

  ensureRosterDate(date: string, year: { reportingStartsOn: string; reportingEndsOn: string }, effectiveDate?: string | null) {
    if (!isValidDateOnly(date) || date < year.reportingStartsOn || date > year.reportingEndsOn) {
      Err(422, effectiveDate
        ? 'Bulk fee effective date must belong to the selected academic year'
        : 'Year-targeted class fees require an effective date for the dated roster');
    }
  }

  ensureClassInYear(classes: Array<{ id: string }>, classId: string) {
    if (!classes.some((schoolClass) => schoolClass.id === classId)) Err(422, 'Bulk fee class must belong to the selected academic year');
  }

  ensureSectionInClass(sections: Array<{ id: string }>, sectionId: string) {
    if (!sections.some((section) => section.id === sectionId)) Err(422, 'Bulk fee section must belong to the selected class');
  }

  ensureEnrollmentFeeYear(fees: Array<{ academicYear?: string }>, enrollmentYear?: string) {
    if (enrollmentYear && fees.some((fee) => fee.academicYear && fee.academicYear !== enrollmentYear)) {
      Err(409, 'Student fee year must match the new enrollment year');
    }
  }

  ensureYearUnchanged(academicYear: string | undefined, existingYear: string) {
    if (academicYear && academicYear !== existingYear) Err(409, 'Changing a fee to another academic year requires a separate correction workflow');
  }

  ensureScheduleEditable(paymentCount: number) {
    if (paymentCount > 0) Err(400, 'Cannot change fee schedule, amount, or student after payments have been recorded');
  }

  ensureRecalculationFee<T>(fee: T | null | undefined): T {
    if (!fee) Err(404, 'Fee not found');
    return fee;
  }

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

  async checkExistsAllYears(id: string) {
    const fee = await this.feeRepository.getByIdAllYears(id);
    if (!fee) Err(404, this.t('notFound'));
    return fee;
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

  async validate(data, excludeId = null, defaultAcademicYear?: string) {
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
      academicYear || existingFee?.academicYear || defaultAcademicYear,
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
