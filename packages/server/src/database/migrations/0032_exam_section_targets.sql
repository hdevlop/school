ALTER TABLE "exams" ADD COLUMN IF NOT EXISTS "section_ids" jsonb;
--> statement-breakpoint
UPDATE "exams"
SET "section_ids" = jsonb_build_array("teacher_assignments"."section_id")
FROM "teacher_assignments"
WHERE "exams"."teacher_assignment_id" = "teacher_assignments"."id"
  AND "exams"."section_ids" IS NULL;
