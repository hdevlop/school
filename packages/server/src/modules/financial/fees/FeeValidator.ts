import { Err, I18n, Service } from '../../../najm';
import { FeeRepository } from './FeeRepository';
import { StudentValidator } from '../../students/StudentValidator';
import { FeeTypeValidator } from '../feeTypes/FeeTypeValidator';
import { FeeEffectiveDateError, isValidDateOnly, toCents } from '../utils';
import { getBusinessDate } from '../../../shared/businessDate';
import { formatDateOnly } from '../utils/dateOnly';

@Service()
export class FeeValidator {
  @I18n('fees.errors') private t!: (key: string) => string;

  constructor(
    private feeRepository: FeeRepository,
    private studentValidator: StudentValidator,
    private feeTypeValidator: FeeTypeValidator,
  ) { }

  mapEffectiveDateError(error: unknown): never {
    if (error instanceof FeeEffectiveDateError) Err(400, this.effectiveDateMessage(error));
    throw error;
  }

  /** The refusal in the request's language; the util's own message is English. */
  effectiveDateMessage(error: FeeEffectiveDateError): string {
    switch (error.code) {
      case 'studentNotEnrolledInAcademicYear': return this.t('studentNotEnrolledInAcademicYear');
      case 'effectiveDateOutsideEnrollmentPeriod': return this.t('effectiveDateOutsideEnrollmentPeriod');
      case 'invalidRequestedDate': return this.t('invalidEffectiveDate');
      case 'invalidEnrollmentDate': return this.t('studentEnrollmentDateInvalid');
    }
  }

  ensureWritableYear(year: { status: string }, role?: string) {
    if (role && year.status === 'draft') Err(409, this.t('draftYear'));
  }

  ensureOccasionalDiscount(schedule: string, discount?: number | string | null) {
    if (schedule === 'occasional' && toCents(discount ?? 0) !== 0) Err(422, this.t('occasionalDiscount'));
  }

  ensureOccasionalHistoryUnchanged(fee: any, data: any) {
    if ((data.studentId !== undefined && data.studentId !== fee.studentId)
      || (data.effectiveDate !== undefined && data.effectiveDate !== fee.effectiveDate)
      || (data.academicYear !== undefined && data.academicYear !== fee.academicYear)) {
      Err(409, this.t('occasionalHistoryLocked'));
    }
  }

  ensureOccasionalConversionAllowed(fee: { schedule: string; installments?: unknown; totalInstallments?: unknown }) {
    if (fee.schedule === 'occasional' && ((Array.isArray(fee.installments) && fee.installments.length > 0) || Number(fee.totalInstallments) > 0)) {
      Err(409, this.t('occasionalHistoryLocked'));
    }
  }

  ensureOccasionalCharge(fee: { schedule: string; status: string; effectiveDate?: string | null }, date: string,
    year: { reportingStartsOn: string; reportingEndsOn: string }, enrollment: { enrolledOn: string; leftOn: string | null } | null) {
    if (fee.schedule !== 'occasional' || fee.status === 'cancelled') Err(409, this.t('occasionalOnly'));
    if (!isValidDateOnly(date) || date > formatDateOnly(getBusinessDate())
      || date < year.reportingStartsOn || date > year.reportingEndsOn
      || !enrollment || date < enrollment.enrolledOn || (enrollment.leftOn && date >= enrollment.leftOn)
      || (fee.effectiveDate && date < fee.effectiveDate)) {
      Err(422, this.t('occasionalDate'));
    }
  }

  ensureSelectedFeeYear(academicYear: string | undefined, selectedYear: string) {
    if (academicYear && academicYear !== selectedYear) Err(409, this.t('yearMismatch'));
  }

  ensureSelectedFeeYears(fees: Array<{ academicYear?: string }>, selectedYear: string) {
    for (const fee of fees) this.ensureSelectedFeeYear(fee.academicYear, selectedYear);
  }

  ensureStudentRecord<T>(student: T | null | undefined): T {
    if (!student) Err(404, this.t('studentNotFound'));
    return student;
  }

  ensureEnrollmentDate(date: string) {
    if (!isValidDateOnly(date)) Err(400, this.t('studentEnrollmentDateInvalid'));
  }

  ensureRosterDate(date: string, year: { reportingStartsOn: string; reportingEndsOn: string }, effectiveDate?: string | null) {
    if (!isValidDateOnly(date) || date < year.reportingStartsOn || date > year.reportingEndsOn) {
      Err(422, effectiveDate
        ? 'Bulk fee effective date must belong to the selected academic year'
        : 'Year-targeted class fees require an effective date for the dated roster');
    }
  }

  ensureClassInYear(classes: Array<{ id: string }>, classId: string) {
    if (!classes.some((schoolClass) => schoolClass.id === classId)) Err(422, this.t('bulkClassNotInYear'));
  }

  ensureSectionInClass(sections: Array<{ id: string }>, sectionId: string) {
    if (!sections.some((section) => section.id === sectionId)) Err(422, this.t('bulkSectionNotInClass'));
  }

  ensureEnrollmentFeeYear(fees: Array<{ academicYear?: string }>, enrollmentYear?: string) {
    if (enrollmentYear && fees.some((fee) => fee.academicYear && fee.academicYear !== enrollmentYear)) {
      Err(409, this.t('enrollmentYearMismatch'));
    }
  }

  ensureYearUnchanged(academicYear: string | undefined, existingYear: string) {
    if (academicYear && academicYear !== existingYear) Err(409, this.t('yearChangeNeedsCorrection'));
  }

  ensureScheduleEditable(paymentCount: number) {
    if (paymentCount > 0) Err(400, this.t('lockedAfterPayments'));
  }

  async ensureCanDelete(id: string) {
    if (await this.feeRepository.hasAllocations(id)) Err(409, this.t('feeDeleteHasAllocations'));
  }

  ensureRecalculationFee<T>(fee: T | null | undefined): T {
    if (!fee) Err(404, this.t('notFound'));
    return fee;
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

  /**
   * A recurring fee's discount is per period and a one-time fee's covers it
   * whole. Above the amount, the total discount would exceed the gross and the
   * net would silently read 0.
   */
  ensureDiscountWithinAmount(baseAmount: number | string | null | undefined, discountAmount: number | string | null | undefined) {
    if (toCents(discountAmount ?? 0) > toCents(baseAmount ?? 0)) Err(400, this.t('discountExceedsAmount'));
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

  async validateFeeTypeExists(feeTypeId, forAssignment = false) {
    const feeType = await this.feeTypeValidator.checkExists(feeTypeId);
    if (forAssignment && feeType.status !== 'active') Err(400, this.t('feeTypeInactive'));
    return feeType;
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
      await this.validateFeeTypeExists(feeTypeId, true);
    }

    const targetStudentId = studentId || existingFee?.studentId;
    const targetFeeTypeId = existingFee?.feeTypeId || feeTypeId;
    const targetAcademicYear = academicYear || existingFee?.academicYear || defaultAcademicYear;

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
