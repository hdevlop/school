import { createHash } from 'crypto';
import { Err, Service, Transaction } from '../../../najm';
import { RolloverValidator } from './RolloverValidator';
import { RolloverRepository } from './RolloverRepository';
import { FeeService } from '../fees/FeeService';
import { SettingsRepository } from '../../settings/SettingsRepository';
import { FinancialAuditService } from '../auditLog/FinancialAuditService';
import { AcademicYearValidator, type ResolvedAcademicYear } from '../../academicYears/AcademicYearValidator';
import { Year } from '../../academicYears/requestYear';
import {
  calculateFeeAmounts,
  formatDateOnly,
  fromCents,
  getAcademicYearRange,
  isValidDateOnly,
  resolveFeeEffectiveDate,
  toCents,
} from '../utils';
import type { CommitRolloverDto, RolloverDto } from './RolloverDto';

type ProposedFee = {
  sourceFeeId: string;
  studentId: string;
  studentName: string;
  feeTypeId: string;
  feeTypeName: string;
  schedule: string;
  baseAmount: number;
  discountAmount: number;
  discountReason: string | null;
  notes: string | null;
  effectiveDate: string;
  grossAmount: number;
  netAmount: number;
};

function hashPayload(dto: RolloverDto): string {
  return createHash('sha256')
    .update(JSON.stringify({
      fromYear: dto.fromYear,
      toYear: dto.toYear,
      classIds: (dto.classIds ?? []).slice().sort(),
      feeTypeIds: (dto.feeTypeIds ?? []).slice().sort(),
      copyDiscounts: dto.copyDiscounts,
      includeOneTimeFees: dto.includeOneTimeFees,
    }))
    .digest('hex');
}

@Service()
export class RolloverService {
  @Year() private readonly year!: ResolvedAcademicYear;
  constructor(
    private rolloverRepository: RolloverRepository,
    private feeService: FeeService,
    private settingsRepository: SettingsRepository,
    private auditService: FinancialAuditService,
    private academicYears: AcademicYearValidator,
    private validator: RolloverValidator,
  ) { }

  private async validateYears(dto: RolloverDto) {
    this.validator.ensureYears(dto, this.year.label);
    await this.academicYears.requireLabel(dto.fromYear);
  }

  @Transaction()
  async clearForSeedReset() {
    await this.rolloverRepository.clearForSeedReset();
  }

  private async resolveContext() {
    const settings = await this.settingsRepository.getAdminSettings();
    return {
      settings,
      startMonth: settings?.startMonth || 'september',
      endMonth: settings?.endMonth || 'june',
    };
  }

  private async buildPreview(dto: RolloverDto) {
    const { startMonth, endMonth } = await this.resolveContext();
    const students = await this.rolloverRepository.getActiveStudents(dto.fromYear, dto.classIds);
    const studentIds = students.map((student) => student.id);
    const studentMap = new Map(students.map((student) => [student.id, student]));
    const targetEnrollments = new Map(
      (await this.rolloverRepository.getTargetEnrollments(dto.toYear, studentIds))
        .map((row) => [row.studentId, row]),
    );
    const sourceFees = await this.rolloverRepository.getSourceFeesForRollover(
      dto.fromYear,
      studentIds,
      dto.feeTypeIds,
    );
    const sourceFeeTypeIds = [...new Set(sourceFees.map((fee) => fee.feeTypeId))];
    const existing = studentIds.length && sourceFeeTypeIds.length
      ? await this.rolloverRepository.getExistingFeeIdsForYear(studentIds, dto.toYear, sourceFeeTypeIds)
      : [];
    const existingByStudentType = new Map(
      existing.map((row) => [`${row.studentId}:${row.feeTypeId}`, row.id]),
    );

    const { start, end } = getAcademicYearRange(startMonth, endMonth, dto.toYear);
    const rangeStart = formatDateOnly(start);
    const rangeEnd = formatDateOnly(end);
    const studentsNotEnrolled: Array<{ studentId: string; name: string; reason: string }> = [];
    const duplicatesToSkip: Array<{ studentId: string; feeTypeId: string; existingFeeId: string }> = [];
    const oneTimeFees = new Map<string, { feeTypeId: string; name: string; category: string }>();
    const inactiveFeeTypes = new Map<string, { feeTypeId: string; name: string }>();
    const validationErrors: Array<{ studentId: string; studentName: string; error: string }> = [];
    const proposedFees: ProposedFee[] = [];
    const invalidStudents = new Set<string>();
    let projectedGrossCents = 0;
    let projectedNetCents = 0;

    for (const sourceFee of sourceFees) {
      const student = studentMap.get(sourceFee.studentId);
      if (!student) continue;
      const targetEnrollment = targetEnrollments.get(student.id);
      if (!targetEnrollment || targetEnrollment.status !== 'active' || targetEnrollment.leftOn) {
        if (!invalidStudents.has(student.id)) {
          studentsNotEnrolled.push({
            studentId: student.id,
            name: student.name,
            reason: 'Student has no active enrollment in the target academic year',
          });
          invalidStudents.add(student.id);
        }
        continue;
      }

      if (sourceFee.feeTypeStatus !== 'active') {
        inactiveFeeTypes.set(sourceFee.feeTypeId, {
          feeTypeId: sourceFee.feeTypeId,
          name: sourceFee.feeTypeName,
        });
        continue;
      }
      if (sourceFee.paymentType === 'oneTime' && !dto.includeOneTimeFees) {
        oneTimeFees.set(sourceFee.feeTypeId, {
          feeTypeId: sourceFee.feeTypeId,
          name: sourceFee.feeTypeName,
          category: sourceFee.feeTypeCategory,
        });
        continue;
      }
      if (!isValidDateOnly(targetEnrollment.enrolledOn)) {
        if (!invalidStudents.has(student.id)) {
          validationErrors.push({
            studentId: student.id,
            studentName: student.name,
            error: 'Student has an invalid enrollment date',
          });
          invalidStudents.add(student.id);
        }
        continue;
      }
      if (targetEnrollment.enrolledOn > rangeEnd) {
        if (!invalidStudents.has(student.id)) {
          studentsNotEnrolled.push({
            studentId: student.id,
            name: student.name,
            reason: 'Enrollment date is after the target academic year end',
          });
          invalidStudents.add(student.id);
        }
        continue;
      }

      const existingFeeId = existingByStudentType.get(`${student.id}:${sourceFee.feeTypeId}`);
      if (existingFeeId) {
        duplicatesToSkip.push({
          studentId: student.id,
          feeTypeId: sourceFee.feeTypeId,
          existingFeeId,
        });
        continue;
      }

      try {
        const effectiveDate = resolveFeeEffectiveDate({
          requestedDate: null,
          enrollmentDate: targetEnrollment.enrolledOn,
          startMonth,
          endMonth,
          academicYear: dto.toYear,
        });
        const baseAmount = Number(sourceFee.feeTypeAmount);
        const discountAmount = dto.copyDiscounts ? Number(sourceFee.discountAmount || 0) : 0;
        const amounts = calculateFeeAmounts(
          sourceFee.paymentType,
          baseAmount,
          sourceFee.schedule || 'oneTime',
          discountAmount,
          { academicYear: dto.toYear, startMonth, endMonth, effectiveDate },
        );
        proposedFees.push({
          sourceFeeId: sourceFee.sourceFeeId,
          studentId: student.id,
          studentName: student.name,
          feeTypeId: sourceFee.feeTypeId,
          feeTypeName: sourceFee.feeTypeName,
          schedule: sourceFee.schedule || 'oneTime',
          baseAmount,
          discountAmount,
          discountReason: dto.copyDiscounts ? sourceFee.discountReason : null,
          notes: sourceFee.notes,
          effectiveDate,
          grossAmount: amounts.grossAmount,
          netAmount: amounts.netAmount,
        });
        projectedGrossCents += toCents(amounts.grossAmount);
        projectedNetCents += toCents(amounts.netAmount);
      } catch (error: any) {
        validationErrors.push({
          studentId: student.id,
          studentName: student.name,
          error: error?.message || 'Effective date resolution failed',
        });
      }
    }

    return {
      activeStudents: students.length,
      feeTypes: sourceFeeTypeIds.length,
      sourceFees: sourceFees.length,
      proposedFees: proposedFees.length,
      duplicatesToSkip: duplicatesToSkip.length,
      studentsNotEnrolled: studentsNotEnrolled.length,
      oneTimeFees: oneTimeFees.size,
      projectedGross: Number(fromCents(projectedGrossCents)),
      projectedNet: Number(fromCents(projectedNetCents)),
      rangeStart,
      rangeEnd,
      details: {
        studentsNotEnrolled,
        duplicatesToSkip,
        oneTimeFees: [...oneTimeFees.values()],
        inactiveFeeTypes: [...inactiveFeeTypes.values()],
        validationErrors,
        proposedFees,
      },
    };
  }

  @Transaction()
  async preview(dto: RolloverDto, actorId?: string) {
    await this.validateYears(dto);
    const payloadHash = hashPayload(dto);
    const existing = await this.rolloverRepository.getRunByIdempotencyKey(dto.idempotencyKey);
    if (existing) {
      this.validator.ensureIdempotentPayload(existing.payloadHash, payloadHash);
      return existing;
    }

    const preview = await this.buildPreview(dto);
    const run = await this.rolloverRepository.createRun({
      fromYear: dto.fromYear,
      toYear: dto.toYear,
      status: 'previewed',
      copyDiscounts: dto.copyDiscounts,
      includeOneTimeFees: dto.includeOneTimeFees,
      dryRun: true,
      payloadHash,
      idempotencyKey: dto.idempotencyKey,
      startedBy: actorId,
      totalStudents: preview.activeStudents,
      totalFees: preview.proposedFees,
      totalSkipped: preview.duplicatesToSkip,
      totalErrors: preview.details.validationErrors.length,
      preview,
    });
    await this.auditService.record({
      entityType: 'rollover', entityId: run.id, action: 'rollover.previewed',
      actorId, before: null, after: run, metadata: { payloadHash },
    });
    return run;
  }

  private async commitProposed(runId: string, proposed: ProposedFee, toYear: string, actorId?: string) {
    const newFee = await this.feeService.create({
      studentId: proposed.studentId,
      feeTypeId: proposed.feeTypeId,
      schedule: proposed.schedule as any,
      baseAmount: proposed.baseAmount,
      discountAmount: proposed.discountAmount,
      discountReason: proposed.discountReason ?? undefined,
      notes: proposed.notes ?? undefined,
      academicYear: toYear,
      effectiveDate: proposed.effectiveDate,
    } as any, actorId);
    await this.rolloverRepository.createRunItem({
      runId,
      studentId: proposed.studentId,
      feeTypeId: proposed.feeTypeId,
      feeId: newFee.id,
      status: 'success',
    });
    return newFee;
  }

  @Transaction()
  private async finalizeRun(input: {
    run: any;
    status: 'committed' | 'failed';
    successCount: number;
    skippedCount: number;
    errorCount: number;
    actorId?: string;
  }) {
    const completed = await this.rolloverRepository.completeRun(input.run.id, {
      status: input.status,
      totalFees: input.successCount,
      totalSkipped: input.skippedCount,
      totalErrors: input.errorCount,
    });
    await this.auditService.record({
      entityType: 'rollover',
      entityId: input.run.id,
      action: input.status === 'committed' ? 'rollover.committed' : 'rollover.failed',
      actorId: input.actorId,
      before: input.run,
      after: completed,
      metadata: {
        successCount: input.successCount,
        skippedCount: input.skippedCount,
        errorCount: input.errorCount,
        settingsUpdated: false,
      },
    });
    return completed;
  }

  /**
   * One transaction for the whole run. A crash or an unexpected error rolls
   * every fee back and leaves the run previewed, so a retry bills the year
   * once; a refused fee (4xx) rolls back only its own rows and is recorded.
   * The year lock makes a concurrent commit of the same run wait and then
   * return the committed run instead of writing it again.
   */
  @Transaction()
  async commit(dto: CommitRolloverDto, actorId?: string) {
    this.validator.ensureSeparateActivation(dto.confirmSettingsUpdate);
    await this.validateYears(dto);
    const payloadHash = hashPayload(dto);
    await this.rolloverRepository.lockTargetYear(dto.toYear);
    const existing = this.validator.ensureMatchingPreview(
      await this.rolloverRepository.getRunByIdempotencyKey(dto.idempotencyKey), dto.runId, payloadHash,
    );
    if (existing!.status === 'committed' || existing!.status === 'failed') {
      return this.getRun(existing!.id);
    }
    this.validator.ensureCommittable(existing);

    const preview = existing!.preview as any;
    this.validator.ensureProposedFees(preview);

    let successCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    for (const proposed of preview.details.proposedFees as ProposedFee[]) {
      try {
        await this.rolloverRepository.withinSavepoint(
          () => this.commitProposed(existing!.id, proposed, dto.toYear, actorId),
        );
        successCount++;
      } catch (error: any) {
        if (!Err.is4xx(error)) throw error;
        await this.rolloverRepository.createRunItem({
          runId: existing!.id,
          studentId: proposed.studentId,
          feeTypeId: proposed.feeTypeId,
          status: 'error',
          errorMessage: error?.message || 'Unknown rollover error',
        });
        errorCount++;
      }
    }
    for (const duplicate of preview.details.duplicatesToSkip ?? []) {
      await this.rolloverRepository.createRunItem({
        runId: existing!.id,
        studentId: duplicate.studentId,
        feeTypeId: duplicate.feeTypeId,
        feeId: duplicate.existingFeeId,
        status: 'skipped',
        reason: 'Existing fee in target year',
      });
      skippedCount++;
    }

    const status = errorCount === 0 ? 'committed' : 'failed';
    await this.finalizeRun({
      run: existing,
      status,
      successCount,
      skippedCount,
      errorCount,
      actorId,
    });
    return { runId: existing!.id, status, successCount, skippedCount, errorCount };
  }

  async getRun(id: string) {
    const run = this.validator.ensureRunExists(await this.rolloverRepository.getRunById(id));
    return { run, items: await this.rolloverRepository.listRunItems(id) };
  }
}
