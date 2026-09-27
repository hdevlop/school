CREATE TABLE "academic_year_transition_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"source_academic_year_id" text NOT NULL,
	"target_academic_year_id" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"payload_hash" text NOT NULL,
	"preview_hash" text NOT NULL,
	"input" jsonb NOT NULL,
	"outcomes" jsonb NOT NULL,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "academic_year_transition_runs" ADD CONSTRAINT "academic_year_transition_runs_source_academic_year_id_academic_years_id_fk" FOREIGN KEY ("source_academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academic_year_transition_runs" ADD CONSTRAINT "academic_year_transition_runs_target_academic_year_id_academic_years_id_fk" FOREIGN KEY ("target_academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academic_year_transition_runs" ADD CONSTRAINT "academic_year_transition_runs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "academic_year_transition_runs_key_unique" ON "academic_year_transition_runs" USING btree ("idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "academic_year_transition_runs_target_unique" ON "academic_year_transition_runs" USING btree ("target_academic_year_id");--> statement-breakpoint
