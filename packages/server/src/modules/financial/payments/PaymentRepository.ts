import { Repository } from '../../../najm';
import { eq, desc, and, sql, count, isNotNull } from 'drizzle-orm';
import { fees, paymentAllocations, payments, students, users } from '../../../database/schema';
import { DB } from '../../../database/db';
import { alias } from 'drizzle-orm/pg-core';
import { formatDateOnly } from '../utils/dateOnly';
import { getBusinessDate } from '../../../shared/businessDate';
import { Year } from '../../academicYears/requestYear';
import type { ResolvedAcademicYear } from '../../academicYears/AcademicYearValidator';

@Repository()
export class PaymentRepository {
  @Year() private readonly year!: ResolvedAcademicYear;
  declare db: DB;

  // Receipt columns shared by the payment lists; the year list adds the part
  // of each receipt allocated to that year's fees.
  private paymentColumns() {
    const processorUsers = alias(users, 'processor_users');
    const studentUsers = alias(users, 'student_users');

    return {
      processorUsers,
      studentUsers,
      columns: {
        id: payments.id,
        studentId: payments.studentId,
        amount: payments.amount,
        paymentDate: payments.paymentDate,
        paymentMethod: payments.paymentMethod,
        checkNumber: payments.checkNumber,
        checkDueDate: payments.checkDueDate,
        checkBank: payments.checkBank,
        settledDate: payments.settledDate,
        statusChangedAt: payments.statusChangedAt,
        bouncedReason: payments.bouncedReason,
        voidReason: payments.voidReason,
        voidedAt: payments.voidedAt,
        voidedBy: payments.voidedBy,
        transactionRef: payments.transactionRef,
        receiptNumber: payments.receiptNumber,
        status: payments.status,
        processedBy: payments.processedBy,
        notes: payments.notes,
        createdAt: payments.createdAt,
        updatedAt: payments.updatedAt,
        processor: {
          id: processorUsers.id,
          email: processorUsers.email,
          image: processorUsers.image,
        },
        student: {
          id: students.id,
          name: students.name,
          studentCode: students.studentCode,
          image: studentUsers.image,
        },
      },
    };
  }

  private buildPaymentQuery() {
    const { processorUsers, studentUsers, columns } = this.paymentColumns();
    return this.db
      .select(columns)
      .from(payments)
      .leftJoin(processorUsers, eq(payments.processedBy, processorUsers.id))
      .leftJoin(students, eq(payments.studentId, students.id))
      .leftJoin(studentUsers, eq(students.userId, studentUsers.id));
  }

  // Each receipt with any allocation to a fee charged to the year, once.
  // `amount` stays the full receipt; `yearAllocatedAmount` is the exact part
  // allocated to that year's fees, whatever the receipt's status. Unallocated
  // credit belongs to no year.
  private async listAllocatedReceipts(feeId?: string) {
    const yearAllocations = this.db
      .select({
        paymentId: paymentAllocations.paymentId,
        amount: sql<string>`sum(${paymentAllocations.amount})::text`.as('year_allocated_amount'),
      })
      .from(paymentAllocations)
      .innerJoin(fees, eq(paymentAllocations.feeId, fees.id))
      .where(and(eq(fees.academicYear, this.year.label), feeId ? eq(fees.id, feeId) : undefined))
      .groupBy(paymentAllocations.paymentId)
      .as('year_allocations');
    const { processorUsers, studentUsers, columns } = this.paymentColumns();

    return await this.db
      .select({ ...columns, yearAllocatedAmount: yearAllocations.amount })
      .from(payments)
      .innerJoin(yearAllocations, eq(yearAllocations.paymentId, payments.id))
      .leftJoin(processorUsers, eq(payments.processedBy, processorUsers.id))
      .leftJoin(students, eq(payments.studentId, students.id))
      .leftJoin(studentUsers, eq(students.userId, studentUsers.id))
      .orderBy(desc(payments.paymentDate));
  }

  async getAll() {
    return this.listAllocatedReceipts();
  }

  async getByFeeId(feeId: string) {
    return this.listAllocatedReceipts(feeId);
  }

  async getById(id) {
    const [payment] = await this.buildPaymentQuery()
      .where(eq(payments.id, id))
      .limit(1);

    return payment;
  }

  async getByIdForUpdate(id: string) {
    const [payment] = await this.db
      .select()
      .from(payments)
      .where(eq(payments.id, id))
      .limit(1)
      .for('update');
    return payment || null;
  }

  async getByStudent(studentId) {
    return await this.buildPaymentQuery()
      .where(eq(payments.studentId, studentId))
      .orderBy(desc(payments.paymentDate));
  }

  async getByIdempotencyKey(key: string) {
    const [payment] = await this.db
      .select()
      .from(payments)
      .where(and(eq(payments.idempotencyKey, key), isNotNull(payments.idempotencyKey)))
      .limit(1);
    return payment || null;
  }

  async getTodayPayments() {
    const today = formatDateOnly(getBusinessDate()) as string;
    return await this.buildPaymentQuery()
      .where(
        and(
          sql`COALESCE(${payments.settledDate}, ${payments.paymentDate}) = ${today}`,
          eq(payments.status, 'completed')
        )
      )
      .orderBy(desc(payments.paymentDate));
  }

  async getTodayPaymentsTotal() {
    const today = formatDateOnly(getBusinessDate()) as string;
    const [result] = await this.db
      .select({
        total: sql<number>`COALESCE(SUM(${payments.amount}::numeric), 0)`,
        count: count(payments.id),
      })
      .from(payments)
      .where(
        and(
          sql`COALESCE(${payments.settledDate}, ${payments.paymentDate}) = ${today}`,
          eq(payments.status, 'completed')
        )
      );
    return { total: Number(result.total), count: result.count };
  }

  async getThisMonthPayments() {
    const now = getBusinessDate();
    const startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const endDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${lastDay}`;
    return await this.buildPaymentQuery()
      .where(
        and(
          sql`COALESCE(${payments.settledDate}, ${payments.paymentDate}) >= ${startDate}`,
          sql`COALESCE(${payments.settledDate}, ${payments.paymentDate}) <= ${endDate}`,
          eq(payments.status, 'completed')
        )
      )
      .orderBy(desc(payments.paymentDate));
  }

  async getThisMonthPaymentsTotal() {
    const now = getBusinessDate();
    const startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const endDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${lastDay}`;
    const [result] = await this.db
      .select({
        total: sql<number>`COALESCE(SUM(${payments.amount}::numeric), 0)`,
        count: count(payments.id),
      })
      .from(payments)
      .where(
        and(
          sql`COALESCE(${payments.settledDate}, ${payments.paymentDate}) >= ${startDate}`,
          sql`COALESCE(${payments.settledDate}, ${payments.paymentDate}) <= ${endDate}`,
          eq(payments.status, 'completed')
        )
      );
    return { total: Number(result.total), count: result.count };
  }

  async getThisWeekPayments() {
    const now = getBusinessDate();
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const startDate = formatDateOnly(monday) as string;
    const endDate = formatDateOnly(sunday) as string;
    return await this.buildPaymentQuery()
      .where(
        and(
          sql`COALESCE(${payments.settledDate}, ${payments.paymentDate}) >= ${startDate}`,
          sql`COALESCE(${payments.settledDate}, ${payments.paymentDate}) <= ${endDate}`,
          eq(payments.status, 'completed')
        )
      )
      .orderBy(desc(payments.paymentDate));
  }

  async getThisWeekPaymentsTotal() {
    const now = getBusinessDate();
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const startDate = formatDateOnly(monday) as string;
    const endDate = formatDateOnly(sunday) as string;
    const [result] = await this.db
      .select({
        total: sql<number>`COALESCE(SUM(${payments.amount}::numeric), 0)`,
        count: count(payments.id),
      })
      .from(payments)
      .where(
        and(
          sql`COALESCE(${payments.settledDate}, ${payments.paymentDate}) >= ${startDate}`,
          sql`COALESCE(${payments.settledDate}, ${payments.paymentDate}) <= ${endDate}`,
          eq(payments.status, 'completed')
        )
      );
    return { total: Number(result.total), count: result.count };
  }

  async getByReceiptNumber(receiptNumber) {
    const [payment] = await this.buildPaymentQuery()
      .where(eq(payments.receiptNumber, receiptNumber))
      .limit(1);

    return payment;
  }

  async getRecentPayments(limit = 10) {
    return await this.buildPaymentQuery()
      .orderBy(desc(payments.paymentDate))
      .limit(limit);
  }

  async getPaymentStats() {
    const [stats] = await this.db
      .select({
        totalPayments: count(payments.id),
        completedPayments: sql<number>`COUNT(CASE WHEN ${payments.status} = 'completed' THEN 1 END)`,
        pendingPayments: sql<number>`COUNT(CASE WHEN ${payments.status} = 'pending' THEN 1 END)`,
        failedPayments: sql<number>`COUNT(CASE WHEN ${payments.status} = 'failed' THEN 1 END)`,
        refundedPayments: sql<number>`COUNT(CASE WHEN ${payments.status} = 'refunded' THEN 1 END)`,
      })
      .from(payments);

    return {
      totalPayments: Number(stats.totalPayments) || 0,
      completedPayments: Number(stats.completedPayments) || 0,
      pendingPayments: Number(stats.pendingPayments) || 0,
      failedPayments: Number(stats.failedPayments) || 0,
      refundedPayments: Number(stats.refundedPayments) || 0,
    };
  }

  async getPendingChecks() {
    return await this.buildPaymentQuery()
      .where(
        and(
          eq(payments.paymentMethod, 'check'),
          sql`${payments.status} IN ('pending', 'deposited')`
        )
      )
      .orderBy(payments.checkDueDate);
  }

  async getOverdueChecks() {
    const today = formatDateOnly(getBusinessDate()) as string;

    return await this.buildPaymentQuery()
      .where(
        and(
          eq(payments.paymentMethod, 'check'),
          sql`${payments.status} IN ('pending', 'deposited')`,
          sql`${payments.checkDueDate} < ${today}`
        )
      )
      .orderBy(payments.checkDueDate);
  }

  async create(data) {
    const [newPayment] = await this.db
      .insert(payments)
      .values(data)
      .returning();
    return newPayment;
  }

  async update(id, data) {
    const [updatedPayment] = await this.db
      .update(payments)
      .set(data)
      .where(eq(payments.id, id))
      .returning();
    return updatedPayment;
  }

  async delete(id) {
    const [deletedPayment] = await this.db
      .delete(payments)
      .where(eq(payments.id, id))
      .returning();
    return deletedPayment;
  }

  async clearForSeedReset() {
    return await this.db.delete(payments).returning();
  }
}
