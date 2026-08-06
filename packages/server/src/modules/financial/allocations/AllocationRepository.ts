import { Repository } from '@server/najm';
import { eq, desc, and, sum, sql, inArray, count } from 'drizzle-orm';
import { paymentAllocations, payments, fees, feeInstallments, students } from '@server/database/schema';
import { DB } from '@server/database/db';
import { alias } from 'drizzle-orm/pg-core';

export const ACTIVE_RESERVATION_STATUSES = ['pending', 'deposited'] as const;

@Repository()
export class AllocationRepository {
  declare db: DB;

  private typeAllocationInsert(data: Partial<typeof paymentAllocations.$inferInsert>) {
    return data as typeof paymentAllocations.$inferInsert;
  }

  private buildAllocationQuery() {
    return this.db
      .select({
        id: paymentAllocations.id,
        paymentId: paymentAllocations.paymentId,
        feeId: paymentAllocations.feeId,
        installmentId: paymentAllocations.installmentId,
        amount: paymentAllocations.amount,
        type: paymentAllocations.type,
        notes: paymentAllocations.notes,
        createdAt: paymentAllocations.createdAt,
        updatedAt: paymentAllocations.updatedAt,
        payment: {
          id: payments.id,
          receiptNumber: payments.receiptNumber,
          amount: payments.amount,
          paymentDate: payments.paymentDate,
          paymentMethod: payments.paymentMethod,
          status: payments.status,
        },
        fee: {
          id: fees.id,
          studentId: fees.studentId,
          academicYear: fees.academicYear,
          netAmount: fees.netAmount,
          paidAmount: fees.paidAmount,
          status: fees.status,
        },
        installment: {
          id: feeInstallments.id,
          number: feeInstallments.number,
          dueDate: feeInstallments.dueDate,
          amount: feeInstallments.amount,
          status: feeInstallments.status,
        },
      })
      .from(paymentAllocations)
      .leftJoin(payments, eq(paymentAllocations.paymentId, payments.id))
      .leftJoin(fees, eq(paymentAllocations.feeId, fees.id))
      .leftJoin(feeInstallments, eq(paymentAllocations.installmentId, feeInstallments.id));
  }

  async getById(id: string) {
    const [allocation] = await this.buildAllocationQuery()
      .where(eq(paymentAllocations.id, id))
      .limit(1);

    return allocation;
  }

  async getAll() {
    return await this.buildAllocationQuery()
      .orderBy(desc(paymentAllocations.createdAt));
  }

  async getByPaymentId(paymentId: string) {
    return await this.buildAllocationQuery()
      .where(eq(paymentAllocations.paymentId, paymentId))
      .orderBy(paymentAllocations.createdAt);
  }

  async getByFeeId(feeId: string) {
    return await this.buildAllocationQuery()
      .where(eq(paymentAllocations.feeId, feeId))
      .orderBy(desc(paymentAllocations.createdAt));
  }

  async getByInstallmentId(installmentId: string) {
    return await this.buildAllocationQuery()
      .where(eq(paymentAllocations.installmentId, installmentId))
      .orderBy(desc(paymentAllocations.createdAt));
  }

  async getByStudentId(studentId: string) {
    return await this.db
      .select({
        id: paymentAllocations.id,
        paymentId: paymentAllocations.paymentId,
        feeId: paymentAllocations.feeId,
        installmentId: paymentAllocations.installmentId,
        amount: paymentAllocations.amount,
        type: paymentAllocations.type,
        notes: paymentAllocations.notes,
        createdAt: paymentAllocations.createdAt,
        payment: {
          receiptNumber: payments.receiptNumber,
          paymentDate: payments.paymentDate,
          paymentMethod: payments.paymentMethod,
        },
        student: {
          id: students.id,
          name: students.name,
          studentCode: students.studentCode,
        },
      })
      .from(paymentAllocations)
      .leftJoin(payments, eq(paymentAllocations.paymentId, payments.id))
      .leftJoin(fees, eq(paymentAllocations.feeId, fees.id))
      .leftJoin(students, eq(fees.studentId, students.id))
      .where(eq(fees.studentId, studentId))
      .orderBy(desc(paymentAllocations.createdAt));
  }

  async getTotalAllocatedForPayment(paymentId: string) {
    const [result] = await this.db
      .select({
        total: sum(paymentAllocations.amount),
      })
      .from(paymentAllocations)
      .where(eq(paymentAllocations.paymentId, paymentId));

    return Number(result?.total) || 0;
  }

  async getTotalAllocatedForFee(feeId: string) {
    const [result] = await this.db
      .select({
        total: sum(paymentAllocations.amount),
      })
      .from(paymentAllocations)
      .where(eq(paymentAllocations.feeId, feeId));

    return Number(result?.total) || 0;
  }

  async getTotalAllocatedForInstallment(installmentId: string) {
    const [result] = await this.db
      .select({
        total: sum(paymentAllocations.amount),
      })
      .from(paymentAllocations)
      .where(eq(paymentAllocations.installmentId, installmentId));

    return Number(result?.total) || 0;
  }

  async getCompletedTotalByInstallmentIds(
    installmentIds: string[],
    excludePaymentId?: string,
  ): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    if (!installmentIds || installmentIds.length === 0) return map;

    const conditions = [
      inArray(paymentAllocations.installmentId, installmentIds),
      eq(payments.status, 'completed'),
    ];
    if (excludePaymentId) {
      conditions.push(sql`${paymentAllocations.paymentId} <> ${excludePaymentId}`);
    }

    const rows = await this.db
      .select({
        installmentId: paymentAllocations.installmentId,
        total: sum(paymentAllocations.amount),
      })
      .from(paymentAllocations)
      .leftJoin(payments, eq(paymentAllocations.paymentId, payments.id))
      .where(and(...conditions))
      .groupBy(paymentAllocations.installmentId);

    for (const row of rows) {
      if (row.installmentId) {
        map.set(row.installmentId, Number(row.total) || 0);
      }
    }
    return map;
  }

  async getReservedTotalByInstallmentIds(
    installmentIds: string[],
    excludePaymentId?: string,
  ): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    if (!installmentIds || installmentIds.length === 0) return map;

    const conditions = [
      inArray(paymentAllocations.installmentId, installmentIds),
      inArray(payments.status, [...ACTIVE_RESERVATION_STATUSES] as unknown as string[]),
    ];
    if (excludePaymentId) {
      conditions.push(sql`${paymentAllocations.paymentId} <> ${excludePaymentId}`);
    }

    const rows = await this.db
      .select({
        installmentId: paymentAllocations.installmentId,
        total: sum(paymentAllocations.amount),
      })
      .from(paymentAllocations)
      .leftJoin(payments, eq(paymentAllocations.paymentId, payments.id))
      .where(and(...conditions))
      .groupBy(paymentAllocations.installmentId);

    for (const row of rows) {
      if (row.installmentId) {
        map.set(row.installmentId, Number(row.total) || 0);
      }
    }
    return map;
  }

  async getAllocationStats() {
    const [stats] = await this.db
      .select({
        totalAllocations: count(paymentAllocations.id),
        totalAmount: sum(paymentAllocations.amount),
        feeAllocations: sql<number>`COUNT(CASE WHEN ${paymentAllocations.type} = 'fee' THEN 1 END)`,
        installmentAllocations: sql<number>`COUNT(CASE WHEN ${paymentAllocations.type} = 'installment' THEN 1 END)`,
      })
      .from(paymentAllocations);

    return {
      totalAllocations: Number(stats.totalAllocations) || 0,
      totalAmount: Number(stats.totalAmount) || 0,
      feeAllocations: Number(stats.feeAllocations) || 0,
      installmentAllocations: Number(stats.installmentAllocations) || 0,
    };
  }

  async create(data: Partial<typeof paymentAllocations.$inferInsert>) {
    const [allocation] = await this.db
      .insert(paymentAllocations)
      .values(this.typeAllocationInsert(data))
      .returning();

    return allocation;
  }

  async createBulk(data: Partial<typeof paymentAllocations.$inferInsert>[]) {
    const allocations = await this.db
      .insert(paymentAllocations)
      .values(data.map((item) => this.typeAllocationInsert(item)))
      .returning();

    return allocations;
  }

  async update(id: string, data: Partial<typeof paymentAllocations.$inferInsert>) {
    const [updated] = await this.db
      .update(paymentAllocations)
      .set(this.typeAllocationInsert(data))
      .where(eq(paymentAllocations.id, id))
      .returning();

    return updated;
  }

  async delete(id: string) {
    const [deleted] = await this.db
      .delete(paymentAllocations)
      .where(eq(paymentAllocations.id, id))
      .returning();

    return deleted;
  }

  async deleteByPaymentId(paymentId: string) {
    return await this.db
      .delete(paymentAllocations)
      .where(eq(paymentAllocations.paymentId, paymentId))
      .returning();
  }

  async deleteByFeeId(feeId: string) {
    return await this.db
      .delete(paymentAllocations)
      .where(eq(paymentAllocations.feeId, feeId))
      .returning();
  }

  async deleteAll() {
    return await this.db.delete(paymentAllocations).returning();
  }

  //=====================================================================//
  // REVENUE CALCULATION METHODS
  //=====================================================================//

  async getTotalRevenue(academicYear?: string) {
    const conditions = [eq(payments.status, 'completed')];

    if (academicYear) {
      conditions.push(eq(fees.academicYear, academicYear));
    }

    const [result] = await this.db
      .select({
        total: sum(paymentAllocations.amount),
      })
      .from(paymentAllocations)
      .innerJoin(payments, eq(paymentAllocations.paymentId, payments.id))
      .innerJoin(fees, eq(paymentAllocations.feeId, fees.id))
      .where(and(...conditions));

    return Number(result?.total) || 0;
  }

  async getRevenueByAcademicYear(academicYear: string) {
    const [result] = await this.db
      .select({
        total: sum(paymentAllocations.amount),
      })
      .from(paymentAllocations)
      .innerJoin(payments, eq(paymentAllocations.paymentId, payments.id))
      .innerJoin(fees, eq(paymentAllocations.feeId, fees.id))
      .where(
        and(
          eq(payments.status, 'completed'),
          eq(fees.academicYear, academicYear)
        )
      );

    return Number(result?.total) || 0;
  }

  async getRevenueByDateRange(startDate: string, endDate: string) {
    const [result] = await this.db
      .select({
        total: sum(paymentAllocations.amount),
      })
      .from(paymentAllocations)
      .innerJoin(payments, eq(paymentAllocations.paymentId, payments.id))
      .where(
        and(
          eq(payments.status, 'completed'),
          sql`COALESCE(${payments.settledDate}, ${payments.paymentDate}) >= ${startDate}`,
          sql`COALESCE(${payments.settledDate}, ${payments.paymentDate}) <= ${endDate}`
        )
      );

    return Number(result?.total) || 0;
  }

  async getRevenueByPaymentMethod(academicYear?: string) {
    const conditions = [eq(payments.status, 'completed')];

    let query = this.db
      .select({
        paymentMethod: payments.paymentMethod,
        total: sum(paymentAllocations.amount),
        count: count(paymentAllocations.id),
      })
      .from(paymentAllocations)
      .innerJoin(payments, eq(paymentAllocations.paymentId, payments.id));

    if (academicYear) {
      conditions.push(eq(fees.academicYear, academicYear));
      query = query.innerJoin(fees, eq(paymentAllocations.feeId, fees.id));
    }

    const results = await query
      .where(and(...conditions))
      .groupBy(payments.paymentMethod);

    return results.map(r => ({
      paymentMethod: r.paymentMethod,
      total: Number(r.total) || 0,
      count: Number(r.count) || 0,
    }));
  }

  async getMonthlyRevenue(year: number, academicYear?: string) {
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;
    const conditions = [
      eq(payments.status, 'completed'),
      sql`COALESCE(${payments.settledDate}, ${payments.paymentDate}) >= ${startDate}`,
      sql`COALESCE(${payments.settledDate}, ${payments.paymentDate}) <= ${endDate}`,
    ];

    let query = this.db
      .select({
        month: sql<number>`EXTRACT(MONTH FROM COALESCE(${payments.settledDate}, ${payments.paymentDate}))`,
        total: sum(paymentAllocations.amount),
        count: count(paymentAllocations.id),
      })
      .from(paymentAllocations)
      .innerJoin(payments, eq(paymentAllocations.paymentId, payments.id));

    if (academicYear) {
      conditions.push(eq(fees.academicYear, academicYear));
      query = query.innerJoin(fees, eq(paymentAllocations.feeId, fees.id));
    }

    const results = await query
      .where(and(...conditions))
      .groupBy(sql`EXTRACT(MONTH FROM COALESCE(${payments.settledDate}, ${payments.paymentDate}))`)
      .orderBy(sql`EXTRACT(MONTH FROM COALESCE(${payments.settledDate}, ${payments.paymentDate}))`);

    return results.map(r => ({
      month: Number(r.month),
      total: Number(r.total) || 0,
      count: Number(r.count) || 0,
    }));
  }

  async getRevenueStats(academicYear?: string) {
    const conditions = [eq(payments.status, 'completed')];

    let query = this.db
      .select({
        totalRevenue: sum(paymentAllocations.amount),
        totalAllocations: count(paymentAllocations.id),
        completedPayments: sql<number>`COUNT(DISTINCT ${payments.id})`,
      })
      .from(paymentAllocations)
      .innerJoin(payments, eq(paymentAllocations.paymentId, payments.id));

    if (academicYear) {
      conditions.push(eq(fees.academicYear, academicYear));
      query = query.innerJoin(fees, eq(paymentAllocations.feeId, fees.id));
    }

    const [result] = await query.where(and(...conditions));

    return {
      totalRevenue: Number(result?.totalRevenue) || 0,
      totalAllocations: Number(result?.totalAllocations) || 0,
      completedPayments: Number(result?.completedPayments) || 0,
    };
  }

  async getTopPayingStudents(limit: number = 10, academicYear?: string) {
    const conditions = [eq(payments.status, 'completed')];

    if (academicYear) {
      conditions.push(eq(fees.academicYear, academicYear));
    }

    const results = await this.db
      .select({
        studentId: fees.studentId,
        studentName: students.name,
        studentCode: students.studentCode,
        totalPaid: sum(paymentAllocations.amount),
        paymentCount: count(sql`DISTINCT ${payments.id}`),
      })
      .from(paymentAllocations)
      .innerJoin(payments, eq(paymentAllocations.paymentId, payments.id))
      .innerJoin(fees, eq(paymentAllocations.feeId, fees.id))
      .leftJoin(students, eq(fees.studentId, students.id))
      .where(and(...conditions))
      .groupBy(fees.studentId, students.name, students.studentCode)
      .orderBy(desc(sum(paymentAllocations.amount)))
      .limit(limit);

    return results.map(r => ({
      studentId: r.studentId,
      studentName: r.studentName,
      studentCode: r.studentCode,
      totalPaid: Number(r.totalPaid) || 0,
      paymentCount: Number(r.paymentCount) || 0,
    }));
  }
}
