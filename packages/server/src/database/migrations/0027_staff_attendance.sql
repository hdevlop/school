ALTER TABLE "attendance" ADD COLUMN IF NOT EXISTS "staff_id" text;--> statement-breakpoint
UPDATE "attendance"
SET "staff_id" = "teachers"."staff_id"
FROM "teachers"
WHERE "attendance"."teacher_id" = "teachers"."id"
  AND "attendance"."staff_id" IS NULL;--> statement-breakpoint
CREATE TYPE "public"."attendanceType_new" AS ENUM('student', 'staff');--> statement-breakpoint
ALTER TABLE "attendance" ALTER COLUMN "type" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "attendance" ALTER COLUMN "type" TYPE "public"."attendanceType_new"
USING (
  CASE
    WHEN "type"::text = 'teacher' THEN 'staff'
    ELSE "type"::text
  END
)::"public"."attendanceType_new";--> statement-breakpoint
DROP TYPE "public"."attendanceType";--> statement-breakpoint
ALTER TYPE "public"."attendanceType_new" RENAME TO "attendanceType";--> statement-breakpoint
ALTER TABLE "attendance" ALTER COLUMN "type" SET DEFAULT 'student';--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "attendance" ADD CONSTRAINT "attendance_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
