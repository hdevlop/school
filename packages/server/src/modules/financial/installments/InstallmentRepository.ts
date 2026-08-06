import { Repository } from '@server/najm';
import { eq, and, or, sql, sum, inArray, ne } from 'drizzle-orm';
import { feeInstallments, paymentAllocations, payments, fees } from '@server/database/schema';
import { DB } from '@server/database/db';
import { formatDateOnly } from '../utils/dateOnly';
import { getBusinessDate } from '@server/shared/businessDate';

@Repository()
export class InstallmentRepository {
  declare db: DB;

  private buildInstallmentQuery() {
    return this.db
      .select({
        id: feeInstallments.id,
        feeId: feeInstallments.feeId,
        number: feeInstallments.number,
        dueDate: feeInstallments.dueDate,
        amount: feeInstallments.amount,
        paidAmount: feeInstallments.paidAmount,
        status: feeInstallments.status,
        createdAt: feeInstallments.createdAt,
        updatedAt: feeInstallments.updatedAt,
      })
      .from(feeInstallments);
  }

  async getById(id) {
    const [installment] = await this.buildInstallmentQuery()
      .where(eq(feeInstallments.id, id))
      .limit(1);

    return installment;
  }

  async getByFeeId(feeId) {
    return await this.buildInstallmentQuery()
      .where(eq(feeInstallments.feeId, feeId))
      .orderBy(feeInstallments.number);
  }

  async getByStudentForAutoAllocation(studentId: string) {
    return await this.db
      .select({
        id: feeInstallments.id,
        feeId: feeInstallments.feeId,
        number: feeInstallments.number,
        dueDate: feeInstallments.dueDate,
        amount: feeInstallments.amount,
        paidAmount: feeInstallments.paidAmount,
        status: feeInstallments.status,
      })
      .from(feeInstallments)
      .innerJoin(fees, eq(feeInstallments.feeId, fees.id))
      .where(and(eq(fees.studentId, studentId), ne(feeInstallments.status, 'cancelled')))
      .orderBy(
        sql`${feeInstallments.dueDate} ASC`,
        sql`${feeInstallments.number} ASC`,
        sql`${feeInstallments.feeId} ASC`,
      );
  }

  async getByStudentForAutoAllocationForUpdate(studentId: string) {
    const result = await this.db.execute<{
      id: string;
      fee_id: string;
      number: number;
      due_date: string;
      amount: string;
      paid_amount: string;
      status: string;
    }>(sql`
      SELECT i.id, i.fee_id, i.number, i.due_date, i.amount, i.paid_amount, i.status
      FROM ${feeInstallments} i
      INNER JOIN ${fees} f ON i.fee_id = f.id
      WHERE f.student_id = ${studentId}
      AND i.status != 'cancelled'
      ORDER BY i.due_date ASC, i.number ASC, i.fee_id ASC
      FOR UPDATE OF i
    `);
    const rows = (result as any).rows ?? result;
    return (rows as any[]).map((row) => ({
      id: row.id,
      feeId: row.fee_id,
      number: row.number,
      dueDate: row.due_date,
      amount: row.amount,
      paidAmount: row.paid_amount,
      status: row.status,
    }));
  }

  async getAll() {
    return await this.buildInstallmentQuery()
      .orderBy(feeInstallments.number);
  }

  async getOverdue() {
    const today = formatDateOnly(getBusinessDate()) as string;

    return await this.buildInstallmentQuery()
      .where(
        or(
          eq(feeInstallments.status, 'overdue'),
          and(
            inArray(feeInstallments.status, ['pending', 'partiallyPaid']),
            sql`${feeInstallments.dueDate} < ${today}`
          )
        )
      )
      .orderBy(feeInstallments.dueDate);
  }

  async getPending() {
    return await this.buildInstallmentQuery()
      .where(eq(feeInstallments.status, 'pending'))
      .orderBy(feeInstallments.dueDate);
  }

  async getPaid() {
    return await this.buildInstallmentQuery()
      .where(eq(feeInstallments.status, 'paid'))
      .orderBy(feeInstallments.dueDate);
  }

  async getAllocatedTotal(installmentId) {
    const [result] = await this.db
      .select({
        total: sum(paymentAllocations.amount)
      })
      .from(paymentAllocations)
      .leftJoin(payments, eq(paymentAllocations.paymentId, payments.id))
      .where(
        and(
          eq(paymentAllocations.installmentId, installmentId),
          eq(payments.status, 'completed')
        )
      );

    return Number(result?.total || 0);
  }

  async getByFeeAndNumbersForUpdate(
    targets: Array<{ feeId: string; number: number }>,
  ): Promise<Array<{
    id: string;
    feeId: string;
    number: number;
    amount: string;
    paidAmount: string;
    status: string;
    dueDate: string;
  }>> {
    if (!targets || targets.length === 0) return [];

    const sorted = [...targets].sort((a, b) =>
      a.feeId.localeCompare(b.feeId) || a.number - b.number
    );

    const tupleValues = sorted
      .map((t) => sql`(${t.feeId}::text, ${t.number}::int)`)
      .reduce<any>((acc, cur, idx) => (idx === 0 ? cur : sql`${acc}, ${cur}`), sql``);

    const result = await this.db.execute<{
      id: string;
      fee_id: string;
      number: number;
      amount: string;
      paid_amount: string;
      status: string;
      due_date: string;
    }>(sql`
      SELECT id, fee_id, number, amount, paid_amount, status, due_date
      FROM ${feeInstallments}
      WHERE (fee_id, number) IN (${tupleValues})
      ORDER BY fee_id, number
      FOR UPDATE
    `);

    const rows = (result as any).rows ?? result;
    return (rows as any[]).map((row) => ({
      id: row.id,
      feeId: row.fee_id,
      number: row.number,
      amount: row.amount,
      paidAmount: row.paid_amount,
      status: row.status,
      dueDate: row.due_date,
    }));
  }

  async create(data) {
    const [newInstallment] = await this.db
      .insert(feeInstallments)
      .values(data)
      .returning();
    return newInstallment;
  }

  async createBulk(installmentsData) {
    return await this.db
      .insert(feeInstallments)
      .values(installmentsData)
      .returning();
  }

  async update(id, data) {
    const [updatedInstallment] = await this.db
      .update(feeInstallments)
      .set(data)
      .where(eq(feeInstallments.id, id))
      .returning();
    return updatedInstallment;
  }

  async delete(id) {
    const [deletedInstallment] = await this.db
      .delete(feeInstallments)
      .where(eq(feeInstallments.id, id))
      .returning();
    return deletedInstallment;
  }

  async deleteByFeeId(feeId) {
    return await this.db
      .delete(feeInstallments)
      .where(eq(feeInstallments.feeId, feeId))
      .returning();
  }

  async cancelFutureUnpaidByFeeId(feeId: string, effectiveDate: string) {
    return await this.db
      .update(feeInstallments)
      .set({ status: 'cancelled' })
      .where(and(
        eq(feeInstallments.feeId, feeId),
        sql`${feeInstallments.dueDate} > ${effectiveDate}`,
        inArray(feeInstallments.status, ['pending', 'overdue']),
        sql`COALESCE(${feeInstallments.paidAmount}::numeric, 0) = 0`,
        sql`NOT EXISTS (
          SELECT 1
          FROM ${paymentAllocations} allocation
          INNER JOIN ${payments} payment ON payment.id = allocation.payment_id
          WHERE allocation.installment_id = ${feeInstallments.id}
          AND payment.status IN ('completed', 'pending', 'deposited')
        )`,
      ))
      .returning();
  }

  async resumeCancelledByFeeId(feeId: string, effectiveDate: string) {
    return await this.db
      .update(feeInstallments)
      .set({
        status: sql`CASE
          WHEN ${feeInstallments.dueDate} < CURRENT_DATE THEN 'overdue'::"feeInstallmentStatus"
          ELSE 'pending'::"feeInstallmentStatus"
        END`,
      })
      .where(and(
        eq(feeInstallments.feeId, feeId),
        eq(feeInstallments.status, 'cancelled'),
        sql`${feeInstallments.dueDate} >= ${effectiveDate}`,
      ))
      .returning();
  }

  async deleteAll() {
    const deletedInstallments = await this.db
      .delete(feeInstallments)
      .returning();

    return {
      deletedCount: deletedInstallments.length,
      deletedInstallments
    };
  }
}
