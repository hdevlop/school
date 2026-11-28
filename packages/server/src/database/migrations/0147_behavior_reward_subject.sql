-- A reward may name the subject its behavior was in, so the list filters by
-- subject. Optional: a reward outside a lesson names none, and deleting a
-- subject keeps its rewards.
ALTER TABLE "behavior_rewards" ADD COLUMN IF NOT EXISTS "subject_id" text;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "behavior_rewards" ADD CONSTRAINT "behavior_rewards_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "behavior_rewards_subject_idx" ON "behavior_rewards" USING btree ("subject_id");
