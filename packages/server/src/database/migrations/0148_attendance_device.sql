-- Staff attendance from a fingerprint terminal (ZKTeco F18, ADMS push). The
-- device posts each scan; a scan marks its staff member present or late, and
-- the end-of-day close marks expected staff with no scan absent. Permanent
-- (monthly) staff keep the school's fixed hours (late after the arrival time);
-- a vacataire (hourly) is late after their first lesson minus the lead minutes.
-- A mark records who wrote it, so a scan never replaces a person's.
DO $$ BEGIN
  CREATE TYPE "public"."attendanceSource" AS ENUM('manual', 'device', 'auto');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "attendance" ADD COLUMN IF NOT EXISTS "source" "attendanceSource" DEFAULT 'manual' NOT NULL;
--> statement-breakpoint
ALTER TABLE "staff" ADD COLUMN IF NOT EXISTS "device_user_id" text;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "staff" ADD CONSTRAINT "staff_device_user_id_unique" UNIQUE("device_user_id");
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "staff_arrival_time" text DEFAULT '08:15' NOT NULL;
--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "staff_departure_time" text DEFAULT '15:45' NOT NULL;
--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "hourly_staff_lead_minutes" integer DEFAULT 5 NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "attendance_devices" (
  "id" text PRIMARY KEY NOT NULL,
  "serial_number" text NOT NULL,
  "last_seen_at" timestamp,
  "closed_through" date,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now(),
  CONSTRAINT "attendance_devices_serial_number_unique" UNIQUE("serial_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "attendance_device_users" (
  "id" text PRIMARY KEY NOT NULL,
  "device_id" text NOT NULL,
  "device_user_id" text NOT NULL,
  "name" text,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "attendance_device_users" ADD CONSTRAINT "attendance_device_users_device_id_attendance_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."attendance_devices"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "attendance_device_users_device_user_unique" ON "attendance_device_users" USING btree ("device_id", "device_user_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "attendance_device_punches" (
  "id" text PRIMARY KEY NOT NULL,
  "device_id" text NOT NULL,
  "device_user_id" text NOT NULL,
  "punched_at" timestamp NOT NULL,
  "staff_id" text,
  "created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "attendance_device_punches" ADD CONSTRAINT "attendance_device_punches_device_id_attendance_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."attendance_devices"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "attendance_device_punches" ADD CONSTRAINT "attendance_device_punches_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "attendance_device_punches_unique" ON "attendance_device_punches" USING btree ("device_id", "device_user_id", "punched_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "attendance_device_punches_punched_at_idx" ON "attendance_device_punches" USING btree ("punched_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "attendance_device_punches_user_idx" ON "attendance_device_punches" USING btree ("device_user_id");
