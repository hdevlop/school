UPDATE "attendance" SET "status" = 'absent' WHERE "status" = 'excused';--> statement-breakpoint
UPDATE "attendance_history" SET "old_status" = 'absent' WHERE "old_status" = 'excused';--> statement-breakpoint
UPDATE "attendance_history" SET "new_status" = 'absent' WHERE "new_status" = 'excused';--> statement-breakpoint
UPDATE "event_participants" SET "attendance_status" = 'absent' WHERE "attendance_status" = 'excused';--> statement-breakpoint
CREATE TYPE "public"."attendanceStatus_new" AS ENUM('present', 'absent', 'late');--> statement-breakpoint
ALTER TABLE "attendance" ALTER COLUMN "status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "attendance" ALTER COLUMN "status" TYPE "public"."attendanceStatus_new"
USING "status"::text::"public"."attendanceStatus_new";--> statement-breakpoint
ALTER TABLE "attendance_history" ALTER COLUMN "old_status" TYPE "public"."attendanceStatus_new"
USING "old_status"::text::"public"."attendanceStatus_new";--> statement-breakpoint
ALTER TABLE "attendance_history" ALTER COLUMN "new_status" TYPE "public"."attendanceStatus_new"
USING "new_status"::text::"public"."attendanceStatus_new";--> statement-breakpoint
ALTER TABLE "event_participants" ALTER COLUMN "attendance_status" TYPE "public"."attendanceStatus_new"
USING "attendance_status"::text::"public"."attendanceStatus_new";--> statement-breakpoint
DROP TYPE "public"."attendanceStatus";--> statement-breakpoint
ALTER TYPE "public"."attendanceStatus_new" RENAME TO "attendanceStatus";--> statement-breakpoint
ALTER TABLE "attendance" ALTER COLUMN "status" SET DEFAULT 'present';
