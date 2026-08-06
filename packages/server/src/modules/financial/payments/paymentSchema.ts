import { date, pgEnum, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

import {
  actionByRef,
  createRef,
  idField,
  moneyField,
  paymentMethodEnum,
  processedByRef,
  timestamps,
} from '@server/database/shared';
import { getEnumValues } from '@server/shared/enums';
import { studentRef } from '../../students/studentSchema';

export const paymentStatusEnum = pgEnum('paymentStatus', getEnumValues('paymentStatus'));

export const payments = pgTable('payments', {
  id: idField(10),
  studentId: studentRef(),
  amount: moneyField('amount').notNull(),
  paymentDate: date('payment_date').notNull(),
  paymentMethod: paymentMethodEnum('payment_method').notNull(),
  checkNumber: text('check_number'),
  checkDueDate: date('check_due_date'),
  checkBank: text('check_bank'),
  settledDate: date('settled_date'),
  statusChangedAt: timestamp('status_changed_at', { mode: 'string' }),
  bouncedReason: text('bounced_reason'),
  voidReason: text('void_reason'),
  voidedAt: timestamp('voided_at', { mode: 'string' }),
  voidedBy: actionByRef('voided_by'),
  transactionRef: text('transaction_ref'),
  receiptNumber: text('receipt_number').unique(),
  status: paymentStatusEnum('status').default('completed'),
  processedBy: processedByRef(),
  idempotencyKey: text('idempotency_key'),
  idempotencyHash: text('idempotency_hash'),
  notes: text('notes'),
  ...timestamps,
}, (table) => ({
  paymentsIdempotencyKeyUnique: uniqueIndex('payments_idempotency_key_unique')
    .on(table.idempotencyKey)
    .where(sql`${table.idempotencyKey} IS NOT NULL`),
}));

export const paymentRef = createRef('payment_id', () => payments.id);
