import { createHash } from 'crypto';
import { Err, Service, Transaction } from '@server/najm';
import { RolloverRepository } from './RolloverRepository';
import { FeeService } from '../fees/FeeService';
import { SettingsRepository } from '../../settings/SettingsRepository';
import { FinancialAuditService } from '../auditLog/FinancialAuditService';
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
  constructor(
    private rolloverRepository: RolloverRepository,
    private feeService: FeeService,
    private settingsRepository: SettingsRepository,
    private auditService: FinancialAuditService,
  ) { }

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
    const students = await this.rolloverRepository.getActiveStudents(dto.classIds);
    const studentIds = students.map((student) => student.id);
    const studentMap = new Map(students.map((student) => [student.id, student]));
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
      if (!isValidDateOnly(student.enrollmentDate)) {
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
      if (student.enrollmentDate > rangeEnd) {
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
          enrollmentDate: student.enrollmentDate,
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
    const payloadHash = hashPayload(dto);
    const existing = await this.rolloverRepository.getRunByIdempotencyKey(dto.idempotencyKey);
    if (existing) {
      if (existing.payloadHash !== payloadHash) {
        Err(409, 'This rollover idempotency key was already used with a different payload');
      }
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

  @Transaction()
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
    updateSettings: boolean;
    toYear: string;
  }) {
    const completed = await this.rolloverRepository.completeRun(input.run.id, {
      status: input.status,
      totalFees: input.successCount,
      totalSkipped: input.skippedCount,
      totalErrors: input.errorCount,
    });
    if (input.status === 'committed' && input.updateSettings) {
      const settings = await this.settingsRepository.getAdminSettings();
      if (settings) await this.settingsRepository.update(settings.id, { currentAcademicYear: input.toYear });
    }
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
        settingsUpdated: input.status === 'committed' && input.updateSettings,
      },
    });
    return completed;
  }

  async commit(dto: CommitRolloverDto, actorId?: string) {
    const payloadHash = hashPayload(dto);
    const existing = await this.rolloverRepository.getRunByIdempotencyKey(dto.idempotencyKey);
    if (!existing) Err(400, 'No preview exists for this idempotency key');
    if (existing!.id !== dto.runId) Err(409, 'runId does not match the preview idempotency key');
    if (existing!.payloadHash !== payloadHash) Err(409, 'Rollover payload does not match the preview');
    if (existing!.status === 'committed' || existing!.status === 'failed') {
      return this.getRun(existing!.id);
    }
    if (!existing!.dryRun || existing!.status !== 'previewed') {
      Err(409, `Cannot commit a run in status ${existing!.status}`);
    }

    const preview = existing!.preview as any;
    if (!Array.isArray(preview?.details?.proposedFees)) {
      Err(500, 'Preview payload is missing proposed fees');
    }

    let successCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    for (const proposed of preview.details.proposedFees as ProposedFee[]) {
      try {
        await this.commitProposed(existing!.id, proposed, dto.toYear, actorId);
        successCount++;
      } catch (error: any) {
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
      updateSettings: dto.confirmSettingsUpdate,
      toYear: dto.toYear,
    });
    return { runId: existing!.id, status, successCount, skippedCount, errorCount };
  }

  async getRun(id: string) {
    const run = await this.rolloverRepository.getRunById(id);
    if (!run) Err(404, 'Rollover run not found');
    return { run, items: await this.rolloverRepository.listRunItems(id) };
  }
}
