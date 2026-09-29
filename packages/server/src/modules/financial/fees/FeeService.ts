import { Service, Transaction, Events, EventService } from '../../../najm';
import { FeeValidator } from './FeeValidator';
import { getBusinessDate, isEmpty, pickProps } from '../../../shared';
import { FeeRepository } from './FeeRepository';
import {
  amountToString,
  calculateFeeAmounts,
  calculateFeeStatus,
  formatDateOnly,
  getCurrentAcademicYear,
  resolveFeeEffectiveDate,
} from '../utils';
import { InstallmentService } from '../installments/InstallmentService';
import { SettingsRepository } from '../../settings/SettingsRepository';
import { ClassRepository } from '../../classes/ClassRepository';
import { StudentRepository } from '../../students/StudentRepository';
import { StudentEnrollmentRepository } from '../../studentEnrollments/StudentEnrollmentRepository';
import { AcademicYearValidator, type ResolvedAcademicYear } from '../../academicYears/AcademicYearValidator';
import { FinancialAuditService } from '../auditLog/FinancialAuditService';
import { Year } from '../../academicYears/requestYear';
import type { CreateFeeDto, UpdateFeeDto, ClassBulkFeeDto } from './FeeDto';

const FEE_UPDATE_KEYS = [
  'studentId', 'schedule', 'academicYear', 'effectiveDate', 'baseAmount',
  'discountAmount', 'discountReason', 'status', 'notes', 'assignedBy'
];

const FEE_CREATE_KEYS = [
  'studentId', 'feeTypeId', 'schedule', 'academicYear', 'effectiveDate',
  'baseAmount', 'grossAmount', 'netAmount', 'paidAmount',
  'discountAmount', 'discountReason', 'notes', 'assignedBy'
];

@Service()
export class FeeService {
  @Events() private events!: EventService;
  @Year() private readonly year!: ResolvedAcademicYear;

  constructor(
    private feeRepository: FeeRepository,
    private feeValidator: FeeValidator,
    private installmentService: InstallmentService,
    private settingsRepository: SettingsRepository,
    private classRepository: ClassRepository,
    private studentRepository: StudentRepository,
    private auditService: FinancialAuditService,
    private enrollments: StudentEnrollmentRepository,
    private academicYears: AcademicYearValidator,
  ) { }

  async getAll() {
    return this.feeRepository.getAll();
  }

  /**
   * Students owing fees of any school year, whichever year is viewed: the
   * explicit all-year read behind the fees table's outstanding scope. Each
   * row sums every year's fees, so it never mixes into one year's totals.
   */
  async getOutstanding() {
    const rows = await this.feeRepository.getAllYears();
    return rows.filter((row) => Number(row.totalDue ?? 0) > 0);
  }

  /** Every year's fees, one row per student: an explicit all-year read for trusted callers. */
  async getAllYears() {
    return this.feeRepository.getAllYears();
  }

  async getOverdue() {
    return this.feeRepository.getOverdue();
  }

  async getOverdueSummary() {
    return this.feeRepository.getOverdueSummary();
  }

  async getOverdueByStudent(studentId: string) {
    return this.feeRepository.getOverdueByStudent(studentId);
  }

  // A fee belongs to the year it charges; outside the selected year it is
  // not found, so a detail never shows under another year's heading.
  async getById(id: string) {
    return this.feeValidator.checkExists(id);
  }

  async getByStudent(studentId: string) {
    return this.feeRepository.getByStudent(studentId);
  }

  /** One student's fees of every year: an explicit all-year read (cross-year debt, seeding). */
  async getByStudentAllYears(studentId: string) {
    return this.feeRepository.getByStudentAllYears(studentId);
  }

  private async requireWritableYear(label: string, role?: string) {
    const year = role
      ? await this.academicYears.resolve(label, role)
      : await this.academicYears.requireLabel(label);
    // Explicit administrative preparation (such as rollover) calls this
    // service without a request role; ordinary fee screens cannot charge drafts.
    this.feeValidator.ensureWritableYear(year, role);
    return year;
  }

  @Transaction()
  // `requestYear` is the year the request works in (the form's captured
  // year); it charges a fee that names no year of its own.
  async create(data: CreateFeeDto, assignedBy?: string, role?: string) {
    if (role) this.feeValidator.ensureSelectedFeeYear(data.academicYear, this.year.label);
    await this.feeValidator.validate(data, null, role ? this.year.label : undefined);

    const [feeType, student, settings] = await Promise.all([
      this.feeValidator.validateFeeTypeExists(data.feeTypeId),
      this.studentRepository.getById(data.studentId),
      this.settingsRepository.getAdminSettings(),
    ]);

    this.feeValidator.ensureStudentRecord(student);

    const startMonth = settings?.startMonth || 'september';
    const endMonth = settings?.endMonth || 'june';
    const academicYear =
      data.academicYear ||
      (role ? this.year.label : undefined) ||
      settings?.currentAcademicYear ||
      getCurrentAcademicYear(startMonth);
    await this.requireWritableYear(academicYear, role);

    this.feeValidator.ensureEnrollmentDate(student.enrollmentDate);

    let resolvedEffectiveDate: string;
    try {
      resolvedEffectiveDate = resolveFeeEffectiveDate({
        requestedDate: data.effectiveDate ?? null,
        enrollmentDate: student.enrollmentDate,
        startMonth,
        endMonth,
        academicYear,
      });
    } catch (error) {
      this.feeValidator.mapEffectiveDateError(error);
    }

    const calculationContext = {
      academicYear,
      startMonth,
      endMonth,
      effectiveDate: resolvedEffectiveDate,
    };

    const baseAmount = data.baseAmount !== undefined ? data.baseAmount : feeType.amount;

    const { grossAmount, netAmount, totalDiscount } = calculateFeeAmounts(
      feeType.paymentType,
      baseAmount,
      data.schedule,
      data.discountAmount,
      calculationContext,
    );

    const feeDetails: Record<string, any> = {
      studentId: data.studentId,
      feeTypeId: data.feeTypeId,
      schedule: data.schedule,
      academicYear,
      effectiveDate: resolvedEffectiveDate,
      baseAmount,
      grossAmount,
      netAmount,
      paidAmount: amountToString(0),
      discountAmount: totalDiscount,
      discountReason: data.discountReason,
      status: 'pending',
      notes: data.notes,
      assignedBy: data.assignedBy || assignedBy,
    };

    const created = await this.feeRepository.create(pickProps(feeDetails, FEE_CREATE_KEYS));
    await this.installmentService.generateInstallments({
      ...created,
      effectiveDate: resolvedEffectiveDate,
    });

    const recalculated = await this.recalculate(created.id);
    await this.auditService.record({
      entityType: 'fee',
      entityId: recalculated.id,
      action: 'fee.created',
      actorId: data.assignedBy || assignedBy || null,
      before: null,
      after: recalculated,
      metadata: { effectiveDate: resolvedEffectiveDate },
    });
    return recalculated;
  }

  async createBulk(fees: CreateFeeDto[], assignedBy?: string, role?: string) {
    if (role) this.feeValidator.ensureSelectedFeeYears(fees, this.year.label);
    const settings = await this.settingsRepository.getAdminSettings();
    const defaultYear = (role ? this.year.label : undefined) || settings?.currentAcademicYear ||
      getCurrentAcademicYear(settings?.startMonth || 'september');
    for (const label of new Set(fees.map((fee) => fee.academicYear || defaultYear))) {
      await this.requireWritableYear(label, role);
    }
    const createdFees = [];
    for (const feeData of fees) {
      try {
        const fee = await this.create(feeData, assignedBy, role);
        createdFees.push(fee);
      } catch (error: any) {
        if (error?.status === 409) continue;
        throw error;
      }
    }
    return createdFees;
  }

  // Charges the students on the class's dated roster in the fee's year: the
  // year the fee names, else the request's. The roster date is the fee's
  // effective date, or today when the year holds today.
  async createClassBulk(data: ClassBulkFeeDto, assignedBy?: string, role?: string) {
    if (role) this.feeValidator.ensureSelectedFeeYear(data.academicYear, this.year.label);
    const year = await this.requireWritableYear(data.academicYear || this.year.label, role);
    const rosterDate = data.effectiveDate || formatDateOnly(getBusinessDate());
    this.feeValidator.ensureRosterDate(rosterDate, year, data.effectiveDate);
    const yearClasses = await this.classRepository.getByAcademicYear(year.label);
    this.feeValidator.ensureClassInYear(yearClasses, data.classId);
    if (data.sectionId) {
      const classSections = await this.classRepository.getClassSections(data.classId);
      this.feeValidator.ensureSectionInClass(classSections, data.sectionId);
    }
    const roster = await this.enrollments.listRosterAtDate(year.id, rosterDate);
    const matchingStudents = roster
      .filter((row) => row.classId === data.classId &&
        (!data.sectionId || row.sectionId === data.sectionId))
      .map((row) => ({ id: row.studentId, name: row.studentName }));
    const filteredStudents = [...new Map(matchingStudents.map((student) => [student.id, student])).values()];

    const results = {
      created: 0,
      skipped: 0,
      errors: [] as Array<{ studentId: string; studentName: string; error: string }>,
    };

    for (const student of filteredStudents) {
      try {
        await this.create({
          studentId: student.id,
          feeTypeId: data.feeTypeId,
          schedule: data.schedule,
          baseAmount: data.baseAmount,
          academicYear: year.label,
          effectiveDate: data.effectiveDate,
          discountAmount: data.discountAmount,
          discountReason: data.discountReason,
          notes: data.notes,
        }, assignedBy, role);
        results.created++;
      } catch (error: any) {
        if (error?.status === 409) {
          results.skipped++;
        } else {
          results.errors.push({
            studentId: student.id,
            studentName: student.name,
            error: error?.message || 'Unknown error',
          });
        }
      }
    }

    return results;
  }

  async processFees(student?, fees?: CreateFeeDto[], user?, yearEnrolledOn?: string, enrollmentYear?: string) {
    if (isEmpty(fees)) return;

    this.feeValidator.ensureEnrollmentFeeYear(fees, enrollmentYear);

    const studentId = student?.id;
    const assignedBy = user?.id;
    const studentEnrollmentDate = student?.enrollmentDate;

    const newFees = fees.map((fee) => ({
      ...fee,
      studentId,
      academicYear: enrollmentYear ?? fee.academicYear,
      effectiveDate: fee.effectiveDate ?? yearEnrolledOn ?? studentEnrollmentDate,
    }));

    const createdFees = await this.createBulk(newFees, assignedBy, user?.role);

    return createdFees.map((fee) => fee.id);
  }

  @Transaction()
  async update(id: string, data: UpdateFeeDto, actorId?: string, role?: string) {
    await this.feeValidator.validate(data, id);

    const existingFee = await this.feeRepository.getById(id);
    this.feeValidator.ensureYearUnchanged(data.academicYear, existingFee.academicYear);
    await this.requireWritableYear(existingFee.academicYear, role);
    const feeData: Record<string, any> = pickProps(data, FEE_UPDATE_KEYS);

    const needsRecalculation =
      data.baseAmount !== undefined ||
      data.schedule !== undefined ||
      data.discountAmount !== undefined ||
      data.academicYear !== undefined ||
      data.effectiveDate !== undefined ||
      data.studentId !== undefined;

    if (needsRecalculation) {
      this.feeValidator.ensureScheduleEditable(Number(existingFee.paymentCount || 0));

      const [feeType, student, settings] = await Promise.all([
        this.feeValidator.validateFeeTypeExists(existingFee.feeTypeId),
        this.studentRepository.getById(data.studentId ?? existingFee.studentId),
        this.settingsRepository.getAdminSettings(),
      ]);

      this.feeValidator.ensureStudentRecord(student);
      this.feeValidator.ensureEnrollmentDate(student.enrollmentDate);

      const startMonth = settings?.startMonth || 'september';
      const endMonth = settings?.endMonth || 'june';
      const academicYear = data.academicYear ?? existingFee.academicYear;

      let resolvedEffectiveDate: string;
      try {
        resolvedEffectiveDate = resolveFeeEffectiveDate({
          requestedDate: data.effectiveDate ?? existingFee.effectiveDate ?? null,
          enrollmentDate: student.enrollmentDate,
          startMonth,
          endMonth,
          academicYear,
        });
      } catch (error) {
        this.feeValidator.mapEffectiveDateError(error);
      }

      const schedule = data.schedule !== undefined ? data.schedule : existingFee.schedule;
      const discountAmount = data.discountAmount !== undefined
        ? data.discountAmount
        : existingFee.discountAmount;

      const calculationContext = {
        academicYear,
        startMonth,
        endMonth,
        effectiveDate: resolvedEffectiveDate,
      };

      const baseAmount = data.baseAmount !== undefined
        ? data.baseAmount
        : (existingFee.baseAmount || feeType.amount);

      const { grossAmount, netAmount, totalDiscount } = calculateFeeAmounts(
        feeType.paymentType,
        baseAmount,
        schedule,
        discountAmount,
        calculationContext,
      );

      feeData.studentId = student.id;
      feeData.academicYear = academicYear;
      feeData.baseAmount = Number(baseAmount);
      feeData.grossAmount = grossAmount;
      feeData.netAmount = netAmount;
      feeData.discountAmount = totalDiscount;
      feeData.effectiveDate = resolvedEffectiveDate;
    } else if (data.effectiveDate !== undefined) {
      feeData.effectiveDate = data.effectiveDate;
    }

    const updatedFee = await this.feeRepository.update(id, feeData);

    if (needsRecalculation) {
      await this.installmentService.generateInstallments(updatedFee);
      const recalculatedFee = await this.recalculate(id);
      await this.auditService.record({
        entityType: 'fee',
        entityId: id,
        action: 'fee.updated',
        actorId,
        before: existingFee,
        after: recalculatedFee,
        metadata: { changedFields: Object.keys(feeData) },
      });
      this.events.emit('fee.updated', recalculatedFee);
      return recalculatedFee;
    }

    await this.auditService.record({
      entityType: 'fee',
      entityId: id,
      action: 'fee.updated',
      actorId,
      before: existingFee,
      after: updatedFee,
      metadata: { changedFields: Object.keys(feeData) },
    });
    this.events.emit('fee.updated', updatedFee);
    return updatedFee;
  }

  @Transaction()
  async delete(id: string, actorId?: string, role?: string) {
    const existing = await this.feeValidator.checkExists(id);
    await this.requireWritableYear(existing.academicYear, role);
    const deletedFee = await this.feeRepository.delete(id);
    await this.auditService.record({
      entityType: 'fee',
      entityId: id,
      action: 'fee.deleted',
      actorId,
      before: existing,
      after: null,
    });
    this.events.emit('fee.deleted', deletedFee);
    return deletedFee;
  }

  async clearForSeedReset() {
    return await this.feeRepository.deleteAll();
  }

  async deleteBulk(ids: string[], actorId?: string, role?: string) {
    if (role) {
      // Authorize the whole request before deleting any of its fees.
      const fees = await Promise.all(ids.map((id) => this.feeValidator.checkExists(id)));
      for (const label of new Set(fees.map((fee) => fee.academicYear))) {
        await this.requireWritableYear(label, role);
      }
    }
    const results = await Promise.all(
      ids.map((id) => this.delete(id, actorId, role))
    );
    return {
      deletedCount: results.length,
      deletedFees: results,
    };
  }

  async recalculate(id: string, role?: string) {
    if (!id) return;
    const existing = role
      ? await this.feeValidator.checkExists(id)
      : await this.feeRepository.getByIdAllYears(id);
    this.feeValidator.ensureRecalculationFee(existing);
    if (role) await this.requireWritableYear(existing.academicYear, role);
    const totalAllocated = await this.feeRepository.getAllocatedTotal(id);
    const fee = await this.feeRepository.getByIdAllYears(id);
    const netAmount = Number(fee.netAmount) || 0;
    const installments = (fee.installments || []) as Array<{ dueDate: string; status: string }>;

    const status = calculateFeeStatus(netAmount, totalAllocated, installments);

    const updated = await this.feeRepository.updateAllYears(id, {
      paidAmount: amountToString(totalAllocated),
      status,
    });
    this.events.emit('fee.updated', updated);
    return updated;
  }

  async recalcFinancialsByStudent(studentId: string) {
    if (!studentId) return;
    const feeIds = await this.feeRepository.getFeeIdsByStudent(studentId);
    await Promise.all(
      feeIds.map(async (feeId) => {
        await this.installmentService.recalculateByFeeId(feeId);
        await this.recalculate(feeId);
      })
    );
    return { studentId, feesRecalculated: feeIds.length };
  }

  @Transaction()
  async endTransportFee(studentId: string, feeTypeId: string, effectiveDate: string, actorId?: string) {
    const fee = await this.feeRepository.getByStudentAndYear(studentId, this.year.label, feeTypeId);
    if (!fee) return { fee: null, cancelledInstallments: 0 };

    const cancelled = await this.installmentService.cancelFutureUnpaidByFeeId(fee.id, effectiveDate);
    if (cancelled.length === 0) {
      return { fee: await this.feeRepository.getByIdAllYears(fee.id), cancelledInstallments: 0 };
    }

    const cancelledAmount = cancelled.reduce(
      (sum, installment) => sum + Number(installment.amount || 0),
      0,
    );
    const paidAmount = Number(fee.paidAmount || 0);
    const netAmount = Math.max(paidAmount, Number(fee.netAmount || 0) - cancelledAmount);
    const grossAmount = Math.max(netAmount, Number(fee.grossAmount || 0) - cancelledAmount);

    await this.feeRepository.updateAllYears(fee.id, {
      netAmount,
      grossAmount,
      discountAmount: Math.max(0, grossAmount - netAmount),
      notes: [fee.notes, `Transport ended ${effectiveDate}`].filter(Boolean).join(' · '),
    });
    const recalculated = await this.recalculate(fee.id);
    await this.auditService.record({
      entityType: 'fee',
      entityId: fee.id,
      action: 'fee.transportEnded',
      actorId,
      before: fee,
      after: recalculated,
      metadata: { effectiveDate, cancelledInstallments: cancelled.length, cancelledAmount },
    });
    return { fee: recalculated, cancelledInstallments: cancelled.length };
  }

  @Transaction()
  async resumeTransportFee(studentId: string, feeTypeId: string, effectiveDate: string, actorId?: string) {
    const fee = await this.feeRepository.getByStudentAndYear(studentId, this.year.label, feeTypeId);
    if (!fee) return { fee: null, resumedInstallments: 0 };

    const resumed = await this.installmentService.resumeCancelledByFeeId(fee.id, effectiveDate);
    if (resumed.length === 0) {
      return { fee: await this.feeRepository.getByIdAllYears(fee.id), resumedInstallments: 0 };
    }

    const resumedAmount = resumed.reduce(
      (sum, installment) => sum + Number(installment.amount || 0),
      0,
    );
    const before = await this.feeRepository.getByIdAllYears(fee.id);
    await this.feeRepository.updateAllYears(fee.id, {
      netAmount: Number(fee.netAmount || 0) + resumedAmount,
      grossAmount: Number(fee.grossAmount || 0) + resumedAmount,
      notes: [fee.notes, `Transport resumed ${effectiveDate}`].filter(Boolean).join(' · '),
    });
    const recalculated = await this.recalculate(fee.id);
    await this.auditService.record({
      entityType: 'fee',
      entityId: fee.id,
      action: 'fee.transportResumed',
      actorId,
      before,
      after: recalculated,
      metadata: { effectiveDate, resumedInstallments: resumed.length, resumedAmount },
    });
    return { fee: recalculated, resumedInstallments: resumed.length };
  }
}
