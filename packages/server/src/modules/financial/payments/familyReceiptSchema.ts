import { pgTable, text, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

import { createRef, idField, processedByRef, timestamps } from '../../../database/shared';
import { parentRef } from '../../parents/parentSchema';

// One receipt handed to a parent who pays for several children at once. Each
// child keeps an ordinary payment of its own, linked here, so balances,
// credits, ownership and cheque handling stay per student. Method, date,
// cheque and status live on those payments, never twice.
export const familyReceipts = pgTable('family_receipts', {
  id: idField(10),
  receiptNumber: text('receipt_number').notNull().unique(),
  // The receipt outlives a deleted parent record: it is the school's history.
  parentId: parentRef('set null'),
  processedBy: processedByRef(),
  idempotencyKey: text('idempotency_key'),
  idempotencyHash: text('idempotency_hash'),
  ...timestamps,
}, (table) => ({
  familyReceiptsIdempotencyKeyUnique: uniqueIndex('family_receipts_idempotency_key_unique')
    .on(table.idempotencyKey)
    .where(sql`${table.idempotencyKey} IS NOT NULL`),
}));

export const familyReceiptRef = createRef('family_receipt_id', () => familyReceipts.id);
