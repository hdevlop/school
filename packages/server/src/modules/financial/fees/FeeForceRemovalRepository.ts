import { Repository } from '../../../najm';
import { and, asc, eq, inArray, or } from 'drizzle-orm';
import { DB } from '../../../database/db';
import { paymentAllocations, payments, studentCreditApplications, studentCreditLots } from '../../../database/schema';

@Repository()
export class FeeForceRemovalRepository {
  declare db: DB;

  // Receipt mutations lock their payment first. Include receipts whose linked
  // fee has a different student, so legacy links cannot escape the lock.
  async lockPayments(studentId: string, feeId: string) {
    const linkedPayments = this.db.select({ id: paymentAllocations.paymentId })
      .from(paymentAllocations).where(eq(paymentAllocations.feeId, feeId));
    return this.db.select().from(payments)
      .where(or(eq(payments.studentId, studentId), inArray(payments.id, linkedPayments)))
      .orderBy(asc(payments.id)).for('update');
  }

  // Match credit application lock order: lots before the fee schedule.
  async lockCreditLots(studentId: string, paymentIds: string[]) {
    return this.db.select().from(studentCreditLots)
      .where(or(eq(studentCreditLots.studentId, studentId), paymentIds.length
        ? inArray(studentCreditLots.sourcePaymentId, paymentIds) : undefined))
      .orderBy(asc(studentCreditLots.createdAt), asc(studentCreditLots.id)).for('update');
  }

  async getAllocations(feeId: string) {
    return this.db.select().from(paymentAllocations)
      .where(eq(paymentAllocations.feeId, feeId)).orderBy(asc(paymentAllocations.id));
  }

  async getCreditApplications(feeId: string) {
    return this.db.select().from(studentCreditApplications)
      .where(eq(studentCreditApplications.feeId, feeId)).orderBy(asc(studentCreditApplications.id));
  }

  async saveCredit(input: {
    id?: string; studentId: string; sourcePaymentId: string;
    originalAmount: string; remainingAmount: string; status: string;
  }) {
    const { id, ...values } = input;
    const [lot] = id
      ? await this.db.update(studentCreditLots).set(values)
        .where(and(eq(studentCreditLots.id, id), eq(studentCreditLots.sourcePaymentId, values.sourcePaymentId))).returning()
      : await this.db.insert(studentCreditLots).values(values).returning();
    return lot;
  }
}
