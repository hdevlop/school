ALTER TABLE "announcements" ADD COLUMN IF NOT EXISTS "class_ids" jsonb;
--> statement-breakpoint
UPDATE "announcements"
SET "class_ids" = jsonb_build_array("class_id")
WHERE "class_id" IS NOT NULL
  AND "class_ids" IS NULL;
--> statement-breakpoint
UPDATE "announcements"
SET "class_ids" = jsonb_build_array("sections"."class_id")
FROM "sections"
WHERE "announcements"."section_id" = "sections"."id"
  AND "announcements"."class_ids" IS NULL;
--> statement-breakpoint
UPDATE "announcements"
SET "section_id" = NULL
WHERE "section_id" IS NOT NULL;
