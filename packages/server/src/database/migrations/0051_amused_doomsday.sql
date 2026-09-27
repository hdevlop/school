CREATE TABLE "academic_year_migration_issues" (
	"id" text PRIMARY KEY NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"issue_code" text NOT NULL,
	"academic_year_label" text DEFAULT '' NOT NULL,
	"evidence_source" text NOT NULL,
	"evidence" jsonb NOT NULL,
	"proposed_resolution" text NOT NULL,
	"review_status" text DEFAULT 'open' NOT NULL,
	"resolution_note" text,
	"run_id" text NOT NULL,
	"reviewed_by" text,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "academic_year_migration_issues" ADD CONSTRAINT "academic_year_migration_issues_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "academic_year_issue_identity_unique" ON "academic_year_migration_issues" USING btree ("entity_type","entity_id","issue_code","academic_year_label");--> statement-breakpoint
CREATE INDEX "academic_year_issue_review_idx" ON "academic_year_migration_issues" USING btree ("review_status","entity_type");--> statement-breakpoint
ALTER TABLE academic_year_migration_issues ADD CONSTRAINT academic_year_issue_status_check
CHECK (review_status IN ('open', 'resolved', 'dismissed'));
