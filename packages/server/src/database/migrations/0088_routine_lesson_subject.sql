ALTER TABLE "routine_entries" ALTER COLUMN "teacher_assignment_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "routine_entries" ADD COLUMN "subject_id" text;--> statement-breakpoint
-- Every existing lesson was its teacher assignment's subject; it keeps that
-- subject, and a lesson made from now on may name a subject with no teacher.
UPDATE "routine_entries" AS e
SET "subject_id" = a."subject_id"
FROM "teacher_assignments" AS a
WHERE a."id" = e."teacher_assignment_id" AND e."subject_id" IS NULL;--> statement-breakpoint
ALTER TABLE "routine_entries" ALTER COLUMN "subject_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "routine_entries" ADD CONSTRAINT "routine_entries_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "routine_entries_subject_idx" ON "routine_entries" USING btree ("subject_id");
