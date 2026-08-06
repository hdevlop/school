ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "class_ids" jsonb;
--> statement-breakpoint
UPDATE "events"
SET "class_ids" = jsonb_build_array("class_id")
WHERE "class_id" IS NOT NULL
  AND "class_ids" IS NULL;
