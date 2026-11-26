-- A certificate reward records its place (1st, 2nd, 3rd) when it is given, so
-- its certificate prints from the record, signed by the teacher who gave it.
-- Other reward types hold none.
DO $$ BEGIN
  CREATE TYPE "public"."behavior_reward_certificate_place" AS ENUM('first', 'second', 'third');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "behavior_rewards" ADD COLUMN IF NOT EXISTS "certificate_place" "behavior_reward_certificate_place";
