import { date, index, pgTable, text, uniqueIndex } from 'drizzle-orm/pg-core';
import { idField, timestamps } from '../../database/shared';

export const academicYears = pgTable('academic_years', {
  id: idField(),
  label: text('label').notNull(),
  instructionStartsOn: date('instruction_starts_on').notNull(),
  instructionEndsOn: date('instruction_ends_on').notNull(),
  reportingStartsOn: date('reporting_starts_on').notNull(),
  reportingEndsOn: date('reporting_ends_on').notNull(),
  paymentCloseoutOn: date('payment_closeout_on').notNull(),
  status: text('status').notNull().default('draft'),
  provenance: text('provenance').notNull(),
  provenanceNote: text('provenance_note'),
  createdBy: text('created_by'),
  updatedBy: text('updated_by'),
  ...timestamps,
}, (table) => [
  uniqueIndex('academic_years_label_unique').on(table.label),
  index('academic_years_reporting_idx').on(table.reportingStartsOn, table.reportingEndsOn),
]);
