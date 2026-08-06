ALTER TABLE "assessments" ADD COLUMN IF NOT EXISTS "section_ids" jsonb;
--> statement-breakpoint
UPDATE "assessments"
SET "section_ids" = jsonb_build_array("teacher_assignments"."section_id")
FROM "teacher_assignments"
WHERE "assessments"."teacher_assignment_id" = "teacher_assignments"."id"
  AND "assessments"."section_ids" IS NULL;
