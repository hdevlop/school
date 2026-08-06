import { pgTable, text, timestamp, uniqueIndex, check, index, foreignKey } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

import { actionByRef, createRef, idField, moneyField, timestamps } from '@server/database/shared';
import { studentRef } from '../../students/studentSchema';
import { payments } from '../payments/paymentSchema';
import { paymentAllocations } from '../allocations/allocationSchema';
import { feeInstallments, fees } from '../fees/feeSchema';

export const studentCreditLots = pgTable('student_credit_lots', {
  id: idField(),
  studentId: studentRef(),
  sourcePaymentId: createRef('source_payment_id', () => payments.id)(),
  originalAmount: moneyField('original_amount').notNull(),
  remainingAmount: moneyField('remaining_amount').notNull(),
  status: text('status').notNull(),
  ...timestamps,
}, (table) => ({
  sourcePaymentUnique: uniqueIndex('credit_lot_source_payment_unique')
    .on(table.sourcePaymentId),
  originalPositive: check('credit_lot_original_positive', sql`${table.originalAmount} > 0`),
  remainingNonNegative: check('credit_lot_remaining_nonneg', sql`${table.remainingAmount} >= 0`),
  remainingWithinOriginal: check('credit_lot_remaining_within', sql`${table.remainingAmount} <= ${table.originalAmount}`),
}));

export const studentCreditApplications = pgTable('student_credit_applications', {
  id: idField(),
  // FKs declared at table level below with explicit short names — the auto-derived
  // names exceed Postgres' 63-char identifier limit and caused a perpetual push diff.
  creditLotId: text('credit_lot_id').notNull(),
  feeId: createRef('fee_id', () => fees.id)(),
  installmentId: text('installment_id').notNull(),
  paymentAllocationId: text('payment_allocation_id').notNull(),
  amount: moneyField('amount').notNull(),
  status: text('status').notNull(),
  appliedBy: actionByRef('applied_by'),
  reversedAt: timestamp('reversed_at'),
  reversalReason: text('reversal_reason'),
  ...timestamps,
}, (table) => ({
  amountPositive: check('credit_application_amount_positive', sql`${table.amount} > 0`),
  studentIdx: index('credit_applications_credit_lot_idx').on(table.creditLotId, table.createdAt),
  creditLotFk: foreignKey({ columns: [table.creditLotId], foreignColumns: [studentCreditLots.id], name: 'cred_app_credit_lot_fk' }).onDelete('cascade'),
  installmentFk: foreignKey({ columns: [table.installmentId], foreignColumns: [feeInstallments.id], name: 'cred_app_installment_fk' }).onDelete('cascade'),
  paymentAllocationFk: foreignKey({ columns: [table.paymentAllocationId], foreignColumns: [paymentAllocations.id], name: 'cred_app_payment_alloc_fk' }).onDelete('cascade'),
}));

export type StudentCreditLot = typeof studentCreditLots.$inferSelect;
export type NewStudentCreditLot = typeof studentCreditLots.$inferInsert;
export type StudentCreditApplication = typeof studentCreditApplications.$inferSelect;
export type NewStudentCreditApplication = typeof studentCreditApplications.$inferInsert;
