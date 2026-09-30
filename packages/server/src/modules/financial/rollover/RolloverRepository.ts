import { Repository } from '../../../najm';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { rolloverRuns, rolloverRunItems, students, fees, feeTypes, studentEnrollments, academicYears, studentEnrollmentPlacements } from '../../../database/schema';
import { DB } from '../../../database/db';

@Repository()
export class RolloverRepository {
  declare db: DB;

  /**
   * Serializes rollover commits into one target year until the surrounding
   * transaction ends: a second commit of the same run waits, then reads it as
   * committed, and two runs into one year never interleave their fee writes.
   */
  async lockTargetYear(toYear: string) {
    await this.db.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`rollover:${toYear}`}))`);
  }

  /**
   * Runs one fee's writes inside a savepoint of the surrounding transaction, so
   * a refused fee leaves none of its rows while the rest of the run continues.
   * Najm's nested `@Transaction` joins the outer transaction without one.
   */
  async withinSavepoint<T>(write: () => Promise<T>): Promise<T> {
    await this.db.execute(sql`SAVEPOINT rollover_item`);
    try {
      const result = await write();
      await this.db.execute(sql`RELEASE SAVEPOINT rollover_item`);
      return result;
    } catch (error) {
      await this.db.execute(sql`ROLLBACK TO SAVEPOINT rollover_item`);
      throw error;
    }
  }

  async clearForSeedReset() {
    await this.db.delete(rolloverRunItems);
    await this.db.delete(rolloverRuns);
  }

  async getActiveStudents(fromYear: string, classIds?: string[]) {
    const conditions = [eq(students.status, 'active'), eq(academicYears.label, fromYear)];
    if (classIds?.length) {
      conditions.push(inArray(studentEnrollmentPlacements.classId, classIds));
    }
    return await this.db
      .selectDistinct({
        id: students.id,
        name: students.name,
        enrollmentDate: studentEnrollments.enrolledOn,
        status: students.status,
      })
      .from(students)
      .innerJoin(studentEnrollments, eq(studentEnrollments.studentId, students.id))
      .innerJoin(academicYears, eq(studentEnrollments.academicYearId, academicYears.id))
      .leftJoin(studentEnrollmentPlacements, eq(studentEnrollmentPlacements.enrollmentId, studentEnrollments.id))
      .where(and(...conditions));
  }

  async getTargetEnrollments(toYear: string, studentIds: string[]) {
    if (studentIds.length === 0) return [];
    return this.db.select({
      studentId: studentEnrollments.studentId,
      enrolledOn: studentEnrollments.enrolledOn,
      leftOn: studentEnrollments.leftOn,
      status: studentEnrollments.status,
    }).from(studentEnrollments)
      .innerJoin(academicYears, eq(studentEnrollments.academicYearId, academicYears.id))
      .where(and(eq(academicYears.label, toYear), inArray(studentEnrollments.studentId, studentIds)));
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
