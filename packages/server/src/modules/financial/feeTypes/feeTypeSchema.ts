import { sql } from 'drizzle-orm';
import { pgEnum, pgTable, text, uniqueIndex } from 'drizzle-orm/pg-core';

import { createRef, idField, moneyField, timestamps } from '../../../database/shared';
import { getEnumValues } from '../../../shared/enums';

export const FEE_TYPE_NAME_UNIQUE = 'fee_types_name_normalized_unique';

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
}, (table) => ({
  // Names are compared without case or surrounding spaces, here and in
  // `FeeTypeRepository.getByName`; the service check alone let two concurrent
  // creates of one name both through.
  nameUnique: uniqueIndex(FEE_TYPE_NAME_UNIQUE).on(sql`lower(btrim(${table.name}))`),
}));

export const feeTypeRef = createRef('fee_type_id', () => feeTypes.id, 'restrict');
