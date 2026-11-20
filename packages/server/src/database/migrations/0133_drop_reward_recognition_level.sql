-- A reward no longer carries a recognition level: the reward type and the
-- points already say how big it is, and the level was a third input on every
-- reward a teacher records. Destructive: the stored levels are dropped.
DROP INDEX "behavior_rewards_recognition_level_idx";--> statement-breakpoint
ALTER TABLE "behavior_rewards" DROP COLUMN "recognition_level";--> statement-breakpoint
DROP TYPE "public"."behavior_recognition_level";