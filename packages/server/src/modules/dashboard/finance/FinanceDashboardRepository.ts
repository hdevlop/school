import { Repository } from '../../../najm';
import { and, desc, eq, gt, gte, lt, lte, ne, sql } from 'drizzle-orm';
import {
  expenses,
  feeInstallments,
  fees,
  payments,
  payslips,
  students,
  classes,
  users,
  studentEnrollments,
  studentEnrollmentPlacements,
  paymentAllocations,
} from '../../../database/schema';
import { DB } from '../../../database/db';
import { formatDateOnly } from '../../financial/utils/dateOnly';
import { getBusinessDate } from '../../../shared/businessDate';
import { monthsBetween } from '@sms/contracts/academic-years';

// A school year as the finance dashboard counts it: fees by their stored
// year label, cash by date over the year's own reporting interval.
export type FinanceYear = { label: string; reportingStartsOn: string; reportingEndsOn: string };

@Repository()
export class FinanceDashboardRepository {
  declare db: DB;

  // Year-specific aging uses completed allocations rather than cached paid
  // columns. A mixed-year receipt contributes only to its target installment.
  private outstandingInstallments(academicYear: string) {
    const completed = this.db.select({
      installmentId: paymentAllocations.installmentId,
      feeId: paymentAllocations.feeId,
      paid: sql<string>`COALESCE(SUM(${paymentAllocations.amount}), 0)`.as('paid'),
    }).from(paymentAllocations)
      .innerJoin(payments, eq(paymentAllocations.paymentId, payments.id))
      .where(eq(payments.status, 'completed'))
      .groupBy(paymentAllocations.installmentId, paymentAllocations.feeId)
      .as('completed_installment_allocations');

    return this.db.select({
      feeId: fees.id,
      studentId: fees.studentId,
      dueDate: feeInstallments.dueDate,
      balance: sql<string>`GREATEST(${feeInstallments.amount} - COALESCE(${completed.paid}, 0), 0)`.as('balance'),
    }).from(feeInstallments)
      .innerJoin(fees, eq(feeInstallments.feeId, fees.id))
      .leftJoin(completed, and(
        eq(completed.installmentId, feeInstallments.id),
        eq(completed.feeId, fees.id),
      ))
      .where(and(
        eq(fees.academicYear, academicYear),
        ne(feeInstallments.status, 'cancelled'),
      ))
      .as('year_outstanding_installments');
  }

  async getAging(academicYear: string) {
    const today = formatDateOnly(getBusinessDate()) as string;
    const outstanding = this.outstandingInstallments(academicYear);
    const [row] = await this.db.select({
      current: sql<string>`COALESCE(SUM(CASE WHEN ${outstanding.dueDate} >= ${today} THEN ${outstanding.balance} ELSE 0 END), 0)`,
      d1_30: sql<string>`COALESCE(SUM(CASE WHEN ${outstanding.dueDate} < ${today} AND ${outstanding.dueDate} >= (${today}::date - INTERVAL '30 days') THEN ${outstanding.balance} ELSE 0 END), 0)`,
      d31_60: sql<string>`COALESCE(SUM(CASE WHEN ${outstanding.dueDate} < (${today}::date - INTERVAL '30 days') AND ${outstanding.dueDate} >= (${today}::date - INTERVAL '60 days') THEN ${outstanding.balance} ELSE 0 END), 0)`,
      d60plus: sql<string>`COALESCE(SUM(CASE WHEN ${outstanding.dueDate} < (${today}::date - INTERVAL '60 days') THEN ${outstanding.balance} ELSE 0 END), 0)`,
    }).from(outstanding).where(gt(outstanding.balance, '0'));

    return {
      current: Number(row?.current ?? 0),
      d1_30: Number(row?.d1_30 ?? 0),
      d31_60: Number(row?.d31_60 ?? 0),
      d60plus: Number(row?.d60plus ?? 0),
    };
  }

  async getOverdue(limit: number, academicYear: string) {
    const today = formatDateOnly(getBusinessDate()) as string;
    const outstanding = this.outstandingInstallments(academicYear);
    const rows = await this.db.select({
      studentId: students.id,
      studentName: students.name,
      studentImage: users.image,
      gender: students.gender,
      totalOverdue: sql<string>`COALESCE(SUM(${outstanding.balance}), 0)`,
      oldestDueDate: sql<string>`MIN(${outstanding.dueDate})`,
    }).from(outstanding)
      .innerJoin(students, eq(outstanding.studentId, students.id))
      .leftJoin(users, eq(students.userId, users.id))
      .where(and(lt(outstanding.dueDate, today), gt(outstanding.balance, '0')))
      .groupBy(students.id, students.name, users.image, students.gender)
      .orderBy(sql`MIN(${outstanding.dueDate}) ASC`)
      .limit(limit);

    return rows.map((row) => ({
      studentId: row.studentId,
      studentName: row.studentName,
      studentImage: row.studentImage,
      gender: row.gender,
      totalOverdue: Number(row.totalOverdue ?? 0),
      daysOverdue: row.oldestDueDate
        ? Math.floor((Date.now() - new Date(row.oldestDueDate).getTime()) / 86_400_000)
        : 0,
      oldestDueDate: row.oldestDueDate,
    }));
  }

  async getAgingDetail(academicYear: string) {
    const today = formatDateOnly(getBusinessDate()) as string;
    const outstanding = this.outstandingInstallments(academicYear);
    const rows = await this.db.select({
      studentId: students.id,
      studentName: students.name,
      studentCode: students.studentCode,
      current: sql<string>`COALESCE(SUM(CASE WHEN ${outstanding.dueDate} >= ${today} THEN ${outstanding.balance} ELSE 0 END), 0)`,
      d1_30: sql<string>`COALESCE(SUM(CASE WHEN ${outstanding.dueDate} < ${today} AND ${outstanding.dueDate} >= (${today}::date - INTERVAL '30 days') THEN ${outstanding.balance} ELSE 0 END), 0)`,
      d31_60: sql<string>`COALESCE(SUM(CASE WHEN ${outstanding.dueDate} < (${today}::date - INTERVAL '30 days') AND ${outstanding.dueDate} >= (${today}::date - INTERVAL '60 days') THEN ${outstanding.balance} ELSE 0 END), 0)`,
      d60plus: sql<string>`COALESCE(SUM(CASE WHEN ${outstanding.dueDate} < (${today}::date - INTERVAL '60 days') THEN ${outstanding.balance} ELSE 0 END), 0)`,
      total: sql<string>`COALESCE(SUM(${outstanding.balance}), 0)`,
    }).from(outstanding)
      .innerJoin(students, eq(outstanding.studentId, students.id))
      .where(gt(outstanding.balance, '0'))
      .groupBy(students.id, students.name, students.studentCode)
      .orderBy(sql`SUM(${outstanding.balance}) DESC`);

    return rows.map((row) => ({
      studentId: row.studentId,
      studentName: row.studentName,
      studentCode: row.studentCode,
      current: Number(row.current ?? 0),
      d1_30: Number(row.d1_30 ?? 0),
      d31_60: Number(row.d31_60 ?? 0),
      d60plus: Number(row.d60plus ?? 0),
      total: Number(row.total ?? 0),
    }));
  }

  async getKpis(financeYear: FinanceYear) {
    const now = getBusinessDate();
    const monthStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const monthStart = formatDateOnly(monthStartDate) as string;
    const monthEnd = formatDateOnly(monthEndDate) as string;
    const today = formatDateOnly(now) as string;
    const academicYear = financeYear.label;

    // The month's cash, and the whole year's for a dashboard viewing a year
    // that is not the active one, where "this month" would not be that year.
    const [month, year] = await Promise.all([
      this.getCashTotals(monthStart, monthEnd),
      this.getCashTotals(financeYear.reportingStartsOn, financeYear.reportingEndsOn),
    ]);

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

    const due = Number(collectionRow?.due ?? 0);
    const paid = Number(collectionRow?.paid ?? 0);
    const collectionRateYTD = due > 0 ? (paid / due) * 100 : 0;

    return {
      incomeMonth: month.income,
      expensesMonth: month.expenses,
      netBalance: month.income - month.expenses,
      collectionRateYTD,
      incomeYear: year.income,
      expensesYear: year.expenses,
      netBalanceYear: year.income - year.expenses,
    };
  }

  // Completed receipts by settlement (else payment) date, and cash out as
  // expenses plus paid payroll, over an inclusive date range.
  private async getCashTotals(from: string, to: string) {
    const [incomeRow] = await this.db
      .select({
        total: sql<string>`COALESCE(SUM(${payments.amount}), 0)`,
      })
      .from(payments)
      .where(
        and(
          eq(payments.status, 'completed'),
          sql`COALESCE(${payments.settledDate}, ${payments.paymentDate}) >= ${from}`,
          sql`COALESCE(${payments.settledDate}, ${payments.paymentDate}) <= ${to}`,
        ),
      );

    const [expensesRow] = await this.db
      .select({
        total: sql<string>`COALESCE(SUM(${expenses.amount}), 0)`,
      })
      .from(expenses)
      .where(
        and(
          gte(expenses.expenseDate, from),
          lte(expenses.expenseDate, to),
        ),
      );

    // Payroll is a separate cash-out source (payslips, not expenses).
    const [payrollRow] = await this.db
      .select({
        total: sql<string>`COALESCE(SUM(${payslips.netAmount}), 0)`,
      })
      .from(payslips)
      .where(
        and(
          eq(payslips.status, 'paid'),
          gte(payslips.paymentDate, from),
          lte(payslips.paymentDate, to),
        ),
      );

    return {
      income: Number(incomeRow?.total ?? 0),
      expenses: Number(expensesRow?.total ?? 0) + Number(payrollRow?.total ?? 0),
    };
  }

  async getTrend(financeYear: FinanceYear) {
    // One point per month of the year's reporting interval.
    const { reportingStartsOn: windowStart, reportingEndsOn: windowEnd } = financeYear;

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

    const monthly = monthsBetween(windowStart, windowEnd).map((key) => ({
      month: key,
      income: incomeMap.get(key) ?? 0,
      expenses: expenseMap.get(key) ?? 0,
    }));

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

  /** Expense breakdown by category over a year's reporting interval. */
  async getExpenseBreakdown(financeYear: FinanceYear) {
    const { reportingStartsOn: windowStart, reportingEndsOn: windowEnd } = financeYear;

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

  /**
   * Collection rate (paid / due) per class for a given academic year. The
   * class is the one the student last sat in that year, from the year's dated
   * placements. Only the active year may fall back to a student's current
   * class, which is that year's class; for any other year the current class
   * would be a false one, so an undated student counts under "No class".
   */
  async getCollectionByClass(
    academicYear: string,
    context: { academicYearId: string | null; isActiveYear: boolean },
  ) {
    const today = formatDateOnly(getBusinessDate()) as string;

    // One placement per enrollment, so a transfer does not count a fee twice.
    // An unregistered label has no enrollments, so nothing joins.
    const lastPlacement = this.db.selectDistinctOn(
      [studentEnrollmentPlacements.enrollmentId], {
        enrollmentId: studentEnrollmentPlacements.enrollmentId,
        classId: studentEnrollmentPlacements.classId,
      },
    ).from(studentEnrollmentPlacements)
      .innerJoin(studentEnrollments, eq(studentEnrollmentPlacements.enrollmentId, studentEnrollments.id))
      .where(eq(studentEnrollments.academicYearId, context.academicYearId ?? ''))
      .orderBy(
        studentEnrollmentPlacements.enrollmentId,
        desc(studentEnrollmentPlacements.validFrom),
        desc(studentEnrollmentPlacements.id),
      ).as('collection_last_placement');
    const yearClassId = context.isActiveYear
      ? sql`COALESCE(${lastPlacement.classId}, ${students.classId})`
      : lastPlacement.classId;

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
      .leftJoin(studentEnrollments, and(
        eq(studentEnrollments.studentId, students.id),
        eq(studentEnrollments.academicYearId, context.academicYearId ?? ''),
      ))
      .leftJoin(lastPlacement, eq(lastPlacement.enrollmentId, studentEnrollments.id))
      .leftJoin(classes, and(eq(classes.id, yearClassId), eq(classes.academicYear, academicYear)))
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
}
