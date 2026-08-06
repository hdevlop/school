import { Err, Service, Transaction, Events, EventService } from '@server/najm';
import { FeeValidator } from './FeeValidator';
import { getBusinessDate, isEmpty, pickProps } from '@server/shared';
import { FeeRepository } from './FeeRepository';
import {
  amountToString,
  calculateFeeAmounts,
  calculateFeeStatus,
  FeeEffectiveDateError,
  getCurrentAcademicYear,
  isValidDateOnly,
  parseDateOnly,
  resolveFeeEffectiveDate,
} from '../utils';
import { InstallmentService } from '../installments/InstallmentService';
import { SettingsRepository } from '../../settings/SettingsRepository';
import { ClassRepository } from '../../classes/ClassRepository';
import { StudentRepository } from '../../students/StudentRepository';
import { FinancialAuditService } from '../auditLog/FinancialAuditService';
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

function mapFeeEffectiveDateError(error: unknown): never {
  if (error instanceof FeeEffectiveDateError) {
    Err(400, error.message);
  }
  throw error;
}

@Service()
export class FeeService {
  @Events() private events!: EventService;

  constructor(
    private feeRepository: FeeRepository,
    private feeValidator: FeeValidator,
    private installmentService: InstallmentService,
    private settingsRepository: SettingsRepository,
    private classRepository: ClassRepository,
    private studentRepository: StudentRepository,
    private auditService: FinancialAuditService,
  ) { }

  async getAll() {
    return await this.feeRepository.getAll();
  }

  async getOverdue() {
    return await this.feeRepository.getOverdue();
  }

  async getOverdueSummary() {
    return await this.feeRepository.getOverdueSummary();
  }

  async getOverdueByStudent(studentId: string) {
    return await this.feeRepository.getOverdueByStudent(studentId);
  }

  async getById(id: string) {
    await this.feeValidator.checkExists(id);
    return await this.feeRepository.getById(id);
  }

  async getByStudent(studentId: string) {
    return await this.feeRepository.getByStudent(studentId);
  }

  private async getFeeResolutionContext(
    academicYear?: string | null,
    referenceDate?: string | Date | null,
  ) {
    const settings = await this.settingsRepository.getAdminSettings();
    const startMonth = settings?.startMonth || 'september';
    const endMonth = settings?.endMonth || 'june';
    const refDate = referenceDate ? parseDateOnly(referenceDate) : getBusinessDate();

    return {
      academicYear:
        academicYear ||
        settings?.currentAcademicYear ||
        getCurrentAcademicYear(startMonth, refDate),
      startMonth,
      endMonth,
      effectiveDate: refDate,
    };
  }

  @Transaction()
  async create(data: CreateFeeDto, assignedBy?: string) {
    await this.feeValidator.validate(data);

    const [feeType, student, settings] = await Promise.all([
      this.feeValidator.validateFeeTypeExists(data.feeTypeId),
      this.studentRepository.getById(data.studentId),
      this.settingsRepository.getAdminSettings(),
    ]);

    if (!student) {
      Err(404, 'Student not found');
    }

    const startMonth = settings?.startMonth || 'september';
    const endMonth = settings?.endMonth || 'june';
    const academicYear =
      data.academicYear ||
      settings?.currentAcademicYear ||
      getCurrentAcademicYear(startMonth);

    if (!isValidDateOnly(student.enrollmentDate)) {
      Err(400, 'Student is missing a valid enrollment date');
    }

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
      mapFeeEffectiveDateError(error);
      throw error;
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

  async createBulk(fees: CreateFeeDto[], assignedBy?: string) {
    const createdFees = [];
    for (const feeData of fees) {
      try {
        const fee = await this.create(feeData, assignedBy);
        createdFees.push(fee);
      } catch (error: any) {
        if (error?.status === 409) continue;
        throw error;
      }
    }
    return createdFees;
  }

  async createClassBulk(data: ClassBulkFeeDto, assignedBy?: string) {
    const classStudents = await this.classRepository.getClassStudents(data.classId);

    const filteredStudents = data.sectionId
      ? classStudents.filter((s: any) => s.sectionId === data.sectionId)
      : classStudents;

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
          academicYear: data.academicYear,
          discountAmount: data.discountAmount,
          discountReason: data.discountReason,
          notes: data.notes,
        }, assignedBy);
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

  async processFees(student?, fees?: CreateFeeDto[], user?) {
    if (isEmpty(fees)) return;

    const studentId = student?.id;
    const assignedBy = user?.id;
    const studentEnrollmentDate = student?.enrollmentDate;

    const newFees = fees.map((fee) => ({
      ...fee,
      studentId,
      effectiveDate: fee.effectiveDate ?? studentEnrollmentDate,
    }));

    const createdFees = await this.createBulk(newFees, assignedBy);

    return createdFees.map((fee) => fee.id);
  }

  @Transaction()
  async update(id: string, data: UpdateFeeDto, actorId?: string) {
    await this.feeValidator.validate(data, id);

    const existingFee = await this.feeRepository.getById(id);
    const feeData: Record<string, any> = pickProps(data, FEE_UPDATE_KEYS);

    const needsRecalculation =
      data.baseAmount !== undefined ||
      data.schedule !== undefined ||
      data.discountAmount !== undefined ||
      data.academicYear !== undefined ||
      data.effectiveDate !== undefined ||
      data.studentId !== undefined;

    if (needsRecalculation) {
      const hasPaymentHistory = Number(existingFee.paymentCount || 0) > 0;
      if (hasPaymentHistory) {
        Err(400, 'Cannot change fee schedule, amount, or student after payments have been recorded');
      }

      const [feeType, student, settings] = await Promise.all([
        this.feeValidator.validateFeeTypeExists(existingFee.feeTypeId),
        this.studentRepository.getById(data.studentId ?? existingFee.studentId),
        this.settingsRepository.getAdminSettings(),
      ]);

      if (!student) {
        Err(404, 'Student not found');
      }
      if (!isValidDateOnly(student.enrollmentDate)) {
        Err(400, 'Student is missing a valid enrollment date');
      }

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
        mapFeeEffectiveDateError(error);
        throw error;
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
  async delete(id: string, actorId?: string) {
    const existing = await this.feeValidator.checkExists(id);
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

  async deleteBulk(ids: string[], actorId?: string) {
    const results = await Promise.all(
      ids.map((id) => this.delete(id, actorId))
    );
    return {
      deletedCount: results.length,
      deletedFees: results,
    };
  }

  async recalculate(id: string) {
    if (!id) return;
    await this.feeValidator.checkExists(id);
    const totalAllocated = await this.feeRepository.getAllocatedTotal(id);
    const fee = await this.feeRepository.getById(id);
    const netAmount = Number(fee.netAmount) || 0;
    const installments = (fee.installments || []) as Array<{ dueDate: string; status: string }>;

    const status = calculateFeeStatus(netAmount, totalAllocated, installments);

    const updated = await this.feeRepository.update(id, {
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
    const fee = await this.feeRepository.getByStudentAndFeeType(studentId, feeTypeId);
    if (!fee) return { fee: null, cancelledInstallments: 0 };

    const cancelled = await this.installmentService.cancelFutureUnpaidByFeeId(fee.id, effectiveDate);
    if (cancelled.length === 0) {
      return { fee: await this.feeRepository.getById(fee.id), cancelledInstallments: 0 };
    }

    const cancelledAmount = cancelled.reduce(
      (sum, installment) => sum + Number(installment.amount || 0),
      0,
    );
    const paidAmount = Number(fee.paidAmount || 0);
    const netAmount = Math.max(paidAmount, Number(fee.netAmount || 0) - cancelledAmount);
    const grossAmount = Math.max(netAmount, Number(fee.grossAmount || 0) - cancelledAmount);

    await this.feeRepository.update(fee.id, {
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
    const fee = await this.feeRepository.getByStudentAndFeeType(studentId, feeTypeId);
    if (!fee) return { fee: null, resumedInstallments: 0 };

    const resumed = await this.installmentService.resumeCancelledByFeeId(fee.id, effectiveDate);
    if (resumed.length === 0) {
      return { fee: await this.feeRepository.getById(fee.id), resumedInstallments: 0 };
    }

    const resumedAmount = resumed.reduce(
      (sum, installment) => sum + Number(installment.amount || 0),
      0,
    );
    const before = await this.feeRepository.getById(fee.id);
    await this.feeRepository.update(fee.id, {
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
