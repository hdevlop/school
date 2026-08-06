DO $$ BEGIN
  CREATE TYPE "public"."routineStatus" AS ENUM('draft', 'published', 'archived');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."routineDay" AS ENUM('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "routine_periods" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "start_time" time NOT NULL,
  "end_time" time NOT NULL,
  "sort_order" integer NOT NULL,
  "is_break" boolean DEFAULT false NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "routine_schedules" (
  "id" text PRIMARY KEY NOT NULL,
  "section_id" text NOT NULL,
  "academic_year" text NOT NULL,
  "name" text NOT NULL,
  "status" "routineStatus" DEFAULT 'draft' NOT NULL,
  "active_days" jsonb DEFAULT '["monday","tuesday","wednesday","thursday","friday","saturday"]'::jsonb NOT NULL,
  "published_at" timestamp,
  "published_by" text,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "routine_entries" (
  "id" text PRIMARY KEY NOT NULL,
  "schedule_id" text NOT NULL,
  "day_of_week" "routineDay" NOT NULL,
  "period_id" text NOT NULL,
  "teacher_assignment_id" text NOT NULL,
  "room_number" text,
  "notes" text,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "routine_schedules" ADD CONSTRAINT "routine_schedules_section_id_sections_id_fk"
    FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "routine_schedules" ADD CONSTRAINT "routine_schedules_published_by_users_id_fk"
    FOREIGN KEY ("published_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "routine_entries" ADD CONSTRAINT "routine_entries_schedule_id_routine_schedules_id_fk"
    FOREIGN KEY ("schedule_id") REFERENCES "public"."routine_schedules"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "routine_entries" ADD CONSTRAINT "routine_entries_period_id_routine_periods_id_fk"
    FOREIGN KEY ("period_id") REFERENCES "public"."routine_periods"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "routine_entries" ADD CONSTRAINT "routine_entries_teacher_assignment_id_teacher_assignments_id_fk"
    FOREIGN KEY ("teacher_assignment_id") REFERENCES "public"."teacher_assignments"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "routine_periods_sort_order_unique" ON "routine_periods" USING btree ("sort_order");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "routine_schedules_section_year_status_unique"
  ON "routine_schedules" USING btree ("section_id", "academic_year", "status")
  WHERE "status" in ('draft', 'published');
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "routine_schedules_section_year_idx" ON "routine_schedules" USING btree ("section_id", "academic_year");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "routine_entries_schedule_day_period_unique" ON "routine_entries" USING btree ("schedule_id", "day_of_week", "period_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "routine_entries_schedule_idx" ON "routine_entries" USING btree ("schedule_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "routine_entries_assignment_idx" ON "routine_entries" USING btree ("teacher_assignment_id");
--> statement-breakpoint
INSERT INTO "routine_periods" ("id", "name", "start_time", "end_time", "sort_order", "is_break", "is_active") VALUES
  ('period_01', 'Period 1', '08:00', '09:00', 1, false, true),
  ('period_02', 'Period 2', '09:00', '10:00', 2, false, true),
  ('period_03', 'Morning break', '10:00', '10:15', 3, true, true),
  ('period_04', 'Period 3', '10:15', '11:15', 4, false, true),
  ('period_05', 'Period 4', '11:15', '12:15', 5, false, true),
  ('period_06', 'Lunch break', '12:15', '13:15', 6, true, true),
  ('period_07', 'Period 5', '13:15', '14:15', 7, false, true),
  ('period_08', 'Period 6', '14:15', '15:15', 8, false, true)
ON CONFLICT ("id") DO NOTHING;

