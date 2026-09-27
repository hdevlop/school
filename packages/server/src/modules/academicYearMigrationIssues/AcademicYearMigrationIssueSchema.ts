import { jsonb, pgTable, text, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { actionByRef, idField, timestamps } from '../../database/shared';

export const academicYearMigrationIssues = pgTable('academic_year_migration_issues', {
  id: idField(12),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  issueCode: text('issue_code').notNull(),
  academicYearLabel: text('academic_year_label').notNull().default(''),
  evidenceSource: text('evidence_source').notNull(),
  evidence: jsonb('evidence').$type<Record<string, string | null>>().notNull(),
  proposedResolution: text('proposed_resolution').notNull(),
  reviewStatus: text('review_status').notNull().default('open'),
  resolutionNote: text('resolution_note'),
  runId: text('run_id').notNull(),
  reviewedBy: actionByRef('reviewed_by'),
  reviewedAt: timestamp('reviewed_at'),
  ...timestamps,
}, (table) => [
  uniqueIndex('academic_year_issue_identity_unique').on(
    table.entityType, table.entityId, table.issueCode, table.academicYearLabel,
  ),
  index('academic_year_issue_review_idx').on(table.reviewStatus, table.entityType),
]);
