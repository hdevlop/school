ALTER TABLE "routine_schedules"
  ADD COLUMN IF NOT EXISTS "layout_config" jsonb
  DEFAULT '{"startTime":"08:00","lessonDuration":60,"lessonCount":6,"breakEnabled":true,"breakAfter":2,"breakDuration":15,"lunchEnabled":true,"lunchAfter":4,"lunchDuration":60}'::jsonb
  NOT NULL;
--> statement-breakpoint
ALTER TABLE "routine_periods" ADD COLUMN IF NOT EXISTS "schedule_id" text;
--> statement-breakpoint
DROP INDEX IF EXISTS "routine_periods_sort_order_unique";
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "routine_periods" ADD CONSTRAINT "routine_periods_schedule_id_routine_schedules_id_fk"
    FOREIGN KEY ("schedule_id") REFERENCES "public"."routine_schedules"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
INSERT INTO "routine_periods" (
  "id", "schedule_id", "name", "start_time", "end_time", "sort_order", "is_break", "is_active"
)
SELECT
  substr(md5("schedule"."id" || ':' || "period"."id"), 1, 10),
  "schedule"."id",
  "period"."name",
  "period"."start_time",
  "period"."end_time",
  "period"."sort_order",
  "period"."is_break",
  "period"."is_active"
FROM "routine_schedules" AS "schedule"
CROSS JOIN "routine_periods" AS "period"
WHERE "period"."schedule_id" IS NULL
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
UPDATE "routine_entries" AS "entry"
SET "period_id" = substr(md5("entry"."schedule_id" || ':' || "entry"."period_id"), 1, 10)
WHERE EXISTS (
  SELECT 1
  FROM "routine_periods" AS "owned_period"
  WHERE "owned_period"."id" = substr(md5("entry"."schedule_id" || ':' || "entry"."period_id"), 1, 10)
    AND "owned_period"."schedule_id" = "entry"."schedule_id"
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "routine_periods_global_sort_order_unique"
  ON "routine_periods" USING btree ("sort_order") WHERE "schedule_id" IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "routine_periods_schedule_sort_order_unique"
  ON "routine_periods" USING btree ("schedule_id", "sort_order") WHERE "schedule_id" IS NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "routine_periods_schedule_idx"
  ON "routine_periods" USING btree ("schedule_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "routine_duties" (
  "id" text PRIMARY KEY NOT NULL,
  "schedule_id" text NOT NULL,
  "day_of_week" "routineDay" NOT NULL,
  "period_id" text NOT NULL,
  "teacher_id" text NOT NULL,
  "notes" text,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "routine_duties" ADD CONSTRAINT "routine_duties_schedule_id_routine_schedules_id_fk"
    FOREIGN KEY ("schedule_id") REFERENCES "public"."routine_schedules"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "routine_duties" ADD CONSTRAINT "routine_duties_period_id_routine_periods_id_fk"
    FOREIGN KEY ("period_id") REFERENCES "public"."routine_periods"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "routine_duties" ADD CONSTRAINT "routine_duties_teacher_id_teachers_id_fk"
    FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "routine_duties_schedule_day_period_unique"
  ON "routine_duties" USING btree ("schedule_id", "day_of_week", "period_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "routine_duties_teacher_idx" ON "routine_duties" USING btree ("teacher_id");
