import { Repository } from '@server/najm';
import { eq, desc, and, count, sum, sql, inArray, gte, lte, between } from 'drizzle-orm';
import { expenses, users } from '@server/database/schema';
import { DB } from '@server/database/db';
import { alias } from 'drizzle-orm/pg-core';
import { formatDateOnly } from '../utils/dateOnly';
import { getBusinessDate } from '@server/shared/businessDate';

const expenseSelect = {
  id: expenses.id,
  category: expenses.category,
  title: expenses.title,
  amount: expenses.amount,
  expenseDate: expenses.expenseDate,
  vendor: expenses.vendor,
  paymentMethod: expenses.paymentMethod,
  paymentDate: expenses.paymentDate,
  invoiceNumber: expenses.invoiceNumber,
  receiptNumber: expenses.receiptNumber,
  checkNumber: expenses.checkNumber,
  transactionRef: expenses.transactionRef,
  status: expenses.status,
  approvedBy: expenses.approvedBy,
  approvedAt: expenses.approvedAt,
  rejectionReason: expenses.rejectionReason,
  paidBy: expenses.paidBy,
  notes: expenses.notes,
  createdAt: expenses.createdAt,
  updatedAt: expenses.updatedAt,
};

@Repository()
export class ExpenseRepository {
  declare db: DB;

  // ========================================
  // QUERY_BUILDERS (Reusable)
  // ========================================

  private buildExpenseQuery() {
    const approverUsers = alias(users, 'approver_users');
    const payerUsers = alias(users, 'payer_users');

    return this.db
      .select({
        ...expenseSelect,
        approver: {
          id: approverUsers.id,
          email: approverUsers.email,
          image: approverUsers.image,
        },
        payer: {
          id: payerUsers.id,
          email: payerUsers.email,
          image: payerUsers.image,
        },
      })
      .from(expenses)
      .leftJoin(approverUsers, eq(expenses.approvedBy, approverUsers.id))
      .leftJoin(payerUsers, eq(expenses.paidBy, payerUsers.id));
  }

  // ========================================
  // GET_READ_METHODS
  // ========================================

  async getCount() {
    const [expenseCount] = await this.db
      .select({ count: count() })
      .from(expenses);
    return expenseCount;
  }

  async getTodayExpenses() {
    const today = formatDateOnly(getBusinessDate());
    return await this.buildExpenseQuery()
      .where(
        and(
          sql`${expenses.expenseDate} = ${today}`,
          eq(expenses.status, 'paid')
        )
      )
      .orderBy(desc(expenses.expenseDate));
  }

  async getTodayExpensesTotal() {
    const today = formatDateOnly(getBusinessDate());
    const [result] = await this.db
      .select({
        total: sql<number>`COALESCE(SUM(${expenses.amount}::numeric), 0)`,
        count: count(expenses.id),
      })
      .from(expenses)
      .where(
        and(
          sql`${expenses.expenseDate} = ${today}`,
          eq(expenses.status, 'paid')
        )
      );
    return { total: Number(result.total), count: result.count };
  }

  async getThisMonthExpenses() {
    const now = getBusinessDate();
    const startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const endDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${lastDay}`;
    return await this.buildExpenseQuery()
      .where(
        and(
          sql`${expenses.expenseDate} >= ${startDate}`,
          sql`${expenses.expenseDate} <= ${endDate}`,
          eq(expenses.status, 'paid')
        )
      )
      .orderBy(desc(expenses.expenseDate));
  }

  async getThisMonthExpensesTotal() {
    const now = getBusinessDate();
    const startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const endDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${lastDay}`;
    const [result] = await this.db
      .select({
        total: sql<number>`COALESCE(SUM(${expenses.amount}::numeric), 0)`,
        count: count(expenses.id),
      })
      .from(expenses)
      .where(
        and(
          sql`${expenses.expenseDate} >= ${startDate}`,
          sql`${expenses.expenseDate} <= ${endDate}`,
          eq(expenses.status, 'paid')
        )
      );
    return { total: Number(result.total), count: result.count };
  }

  async getSummary() {
    const today = formatDateOnly(getBusinessDate());
    const now = getBusinessDate();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const monthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${lastDay}`;

    const [totals, todayResult, monthResult, pendingResult] = await Promise.all([
      this.db
        .select({
          totalApproved: sql<number>`COALESCE(SUM(CASE WHEN ${expenses.status} = 'paid' THEN ${expenses.amount}::numeric END), 0)`,
          totalPending: sql<number>`COALESCE(SUM(CASE WHEN ${expenses.status} IN ('pending', 'approved') THEN ${expenses.amount}::numeric END), 0)`,
          totalCount: count(expenses.id),
        })
        .from(expenses),
      this.db
        .select({
          total: sql<number>`COALESCE(SUM(${expenses.amount}::numeric), 0)`,
          count: count(expenses.id),
        })
        .from(expenses)
        .where(and(sql`${expenses.expenseDate} = ${today}`, eq(expenses.status, 'paid'))),
      this.db
        .select({
          total: sql<number>`COALESCE(SUM(${expenses.amount}::numeric), 0)`,
          count: count(expenses.id),
        })
        .from(expenses)
        .where(and(sql`${expenses.expenseDate} >= ${monthStart}`, sql`${expenses.expenseDate} <= ${monthEnd}`, eq(expenses.status, 'paid'))),
      this.db
        .select({
          count: count(expenses.id),
        })
        .from(expenses)
        .where(inArray(expenses.status, ['pending', 'approved'])),
    ]);

    return {
      totalApproved: Number(totals[0].totalApproved),
      totalPending: Number(totals[0].totalPending),
      totalCount: totals[0].totalCount,
      today: { total: Number(todayResult[0].total), count: todayResult[0].count },
      thisMonth: { total: Number(monthResult[0].total), count: monthResult[0].count },
      pendingApprovalCount: pendingResult[0].count,
    };
  }

  async getAll() {
    return await this.getAllExpenses();
  }

  async getAllExpenses() {
    return await this.buildExpenseQuery()
      .orderBy(desc(expenses.expenseDate), desc(expenses.createdAt));
  }

  async getByIds(ids) {
    if (!ids || ids.length === 0) return [];

    return await this.buildExpenseQuery()
      .where(inArray(expenses.id, ids))
      .orderBy(desc(expenses.expenseDate), desc(expenses.createdAt));
  }

  async getById(id) {
    const [expense] = await this.buildExpenseQuery()
      .where(eq(expenses.id, id))
      .limit(1);

    return expense;
  }

  async getByCategory(category) {
    return await this.buildExpenseQuery()
      .where(eq(expenses.category, category))
      .orderBy(desc(expenses.expenseDate));
  }

  async getByStatus(status) {
    return await this.buildExpenseQuery()
      .where(eq(expenses.status, status))
      .orderBy(desc(expenses.createdAt));
  }

  async getByDateRange(startDate: string, endDate: string) {
    return await this.buildExpenseQuery()
      .where(
        between(expenses.expenseDate, startDate, endDate)
      )
      .orderBy(desc(expenses.expenseDate));
  }

  async getByInvoiceNumber(invoiceNumber: string) {
    const [expense] = await this.buildExpenseQuery()
      .where(eq(expenses.invoiceNumber, invoiceNumber))
      .limit(1);
    return expense;
  }

  async getByReceiptNumber(receiptNumber: string) {
    const [expense] = await this.buildExpenseQuery()
      .where(eq(expenses.receiptNumber, receiptNumber))
      .limit(1);
    return expense;
  }

  async getByCheckNumber(checkNumber: string) {
    const [expense] = await this.buildExpenseQuery()
      .where(eq(expenses.checkNumber, checkNumber))
      .limit(1);
    return expense;
  }

  async getPendingApprovals() {
    return await this.buildExpenseQuery()
      .where(eq(expenses.status, 'pending'))
      .orderBy(expenses.createdAt);
  }

  // ========================================
  // ANALYTICS METHODS
  // ========================================

  async getTotalExpensesByCategory() {
    const result = await this.db
      .select({
        category: expenses.category,
        total: sum(expenses.amount),
        count: count(),
      })
      .from(expenses)
      .where(eq(expenses.status, 'paid'))
      .groupBy(expenses.category);

    return result.map(r => ({
      category: r.category,
      total: Number(r.total || 0),
      count: r.count,
    }));
  }

  async getTotalExpensesByStatus() {
    const result = await this.db
      .select({
        status: expenses.status,
        total: sum(expenses.amount),
        count: count(),
      })
      .from(expenses)
      .groupBy(expenses.status);

    return result.map(r => ({
      status: r.status,
      total: Number(r.total || 0),
      count: r.count,
    }));
  }

  async getTotalExpensesByDateRange(startDate: string, endDate: string) {
    const [result] = await this.db
      .select({
        total: sum(expenses.amount),
        count: count(),
      })
      .from(expenses)
      .where(
        and(
          gte(expenses.expenseDate, startDate),
          lte(expenses.expenseDate, endDate),
          eq(expenses.status, 'paid')
        )
      );

    return {
      total: Number(result?.total || 0),
      count: result?.count || 0,
    };
  }

  async getMonthlyExpenses(year: number) {
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;
    const result = await this.db
      .select({
        month: sql<number>`EXTRACT(MONTH FROM ${expenses.expenseDate})`,
        total: sum(expenses.amount),
        count: count(),
      })
      .from(expenses)
      .where(
        and(
          gte(expenses.expenseDate, startDate),
          lte(expenses.expenseDate, endDate),
          eq(expenses.status, 'paid')
        )
      )
      .groupBy(sql`EXTRACT(MONTH FROM ${expenses.expenseDate})`)
      .orderBy(sql`EXTRACT(MONTH FROM ${expenses.expenseDate})`);

    return result.map(r => ({
      month: r.month,
      total: Number(r.total || 0),
      count: r.count,
    }));
  }

  async getTotalPaidExpenses() {
    const [result] = await this.db
      .select({
        total: sum(expenses.amount),
      })
      .from(expenses)
      .where(eq(expenses.status, 'paid'));

    return Number(result?.total || 0);
  }

  async getTotalPendingExpenses() {
    const [result] = await this.db
      .select({
        total: sum(expenses.amount),
      })
      .from(expenses)
      .where(inArray(expenses.status, ['pending', 'approved']));

    return Number(result?.total || 0);
  }

  // ========================================
  // CREATE_METHODS
  // ========================================

  async create(data) {
    const [newExpense] = await this.db
      .insert(expenses)
      .values(data)
      .returning();
    return await this.getById(newExpense.id);
  }

  // ========================================
  // UPDATE_METHODS
  // ========================================

  async update(id, data) {
    const [updatedExpense] = await this.db
      .update(expenses)
      .set(data)
      .where(eq(expenses.id, id))
      .returning();
    return updatedExpense;
  }

  async approve(id: string, approvedBy: string) {
    const [updatedExpense] = await this.db
      .update(expenses)
      .set({
        status: 'approved',
        approvedBy,
        approvedAt: sql`CURRENT_TIMESTAMP`,
        rejectionReason: null,
      })
      .where(eq(expenses.id, id))
      .returning();
    return updatedExpense;
  }

  async reject(id: string, approvedBy: string, rejectionReason: string) {
    const [updatedExpense] = await this.db
      .update(expenses)
      .set({
        status: 'rejected',
        approvedBy,
        approvedAt: sql`CURRENT_TIMESTAMP`,
        rejectionReason,
      })
      .where(eq(expenses.id, id))
      .returning();
    return updatedExpense;
  }

  async markAsPaid(id: string, paidBy: string, paymentDate: string) {
    const [updatedExpense] = await this.db
      .update(expenses)
      .set({
        status: 'paid',
        paidBy,
        paymentDate,
      })
      .where(eq(expenses.id, id))
      .returning();
    return updatedExpense;
  }

  // ========================================
  // DELETE_METHODS
  // ========================================

  async delete(id) {
    const [deletedExpense] = await this.db
      .delete(expenses)
      .where(eq(expenses.id, id))
      .returning();
    return deletedExpense;
  }

  async deleteAll() {
    const deletedExpenses = await this.db
      .delete(expenses)
      .returning();

    return {
      deletedCount: deletedExpenses.length,
      deletedExpenses: deletedExpenses
    };
  }
}
