import { pgTable, text } from 'drizzle-orm/pg-core';

import { idField, moneyField, timestamps } from '@server/database/shared';
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
});
