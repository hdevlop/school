import { jsonb, pgTable, text, uniqueIndex } from 'drizzle-orm/pg-core';
import { actionByRef, idField, timestamps } from '../../database/shared';
import { academicYears } from '../academicYears/AcademicYearSchema';

export const academicYearTransitionRuns = pgTable('academic_year_transition_runs', {
  id: idField(),
  sourceAcademicYearId: text('source_academic_year_id').notNull()
    .references(() => academicYears.id, { onDelete: 'restrict' }),
  targetAcademicYearId: text('target_academic_year_id').notNull()
    .references(() => academicYears.id, { onDelete: 'restrict' }),
  idempotencyKey: text('idempotency_key').notNull(),
  payloadHash: text('payload_hash').notNull(),
  previewHash: text('preview_hash').notNull(),
  input: jsonb('input').notNull(),
  outcomes: jsonb('outcomes').notNull(),
  createdBy: actionByRef('created_by'),
  ...timestamps,
}, (table) => [
  uniqueIndex('academic_year_transition_runs_key_unique').on(table.idempotencyKey),
  uniqueIndex('academic_year_transition_runs_target_unique').on(table.targetAcademicYearId),
]);
