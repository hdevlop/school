import { index, pgTable, text } from 'drizzle-orm/pg-core';

import { idField, moneyField, timestamps } from '../../../database/shared';
import { feeInstallmentRef, feeRef } from '../fees/feeSchema';
import { paymentRef } from '../payments/paymentSchema';

export const paymentAllocations = pgTable('payment_allocations', {
  id: idField(10),
  paymentId: paymentRef(),
  feeId: feeRef(),
  installmentId: feeInstallmentRef(),
  amount: moneyField('amount').notNull(),
  type: text('type').default('fee'),
  notes: text('notes'),
  ...timestamps,
}, (table) => [
  // Fee reads sum allocations per fee, installment and payment row by row;
  // without these each lookup scans the whole table.
  index('payment_allocations_fee_idx').on(table.feeId),
  index('payment_allocations_installment_idx').on(table.installmentId),
  index('payment_allocations_payment_idx').on(table.paymentId),
]);
