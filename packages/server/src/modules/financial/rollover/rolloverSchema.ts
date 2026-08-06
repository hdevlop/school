import { boolean, integer, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

import { actionByRef, createRef, idField, timestamps } from '@server/database/shared';
import { studentRef } from '../../students/studentSchema';
import { feeTypeRef } from '../feeTypes/feeTypeSchema';
import { fees } from '../fees/feeSchema';

export const rolloverRunStatusEnum = pgEnum('rolloverRunStatus', ['pending', 'previewed', 'committed', 'failed', 'cancelled']);

export const rolloverRuns = pgTable('rollover_runs', {
  id: idField(),
  fromYear: text('from_year').notNull(),
  toYear: text('to_year').notNull(),
  status: rolloverRunStatusEnum('status').notNull().default('pending'),
  preview: jsonb('preview'),
  copyDiscounts: boolean('copy_discounts').notNull().default(false),
  includeOneTimeFees: boolean('include_one_time_fees').notNull().default(false),
  dryRun: boolean('dry_run').notNull().default(true),
  payloadHash: text('payload_hash').notNull(),
  idempotencyKey: text('idempotency_key'),
  totalStudents: integer('total_students').notNull().default(0),
  totalFees: integer('total_fees').notNull().default(0),
  totalSkipped: integer('total_skipped').notNull().default(0),
  totalErrors: integer('total_errors').notNull().default(0),
  startedBy: actionByRef('started_by'),
  committedAt: timestamp('committed_at'),
  completedAt: timestamp('completed_at'),
  ...timestamps,
}, (table) => ({
  idempotencyKeyUnique: uniqueIndex('rollover_runs_idempotency_unique')
    .on(table.idempotencyKey)
    .where(sql`${table.idempotencyKey} IS NOT NULL`),
  fromYearIdx: index('rollover_runs_from_year_idx').on(table.fromYear, table.toYear),
}));

export const rolloverRunItems = pgTable('rollover_run_items', {
  id: idField(),
  runId: createRef('rollover_run_id', () => rolloverRuns.id)(),
  studentId: studentRef(),
  feeTypeId: feeTypeRef(),
  feeId: createRef('fee_id', () => fees.id)('set null'),
  status: text('status').notNull(), // success | skipped | error
  reason: text('reason'),
  errorMessage: text('error_message'),
  ...timestamps,
}, (table) => ({
  runStudentIdx: index('rollover_run_items_run_student_idx').on(table.runId, table.studentId),
}));

export type RolloverRun = typeof rolloverRuns.$inferSelect;
export type NewRolloverRun = typeof rolloverRuns.$inferInsert;
export type RolloverRunItem = typeof rolloverRunItems.$inferSelect;
export type NewRolloverRunItem = typeof rolloverRunItems.$inferInsert;
