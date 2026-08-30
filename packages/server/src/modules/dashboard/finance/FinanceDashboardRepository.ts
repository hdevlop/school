import { Repository } from '@server/najm';
import { and, desc, eq, gte, lte, sql, sum, count } from 'drizzle-orm';
import {
  expenses,
  feeInstallments,
  fees,
  payments,
  payslips,
  students,
  classes,
  users,
} from '@server/database/schema';
import { DB } from '@server/database/db';
import { formatDateOnly } from '../../financial/utils/dateOnly';
import { getBusinessDate } from '@server/shared/businessDate';

@Repository()
export class FinanceDashboardRepository {
  declare db: DB;

  async getKpis(academicYear: string) {
    const now = getBusinessDate();
    const monthStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const monthStart = formatDateOnly(monthStartDate) as string;
    const monthEnd = formatDateOnly(monthEndDate) as string;
    const today = formatDateOnly(now) as string;

    const [incomeRow] = await this.db
      .select({
        total: sql<string>`COALESCE(SUM(${payments.amount}), 0)`,
      })
      .from(payments)
      .where(
        and(
          eq(payments.status, 'completed'),
          sql`COALESCE(${payments.settledDate}, ${payments.paymentDate}) >= ${monthStart}`,
          sql`COALESCE(${payments.settledDate}, ${payments.paymentDate}) <= ${monthEnd}`,
        ),
      );

    const [expensesRow] = await this.db
      .select({
        total: sql<string>`COALESCE(SUM(${expenses.amount}), 0)`,
      })
      .from(expenses)
      .where(
        and(
          gte(expenses.expenseDate, monthStart),
          lte(expenses.expenseDate, monthEnd),
        ),
      );

    // Payroll is a separate cash-out source (payslips, not expenses) — paid in-month.
    const [payrollRow] = await this.db
      .select({
        total: sql<string>`COALESCE(SUM(${payslips.netAmount}), 0)`,
      })
      .from(payslips)
      .where(
        and(
          eq(payslips.status, 'paid'),
          gte(payslips.paymentDate, monthStart),
          lte(payslips.paymentDate, monthEnd),
        ),
      );

    // Collection rate YTD académique: due installments (academicYear, dueDate <= today)
    const [collectionRow] = await this.db
      .select({
        due: sql<string>`COALESCE(SUM(${feeInstallments.amount}), 0)`,
        paid: sql<string>`COALESCE(SUM(${feeInstallments.paidAmount}), 0)`,
      })
      .from(feeInstallments)
      .innerJoin(fees, eq(feeInstallments.feeId, fees.id))
      .where(
        and(
          eq(fees.academicYear, academicYear),
          lte(feeInstallments.dueDate, today),
        ),
      );

    const incomeMonth = Number(incomeRow?.total ?? 0);
    const expensesMonth = Number(expensesRow?.total ?? 0) + Number(payrollRow?.total ?? 0);
    const due = Number(collectionRow?.due ?? 0);
    const paid = Number(collectionRow?.paid ?? 0);
    const collectionRateYTD = due > 0 ? (paid / due) * 100 : 0;

    return {
      incomeMonth,
      expensesMonth,
      netBalance: incomeMonth - expensesMonth,
      collectionRateYTD,
    };
  }

  async getTrend(academicYear: string) {
    const startYear = Number(academicYear.split('-')[0]);
    // Academic year runs Sept (startYear) → Aug (startYear+1). 12 months.
    const windowStart = `${startYear}-09-01`;
    const windowEnd = `${startYear + 1}-08-31`;

    const incomeRows = await this.db
      .select({
        month: sql<string>`TO_CHAR(COALESCE(${payments.settledDate}, ${payments.paymentDate}), 'YYYY-MM')`,
        total: sql<string>`COALESCE(SUM(${payments.amount}), 0)`,
      })
      .from(payments)
      .where(
        and(
          eq(payments.status, 'completed'),
          gte(sql`COALESCE(${payments.settledDate}, ${payments.paymentDate})`, windowStart),
          lte(sql`COALESCE(${payments.settledDate}, ${payments.paymentDate})`, windowEnd),
        ),
      )
      .groupBy(sql`TO_CHAR(COALESCE(${payments.settledDate}, ${payments.paymentDate}), 'YYYY-MM')`);

    const expenseRows = await this.db
      .select({
        month: sql<string>`TO_CHAR(${expenses.expenseDate}, 'YYYY-MM')`,
        total: sql<string>`COALESCE(SUM(${expenses.amount}), 0)`,
      })
      .from(expenses)
      .where(
        and(
          gte(expenses.expenseDate, windowStart),
          lte(expenses.expenseDate, windowEnd),
        ),
      )
      .groupBy(sql`TO_CHAR(${expenses.expenseDate}, 'YYYY-MM')`);

    const payslipRows = await this.db
      .select({
        month: sql<string>`TO_CHAR(${payslips.paymentDate}, 'YYYY-MM')`,
        total: sql<string>`COALESCE(SUM(${payslips.netAmount}), 0)`,
      })
      .from(payslips)
      .where(
        and(
          eq(payslips.status, 'paid'),
          gte(payslips.paymentDate, windowStart),
          lte(payslips.paymentDate, windowEnd),
        ),
      )
      .groupBy(sql`TO_CHAR(${payslips.paymentDate}, 'YYYY-MM')`);

    const incomeMap = new Map(incomeRows.map((r) => [r.month, Number(r.total)]));
    const expenseMap = new Map(expenseRows.map((r) => [r.month, Number(r.total)]));
    // Fold paid payroll into the cash-out series alongside expenses.
    for (const r of payslipRows) {
      expenseMap.set(r.month, (expenseMap.get(r.month) ?? 0) + Number(r.total));
    }

    const monthly: { month: string; income: number; expenses: number }[] = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(startYear, 8 + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthly.push({
        month: key,
        income: incomeMap.get(key) ?? 0,
        expenses: expenseMap.get(key) ?? 0,
      });
    }

    const todayStr = formatDateOnly(getBusinessDate()) as string;
    const [todayIncomeRow] = await this.db
      .select({ total: sql<string>`COALESCE(SUM(${payments.amount}), 0)` })
      .from(payments)
      .where(and(eq(payments.status, 'completed'), sql`COALESCE(${payments.settledDate}, ${payments.paymentDate}) = ${todayStr}`));
    const [todayExpenseRow] = await this.db
      .select({ total: sql<string>`COALESCE(SUM(${expenses.amount}), 0)` })
      .from(expenses)
      .where(eq(expenses.expenseDate, todayStr));
    const [todayPayrollRow] = await this.db
      .select({ total: sql<string>`COALESCE(SUM(${payslips.netAmount}), 0)` })
      .from(payslips)
      .where(and(eq(payslips.status, 'paid'), eq(payslips.paymentDate, todayStr)));

    const todayIncome = Number(todayIncomeRow?.total ?? 0);
    const todayExpenses = Number(todayExpenseRow?.total ?? 0) + Number(todayPayrollRow?.total ?? 0);

    return {
      monthly,
      today: todayIncome - todayExpenses,
      todayIncome,
      todayExpenses,
    };
  }

  async getAging() {
    const today = formatDateOnly(getBusinessDate()) as string;

    const [row] = await this.db
      .select({
        current: sql<string>`COALESCE(SUM(CASE WHEN ${feeInstallments.dueDate} >= ${today} THEN ${feeInstallments.amount} - ${feeInstallments.paidAmount} ELSE 0 END), 0)`,
        d1_30: sql<string>`COALESCE(SUM(CASE WHEN ${feeInstallments.dueDate} < ${today} AND ${feeInstallments.dueDate} >= (${today}::date - INTERVAL '30 days') THEN ${feeInstallments.amount} - ${feeInstallments.paidAmount} ELSE 0 END), 0)`,
        d31_60: sql<string>`COALESCE(SUM(CASE WHEN ${feeInstallments.dueDate} < (${today}::date - INTERVAL '30 days') AND ${feeInstallments.dueDate} >= (${today}::date - INTERVAL '60 days') THEN ${feeInstallments.amount} - ${feeInstallments.paidAmount} ELSE 0 END), 0)`,
        d60plus: sql<string>`COALESCE(SUM(CASE WHEN ${feeInstallments.dueDate} < (${today}::date - INTERVAL '60 days') THEN ${feeInstallments.amount} - ${feeInstallments.paidAmount} ELSE 0 END), 0)`,
      })
      .from(feeInstallments)
      .where(sql`${feeInstallments.amount} - ${feeInstallments.paidAmount} > 0`);

    return {
      current: Number(row?.current ?? 0),
      d1_30: Number(row?.d1_30 ?? 0),
      d31_60: Number(row?.d31_60 ?? 0),
      d60plus: Number(row?.d60plus ?? 0),
    };
  }

  async getOverdue(limit: number) {
    const today = formatDateOnly(getBusinessDate()) as string;

    const rows = await this.db
      .select({
        studentId: students.id,
        studentName: students.name,
        studentImage: users.image,
        gender: students.gender,
        totalOverdue: sql<string>`COALESCE(SUM(${feeInstallments.amount} - ${feeInstallments.paidAmount}), 0)`,
        oldestDueDate: sql<string>`MIN(${feeInstallments.dueDate})`,
      })
      .from(feeInstallments)
      .innerJoin(fees, eq(feeInstallments.feeId, fees.id))
      .innerJoin(students, eq(fees.studentId, students.id))
      .leftJoin(users, eq(students.userId, users.id))
      .where(
        and(
          sql`${feeInstallments.dueDate} < ${today}`,
          sql`${feeInstallments.amount} - ${feeInstallments.paidAmount} > 0`,
        ),
      )
      .groupBy(students.id, students.name, users.image, students.gender)
      .orderBy(sql`MIN(${feeInstallments.dueDate}) ASC`)
      .limit(limit);

    return rows.map((r) => {
      const oldest = r.oldestDueDate ? new Date(r.oldestDueDate) : null;
      const daysOverdue = oldest
        ? Math.floor((Date.now() - oldest.getTime()) / (1000 * 60 * 60 * 24))
        : 0;
      return {
        studentId: r.studentId,
        studentName: r.studentName,
        studentImage: r.studentImage,
        gender: r.gender,
        totalOverdue: Number(r.totalOverdue ?? 0),
        daysOverdue,
        oldestDueDate: r.oldestDueDate,
      };
    });
  }

  async getRecentPayments(limit: number) {
    const rows = await this.db
      .select({
        paymentId: payments.id,
        studentId: payments.studentId,
        studentName: students.name,
        amount: payments.amount,
        method: payments.paymentMethod,
        paidAt: payments.paymentDate,
      })
      .from(payments)
      .leftJoin(students, eq(payments.studentId, students.id))
      .where(eq(payments.status, 'completed'))
      .orderBy(desc(payments.paymentDate), desc(payments.createdAt))
      .limit(limit);

    return rows.map((r) => ({
      paymentId: r.paymentId,
      studentId: r.studentId,
      studentName: r.studentName,
      amount: Number(r.amount ?? 0),
      method: r.method,
      paidAt: r.paidAt,
    }));
  }

  // ─── Reports ───────────────────────────────────────────────────────────────

  /** Expense breakdown by category for an academic year window (Sept → Aug). */
  async getExpenseBreakdown(academicYear: string) {
    const startYear = Number(academicYear.split('-')[0]);
    const windowStart = `${startYear}-09-01`;
    const windowEnd   = `${startYear + 1}-08-31`;

    const rows = await this.db
      .select({
        category: expenses.category,
        total: sql<string>`COALESCE(SUM(${expenses.amount}), 0)`,
        count: sql<string>`COUNT(*)`,
      })
      .from(expenses)
      .where(
        and(
          gte(expenses.expenseDate, windowStart),
          lte(expenses.expenseDate, windowEnd),
        ),
      )
      .groupBy(expenses.category)
      .orderBy(sql`SUM(${expenses.amount}) DESC`);

    // Payroll lives in payslips, not expenses — surface it as its own breakdown bucket.
    const [payrollRow] = await this.db
      .select({
        total: sql<string>`COALESCE(SUM(${payslips.netAmount}), 0)`,
        count: sql<string>`COUNT(*)`,
      })
      .from(payslips)
      .where(
        and(
          eq(payslips.status, 'paid'),
          gte(payslips.paymentDate, windowStart),
          lte(payslips.paymentDate, windowEnd),
        ),
      );

    const breakdown = rows.map((r) => ({
      category: r.category,
      total: Number(r.total ?? 0),
      count: Number(r.count ?? 0),
    }));

    const payrollTotal = Number(payrollRow?.total ?? 0);
    if (payrollTotal > 0) {
      breakdown.push({
        category: 'payroll',
        total: payrollTotal,
        count: Number(payrollRow?.count ?? 0),
      });
    }

    return breakdown.sort((a, b) => b.total - a.total);
  }

  /** Collection rate (paid / due) per class for a given academic year. */
  async getCollectionByClass(academicYear: string) {
    const today = formatDateOnly(getBusinessDate()) as string;

    const rows = await this.db
      .select({
        classId: classes.id,
        className: classes.name,
        due: sql<string>`COALESCE(SUM(${feeInstallments.amount}), 0)`,
        paid: sql<string>`COALESCE(SUM(${feeInstallments.paidAmount}), 0)`,
        studentCount: sql<string>`COUNT(DISTINCT ${students.id})`,
      })
      .from(feeInstallments)
      .innerJoin(fees, eq(feeInstallments.feeId, fees.id))
      .innerJoin(students, eq(fees.studentId, students.id))
      .leftJoin(classes, eq(students.classId, classes.id))
      .where(
        and(
          eq(fees.academicYear, academicYear),
          lte(feeInstallments.dueDate, today),
        ),
      )
      .groupBy(classes.id, classes.name)
      .orderBy(classes.name);

    return rows.map((r) => {
      const due  = Number(r.due ?? 0);
      const paid = Number(r.paid ?? 0);
      return {
        classId: r.classId,
        className: r.className ?? 'No class',
        due,
        paid,
        rate: due > 0 ? (paid / due) * 100 : 0,
        studentCount: Number(r.studentCount ?? 0),
      };
    });
  }

  /** Detailed AR aging per student — one row per student with all four buckets. */
  async getAgingDetail() {
    const today = formatDateOnly(getBusinessDate()) as string;

    const rows = await this.db
      .select({
        studentId: students.id,
        studentName: students.name,
        studentCode: students.studentCode,
        classId: classes.id,
        className: classes.name,
        current: sql<string>`COALESCE(SUM(CASE WHEN ${feeInstallments.dueDate} >= ${today} THEN ${feeInstallments.amount} - ${feeInstallments.paidAmount} ELSE 0 END), 0)`,
        d1_30: sql<string>`COALESCE(SUM(CASE WHEN ${feeInstallments.dueDate} < ${today} AND ${feeInstallments.dueDate} >= (${today}::date - INTERVAL '30 days') THEN ${feeInstallments.amount} - ${feeInstallments.paidAmount} ELSE 0 END), 0)`,
        d31_60: sql<string>`COALESCE(SUM(CASE WHEN ${feeInstallments.dueDate} < (${today}::date - INTERVAL '30 days') AND ${feeInstallments.dueDate} >= (${today}::date - INTERVAL '60 days') THEN ${feeInstallments.amount} - ${feeInstallments.paidAmount} ELSE 0 END), 0)`,
        d60plus: sql<string>`COALESCE(SUM(CASE WHEN ${feeInstallments.dueDate} < (${today}::date - INTERVAL '60 days') THEN ${feeInstallments.amount} - ${feeInstallments.paidAmount} ELSE 0 END), 0)`,
        total: sql<string>`COALESCE(SUM(${feeInstallments.amount} - ${feeInstallments.paidAmount}), 0)`,
      })
      .from(feeInstallments)
      .innerJoin(fees, eq(feeInstallments.feeId, fees.id))
      .innerJoin(students, eq(fees.studentId, students.id))
      .leftJoin(classes, eq(students.classId, classes.id))
      .where(sql`${feeInstallments.amount} - ${feeInstallments.paidAmount} > 0`)
      .groupBy(students.id, students.name, students.studentCode, classes.id, classes.name)
      .orderBy(sql`SUM(${feeInstallments.amount} - ${feeInstallments.paidAmount}) DESC`);

    return rows.map((r) => ({
      studentId: r.studentId,
      studentName: r.studentName,
      studentCode: r.studentCode,
      classId: r.classId,
      className: r.className ?? 'No class',
      current: Number(r.current ?? 0),
      d1_30: Number(r.d1_30 ?? 0),
      d31_60: Number(r.d31_60 ?? 0),
      d60plus: Number(r.d60plus ?? 0),
      total: Number(r.total ?? 0),
    }));
  }
}
