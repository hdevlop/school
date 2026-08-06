import { pgEnum, pgTable, text } from 'drizzle-orm/pg-core';

import { createRef, idField, moneyField, timestamps } from '@server/database/shared';
import { getEnumValues } from '@server/shared/enums';

export const feeTypeStatusEnum = pgEnum('feeTypeStatus', getEnumValues('feeTypeStatus'));
export const paymentTypeEnum = pgEnum('paymentType', getEnumValues('paymentType'));

export const feeTypes = pgTable('fee_types', {
  id: idField(),
  name: text('name').notNull(),
  description: text('description'),
  category: text('category').notNull(),
  amount: moneyField('amount').notNull(),
  paymentType: paymentTypeEnum('payment_type').notNull().default('recurring'),
  status: feeTypeStatusEnum('status').default('active'),
  ...timestamps,
});

export const feeTypeRef = createRef('fee_type_id', () => feeTypes.id, 'restrict');
