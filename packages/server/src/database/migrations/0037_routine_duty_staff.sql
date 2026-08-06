ALTER TABLE "routine_duties" ADD COLUMN IF NOT EXISTS "staff_id" text;
--> statement-breakpoint
UPDATE "routine_duties" AS "duty"
SET "staff_id" = "teacher"."staff_id"
FROM "teachers" AS "teacher"
WHERE "duty"."teacher_id" = "teacher"."id"
  AND "duty"."staff_id" IS NULL;
--> statement-breakpoint
ALTER TABLE "routine_duties" ALTER COLUMN "staff_id" SET NOT NULL;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "routine_duties" ADD CONSTRAINT "routine_duties_staff_id_staff_id_fk"
    FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DROP INDEX IF EXISTS "routine_duties_teacher_idx";
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "routine_duties_staff_idx" ON "routine_duties" USING btree ("staff_id");
--> statement-breakpoint
ALTER TABLE "routine_duties" DROP CONSTRAINT IF EXISTS "routine_duties_teacher_id_teachers_id_fk";
--> statement-breakpoint
ALTER TABLE "routine_duties" DROP COLUMN IF EXISTS "teacher_id";
