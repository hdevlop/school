import { Repository } from '@server/najm';
import { and, eq, inArray } from 'drizzle-orm';
import { rolloverRuns, rolloverRunItems, students, fees, feeTypes } from '@server/database/schema';
import { DB } from '@server/database/db';

@Repository()
export class RolloverRepository {
  declare db: DB;

  async getActiveStudents(classIds?: string[]) {
    const conditions = [eq(students.status, 'active')];
    if (classIds?.length) conditions.push(inArray(students.classId, classIds));
    return await this.db
      .select({
        id: students.id,
        name: students.name,
        classId: students.classId,
        enrollmentDate: students.enrollmentDate,
        status: students.status,
      })
      .from(students)
      .where(and(...conditions));
  }

  async getExistingFeeIdsForYear(studentIds: string[], academicYear: string, feeTypeIds?: string[]) {
    const conditions = [
      inArray(fees.studentId, studentIds),
      eq(fees.academicYear, academicYear),
    ];
    if (feeTypeIds && feeTypeIds.length > 0) {
      conditions.push(inArray(fees.feeTypeId, feeTypeIds));
    }
    return await this.db
      .select({
        studentId: fees.studentId,
        feeTypeId: fees.feeTypeId,
        id: fees.id,
      })
      .from(fees)
      .where(and(...conditions));
  }

  async getActiveFeeTypes(feeTypeIds?: string[]) {
    const conditions = [eq(feeTypes.status, 'active')];
    if (feeTypeIds && feeTypeIds.length > 0) {
      conditions.push(inArray(feeTypes.id, feeTypeIds));
    }
    return await this.db
      .select()
      .from(feeTypes)
      .where(and(...conditions));
  }

  async getSourceFeesForRollover(fromYear: string, studentIds: string[], feeTypeIds?: string[]) {
    if (studentIds.length === 0) return [];
    const conditions = [
      eq(fees.academicYear, fromYear),
      inArray(fees.studentId, studentIds),
    ];
    if (feeTypeIds?.length) conditions.push(inArray(fees.feeTypeId, feeTypeIds));
    return await this.db
      .select({
        sourceFeeId: fees.id,
        studentId: fees.studentId,
        feeTypeId: fees.feeTypeId,
        schedule: fees.schedule,
        sourceBaseAmount: fees.baseAmount,
        discountAmount: fees.discountAmount,
        discountReason: fees.discountReason,
        notes: fees.notes,
        feeTypeName: feeTypes.name,
        feeTypeCategory: feeTypes.category,
        feeTypeAmount: feeTypes.amount,
        paymentType: feeTypes.paymentType,
        feeTypeStatus: feeTypes.status,
      })
      .from(fees)
      .innerJoin(feeTypes, eq(fees.feeTypeId, feeTypes.id))
      .where(and(...conditions));
  }

  async createRun(data: {
    fromYear: string;
    toYear: string;
    status: 'pending' | 'previewed' | 'committed' | 'failed' | 'cancelled';
    copyDiscounts: boolean;
    includeOneTimeFees: boolean;
    dryRun: boolean;
    payloadHash: string;
    idempotencyKey: string;
    startedBy?: string | null;
    totalStudents: number;
    totalFees: number;
    totalSkipped: number;
    totalErrors: number;
    preview: any;
  }) {
    const [row] = await this.db
      .insert(rolloverRuns)
      .values({
        fromYear: data.fromYear,
        toYear: data.toYear,
        status: data.status,
        copyDiscounts: data.copyDiscounts,
        includeOneTimeFees: data.includeOneTimeFees,
        dryRun: data.dryRun,
        payloadHash: data.payloadHash,
        idempotencyKey: data.idempotencyKey,
        startedBy: data.startedBy ?? null,
        totalStudents: data.totalStudents,
        totalFees: data.totalFees,
        totalSkipped: data.totalSkipped,
        totalErrors: data.totalErrors,
        preview: data.preview,
      })
      .returning();
    return row;
  }

  async updateRunStatus(id: string, status: 'pending' | 'previewed' | 'committed' | 'failed' | 'cancelled', completedAt?: Date) {
    const [row] = await this.db
      .update(rolloverRuns)
      .set({ status, completedAt: completedAt ?? null })
      .where(eq(rolloverRuns.id, id))
      .returning();
    return row;
  }

  async completeRun(id: string, input: {
    status: 'committed' | 'failed';
    totalFees: number;
    totalSkipped: number;
    totalErrors: number;
  }) {
    const [row] = await this.db
      .update(rolloverRuns)
      .set({
        status: input.status,
        dryRun: false,
        totalFees: input.totalFees,
        totalSkipped: input.totalSkipped,
        totalErrors: input.totalErrors,
        committedAt: input.status === 'committed' ? new Date() : null,
        completedAt: new Date(),
      })
      .where(eq(rolloverRuns.id, id))
      .returning();
    return row;
  }

  async getRunByIdempotencyKey(key: string) {
    const [row] = await this.db
      .select()
      .from(rolloverRuns)
      .where(eq(rolloverRuns.idempotencyKey, key))
      .limit(1);
    return row || null;
  }

  async getRunById(id: string) {
    const [row] = await this.db
      .select()
      .from(rolloverRuns)
      .where(eq(rolloverRuns.id, id))
      .limit(1);
    return row || null;
  }

  async createRunItem(data: {
    runId: string;
    studentId: string;
    feeTypeId: string;
    feeId?: string | null;
    status: string;
    reason?: string | null;
    errorMessage?: string | null;
  }) {
    const [row] = await this.db
      .insert(rolloverRunItems)
      .values({
        runId: data.runId,
        studentId: data.studentId,
        feeTypeId: data.feeTypeId,
        feeId: data.feeId ?? null,
        status: data.status,
        reason: data.reason ?? null,
        errorMessage: data.errorMessage ?? null,
      })
      .returning();
    return row;
  }

  async listRunItems(runId: string) {
    return await this.db
      .select()
      .from(rolloverRunItems)
      .where(eq(rolloverRunItems.runId, runId));
  }

}
