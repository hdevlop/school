import { Repository } from '@server/najm';
import { and, desc, eq, sql } from 'drizzle-orm';
import { financialNotificationDeliveries, feeInstallments, fees, students, payments } from '@server/database/schema';
import { DB } from '@server/database/db';
import { formatDateOnly } from '../utils/dateOnly';

const CRON_SECRET_ENV = 'FINANCIAL_CRON_SECRET';

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export function checkCronSecret(provided: string | null | undefined): boolean {
  const expected = process.env[CRON_SECRET_ENV];
  if (!expected) return false;
  if (!provided) return false;
  return timingSafeEqual(provided, expected);
}

@Repository()
export class NotificationRepository {
  declare db: DB;

  async tryClaimDelivery(input: {
    kind: string;
    studentId: string;
    businessDate: string;
    payload: any;
  }): Promise<{ claimed: boolean; row?: any }> {
    const [row] = await this.db
      .insert(financialNotificationDeliveries)
      .values({
        kind: input.kind,
        studentId: input.studentId,
        businessDate: input.businessDate,
        payload: input.payload,
      })
      .onConflictDoNothing()
      .returning();
    return row ? { claimed: true, row } : { claimed: false };
  }

  async listRecent(limit = 50) {
    return await this.db
      .select()
      .from(financialNotificationDeliveries)
      .orderBy(desc(financialNotificationDeliveries.createdAt))
      .limit(limit);
  }

  /**
   * Find students with at least one unpaid overdue installment on the given
   * business date, including partially paid overdue installments.
   */
  async getStudentsWithOverdueInstallments(businessDate: string) {
    const rows = await this.db
      .select({
        studentId: fees.studentId,
        studentName: students.name,
        installmentCount: sql<number>`COUNT(${feeInstallments.id})::int`,
        totalUnpaid: sql<string>`COALESCE(SUM(${feeInstallments.amount} - ${feeInstallments.paidAmount}), 0)`,
        oldestDueDate: sql<string>`MIN(${feeInstallments.dueDate})`,
      })
      .from(feeInstallments)
      .innerJoin(fees, eq(feeInstallments.feeId, fees.id))
      .innerJoin(students, eq(fees.studentId, students.id))
      .where(
        and(
          sql`${feeInstallments.dueDate} < ${businessDate}`,
          sql`${feeInstallments.amount} - ${feeInstallments.paidAmount} > 0`,
        ),
      )
      .groupBy(fees.studentId, students.name);
    return rows.map((r) => ({
      studentId: r.studentId,
      studentName: r.studentName,
      installmentCount: Number(r.installmentCount),
      totalUnpaid: Number(r.totalUnpaid),
      oldestDueDate: r.oldestDueDate,
    }));
  }

  async getStudentsWithChecksDueInWindow(businessDate: string, daysAhead: number) {
    const rows = await this.db
      .select({
        studentId: students.id,
        studentName: students.name,
        paymentId: payments.id,
        checkNumber: payments.checkNumber,
        checkDueDate: payments.checkDueDate,
        amount: payments.amount,
        status: payments.status,
      })
      .from(payments)
      .innerJoin(students, eq(payments.studentId, students.id))
      .where(
        and(
          eq(payments.paymentMethod, 'check'),
          sql`${payments.status} IN ('pending', 'deposited')`,
          sql`${payments.checkDueDate} >= ${businessDate}`,
          sql`${payments.checkDueDate} <= (${businessDate}::date + INTERVAL '${sql.raw(String(daysAhead))} days')`,
        ),
      )
      .orderBy(payments.checkDueDate);
    return rows.map((r) => ({
      studentId: r.studentId,
      studentName: r.studentName,
      paymentId: r.paymentId,
      checkNumber: r.checkNumber,
      checkDueDate: r.checkDueDate,
      amount: Number(r.amount),
      status: r.status,
    }));
  }
}
