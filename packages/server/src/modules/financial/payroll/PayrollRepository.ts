import { Repository } from '@server/najm';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { payslips, staff, users } from '@server/database/schema';
import { DB } from '@server/database/db';

@Repository()
export class PayrollRepository {
  declare db: DB;

  private buildQuery() {
    const processorUsers = alias(users, 'processor_users');

    return this.db
      .select({
        id: payslips.id,
        staffId: payslips.staffId,
        staffName: payslips.staffName,
        staffRole: payslips.staffRole,
        period: payslips.period,
        baseSalary: payslips.baseSalary,
        totalAllowances: payslips.totalAllowances,
        totalDeductions: payslips.totalDeductions,
        grossAmount: payslips.grossAmount,
        netAmount: payslips.netAmount,
        status: payslips.status,
        paymentMethod: payslips.paymentMethod,
        paymentDate: payslips.paymentDate,
        payslipNumber: payslips.payslipNumber,
        transactionRef: payslips.transactionRef,
        processedBy: payslips.processedBy,
        notes: payslips.notes,
        createdAt: payslips.createdAt,
        updatedAt: payslips.updatedAt,
        processor: {
          id: processorUsers.id,
          email: processorUsers.email,
          image: processorUsers.image,
        },
        staff: {
          id: staff.id,
          employeeCode: staff.employeeCode,
          department: staff.department,
          employmentType: staff.employmentType,
          status: staff.status,
        },
      })
      .from(payslips)
      .leftJoin(processorUsers, eq(payslips.processedBy, processorUsers.id))
      .leftJoin(staff, eq(payslips.staffId, staff.id));
  }

  async getAll() {
    return await this.buildQuery().orderBy(desc(payslips.period), desc(payslips.createdAt));
  }

  async getById(id: string) {
    const [row] = await this.buildQuery().where(eq(payslips.id, id)).limit(1);
    return row || null;
  }

  async getByPeriod(period: string) {
    return await this.buildQuery()
      .where(eq(payslips.period, period))
      .orderBy(desc(payslips.createdAt));
  }

  async getByStaff(staffId: string) {
    return await this.buildQuery()
      .where(eq(payslips.staffId, staffId))
      .orderBy(desc(payslips.period));
  }

  async getStaffIdsWithPayslip(period: string) {
    const rows = await this.db
      .select({ staffId: payslips.staffId })
      .from(payslips)
      .where(eq(payslips.period, period));
    return rows.map((r) => r.staffId);
  }

  async getByStaffAndPeriod(staffId: string, period: string) {
    const [row] = await this.db
      .select({ id: payslips.id })
      .from(payslips)
      .where(and(eq(payslips.staffId, staffId), eq(payslips.period, period)))
      .limit(1);
    return row || null;
  }

  async create(data: typeof payslips.$inferInsert) {
    const [row] = await this.db.insert(payslips).values(data).returning();
    return row;
  }

  async createMany(data: (typeof payslips.$inferInsert)[]) {
    if (data.length === 0) return [];
    return await this.db.insert(payslips).values(data).returning();
  }

  async update(id: string, data: Partial<typeof payslips.$inferInsert>) {
    const [row] = await this.db
      .update(payslips)
      .set(data)
      .where(eq(payslips.id, id))
      .returning();
    return row;
  }

  async delete(id: string) {
    const [row] = await this.db.delete(payslips).where(eq(payslips.id, id)).returning();
    return row;
  }

  async deleteBulk(ids: string[]) {
    if (ids.length === 0) return [];
    return await this.db.delete(payslips).where(inArray(payslips.id, ids)).returning();
  }

  async deleteAll() {
    return await this.db.delete(payslips).returning();
  }

  async getPeriodSummary(period: string) {
    const [row] = await this.db
      .select({
        count: sql<number>`COUNT(*)`,
        totalNet: sql<string>`COALESCE(SUM(${payslips.netAmount}), 0)`,
        paidCount: sql<number>`COUNT(CASE WHEN ${payslips.status} = 'paid' THEN 1 END)`,
        paidNet: sql<string>`COALESCE(SUM(CASE WHEN ${payslips.status} = 'paid' THEN ${payslips.netAmount} ELSE 0 END), 0)`,
        pendingCount: sql<number>`COUNT(CASE WHEN ${payslips.status} = 'pending' THEN 1 END)`,
        pendingNet: sql<string>`COALESCE(SUM(CASE WHEN ${payslips.status} = 'pending' THEN ${payslips.netAmount} ELSE 0 END), 0)`,
      })
      .from(payslips)
      .where(eq(payslips.period, period));

    return {
      count: Number(row?.count ?? 0),
      totalNet: Number(row?.totalNet ?? 0),
      paidCount: Number(row?.paidCount ?? 0),
      paidNet: Number(row?.paidNet ?? 0),
      pendingCount: Number(row?.pendingCount ?? 0),
      pendingNet: Number(row?.pendingNet ?? 0),
    };
  }
}
