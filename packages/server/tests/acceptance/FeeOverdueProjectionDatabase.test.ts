import { expect, it } from 'bun:test';
import { sql } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import postgres from 'postgres';
import { getInstallmentIsOverdue, getOverdueInstallments } from '../../src/modules/financial/fees/FeeUtils';
import { getBusinessDateOnly } from '../../src/shared/businessDate';

// This test executes only VALUES-backed CTEs in a read-only transaction. It
// needs local PostgreSQL, but neither reads nor changes application records.
const url = process.env.SCHOOL_HISTORY_TEST_DB_URL ?? process.env.DB_URL;
if (!url || !['localhost', '127.0.0.1', '[::1]'].includes(new URL(url).hostname)) {
  throw new Error('Set SCHOOL_HISTORY_TEST_DB_URL or DB_URL to local PostgreSQL');
}

it('keeps the overdue count and installment warnings after a partial payment', async () => {
  const today = getBusinessDateOnly();
  const cases = [
    { id: 'unpaid', status: 'pending', amount: 1100, offset: -1, expected: true },
    { id: 'partial', status: 'partiallyPaid', amount: 1100, offset: -1, expected: true },
    { id: 'paid', status: 'paid', amount: 1100, offset: -1, expected: false },
    { id: 'covered', status: 'pending', amount: 100, offset: -1, expected: false },
    { id: 'cancelled', status: 'cancelled', amount: 100, offset: -1, expected: false },
    { id: 'today', status: 'partiallyPaid', amount: 100, offset: 0, expected: false },
    { id: 'future', status: 'partiallyPaid', amount: 100, offset: 1, expected: false },
    { id: 'pending-check', status: 'pending', amount: 100, offset: -1, expected: true },
    { id: 'deposited', status: 'pending', amount: 100, offset: -1, expected: true },
    { id: 'voided', status: 'partiallyPaid', amount: 100, offset: -1, expected: true },
    { id: 'bounced', status: 'partiallyPaid', amount: 100, offset: -1, expected: true },
    { id: 'overpaid', status: 'partiallyPaid', amount: 100, offset: -1, expected: false },
    { id: 'future-payment', status: 'pending', amount: 100, offset: -1, expected: true },
    { id: 'future-settlement', status: 'pending', amount: 100, offset: -1, expected: true },
    { id: 'zero', status: 'overdue', amount: 0, offset: -1, expected: false },
  ];
  const receipts = [
    { id: 'partial', status: 'completed', amount: 400, dateOffset: 0, settlementOffset: null },
    { id: 'paid', status: 'completed', amount: 1100, dateOffset: 0, settlementOffset: null },
    { id: 'covered', status: 'completed', amount: 100, dateOffset: 0, settlementOffset: null },
    { id: 'pending-check', status: 'pending', amount: 100, dateOffset: 0, settlementOffset: null },
    { id: 'deposited', status: 'deposited', amount: 100, dateOffset: 0, settlementOffset: null },
    { id: 'voided', status: 'voided', amount: 100, dateOffset: 0, settlementOffset: null },
    { id: 'bounced', status: 'bounced', amount: 100, dateOffset: 0, settlementOffset: null },
    { id: 'overpaid', status: 'completed', amount: 101, dateOffset: 0, settlementOffset: null },
    { id: 'future-payment', status: 'completed', amount: 100, dateOffset: 1, settlementOffset: null },
    { id: 'future-settlement', status: 'completed', amount: 100, dateOffset: -1, settlementOffset: 1 },
  ];
  const date = (offset: number) => sql`(${today}::date + ${offset}::int)`;
  const query = new PgDialect().sqlToQuery(sql`
    WITH fees(id) AS (VALUES ('fee')),
    fee_installments(id, fee_id, status, amount, due_date) AS (VALUES
      ${sql.join(cases.map(row => sql`(${row.id}, 'fee', ${row.status}, ${row.amount}::numeric, ${date(row.offset)})`), sql`, `)}
    ),
    payments(id, status, payment_date, settled_date) AS (VALUES
      ${sql.join(receipts.map(row => sql`(${row.id}, ${row.status}, ${date(row.dateOffset)},
        ${row.settlementOffset == null ? sql`NULL::date` : date(row.settlementOffset)})`), sql`, `)}
    ),
    payment_allocations(payment_id, installment_id, amount) AS (VALUES
      ${sql.join(receipts.map(row => sql`(${row.id}, ${row.id}, ${row.amount}::numeric)`), sql`, `)}
    )
    SELECT ${getOverdueInstallments()} AS count,
      (SELECT json_agg(json_build_object('id', id, 'isOverdue', ${getInstallmentIsOverdue()}))
       FROM fee_installments) AS installments
    FROM fees
  `);
  const client = postgres(url, { max: 1, prepare: false });
  try {
    const [result] = await client.begin('read only', tx => tx.unsafe(query.sql, query.params as (string | number)[]));
    expect(result.count).toBe(cases.filter(row => row.expected).length);
    expect(Object.fromEntries(result.installments.map(row => [row.id, row.isOverdue])))
      .toEqual(Object.fromEntries(cases.map(row => [row.id, row.expected])));
  } finally {
    await client.end();
  }
});
