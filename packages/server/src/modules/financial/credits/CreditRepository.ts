import { Repository } from '@server/najm';
import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { studentCreditLots, studentCreditApplications, paymentAllocations } from '@server/database/schema';
import { DB } from '@server/database/db';

@Repository()
export class CreditRepository {
  declare db: DB;

  async createLot(data: {
    studentId: string;
    sourcePaymentId: string;
    originalAmount: number;
    remainingAmount: number;
    status: string;
  }) {
    const [row] = await this.db
      .insert(studentCreditLots)
      .values({
        studentId: data.studentId,
        sourcePaymentId: data.sourcePaymentId,
        originalAmount: String(data.originalAmount),
        remainingAmount: String(data.remainingAmount),
        status: data.status,
      })
      .returning();
    return row;
  }

  async getLotBySourcePaymentId(sourcePaymentId: string) {
    const [row] = await this.db
      .select()
      .from(studentCreditLots)
      .where(eq(studentCreditLots.sourcePaymentId, sourcePaymentId))
      .limit(1);
    return row || null;
  }

  async listLotsForStudent(studentId: string) {
    return await this.db
      .select()
      .from(studentCreditLots)
      .where(eq(studentCreditLots.studentId, studentId))
      .orderBy(asc(studentCreditLots.createdAt));
  }

  async listAvailableLotsForUpdate(studentId: string) {
    const result = await this.db.execute<{
      id: string;
      student_id: string;
      source_payment_id: string;
      original_amount: string;
      remaining_amount: string;
      status: string;
    }>(sql`
      SELECT * FROM ${studentCreditLots}
      WHERE student_id = ${studentId} AND status = 'available' AND remaining_amount > 0
      ORDER BY created_at ASC, id ASC
      FOR UPDATE
    `);
    const rows = (result as any).rows ?? result;
    return (rows as any[]).map((row) => ({
      id: row.id,
      studentId: row.student_id,
      sourcePaymentId: row.source_payment_id,
      originalAmount: row.original_amount,
      remainingAmount: row.remaining_amount,
      status: row.status,
    }));
  }

  async updateLot(id: string, data: { remainingAmount?: number; status?: string }) {
    const update: Record<string, any> = {};
    if (data.remainingAmount !== undefined) {
      update.remainingAmount = String(data.remainingAmount);
    }
    if (data.status !== undefined) {
      update.status = data.status;
    }
    const [row] = await this.db
      .update(studentCreditLots)
      .set(update)
      .where(eq(studentCreditLots.id, id))
      .returning();
    return row;
  }

  async cancelLotsBySourcePayment(sourcePaymentId: string) {
    return await this.db
      .update(studentCreditLots)
      .set({ status: 'cancelled' })
      .where(eq(studentCreditLots.sourcePaymentId, sourcePaymentId))
      .returning();
  }

  async activatePendingLotBySourcePayment(sourcePaymentId: string) {
    const [row] = await this.db
      .update(studentCreditLots)
      .set({ status: 'available' })
      .where(
        and(
          eq(studentCreditLots.sourcePaymentId, sourcePaymentId),
          eq(studentCreditLots.status, 'pending'),
        ),
      )
      .returning();
    return row || null;
  }

  async createApplication(data: {
    creditLotId: string;
    feeId: string;
    installmentId: string;
    paymentAllocationId: string;
    amount: number;
    status: string;
    appliedBy?: string | null;
  }) {
    const [row] = await this.db
      .insert(studentCreditApplications)
      .values({
        creditLotId: data.creditLotId,
        feeId: data.feeId,
        installmentId: data.installmentId,
        paymentAllocationId: data.paymentAllocationId,
        amount: String(data.amount),
        status: data.status,
        appliedBy: data.appliedBy ?? null,
      })
      .returning();
    return row;
  }

  async reverseApplicationsByPayment(sourcePaymentId: string) {
    const ids = await this.db
      .select({ id: paymentAllocations.id })
      .from(paymentAllocations)
      .where(eq(paymentAllocations.paymentId, sourcePaymentId));
    const allocationIds = ids.map((r) => r.id);

    return await this.db
      .update(studentCreditApplications)
      .set({ status: 'reversed', reversedAt: sql`NOW()` })
      .where(
        and(
          allocationIds.length > 0
            ? inArray(studentCreditApplications.paymentAllocationId, allocationIds)
            : sql`FALSE`,
          eq(studentCreditApplications.status, 'active'),
        ),
      )
      .returning();
  }
}
