ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "address_place_id" text;
--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "address_latitude" double precision;
--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "address_longitude" double precision;
--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "school_address_place_id" text;
--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "school_address_latitude" double precision;
--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "school_address_longitude" double precision;
--> statement-breakpoint
ALTER TABLE "student_routes" ADD COLUMN IF NOT EXISTS "pickup_place_id" text;
--> statement-breakpoint
ALTER TABLE "student_routes" ADD COLUMN IF NOT EXISTS "pickup_latitude" double precision;
--> statement-breakpoint
ALTER TABLE "student_routes" ADD COLUMN IF NOT EXISTS "pickup_longitude" double precision;
--> statement-breakpoint
ALTER TABLE "student_routes" ADD COLUMN IF NOT EXISTS "dropoff_place_id" text;
--> statement-breakpoint
ALTER TABLE "student_routes" ADD COLUMN IF NOT EXISTS "dropoff_latitude" double precision;
--> statement-breakpoint
ALTER TABLE "student_routes" ADD COLUMN IF NOT EXISTS "dropoff_longitude" double precision;
--> statement-breakpoint
ALTER TYPE "public"."feeInstallmentStatus" ADD VALUE IF NOT EXISTS 'cancelled';
--> statement-breakpoint
WITH ranked_active_routes AS (
  SELECT
    "id",
    row_number() OVER (
      PARTITION BY "student_id"
      ORDER BY "assignment_date" DESC NULLS LAST, "created_at" DESC, "id" DESC
    ) AS active_rank
  FROM "student_routes"
  WHERE "status" = 'active'
)
UPDATE "student_routes"
SET
  "status" = 'completed',
  "unassignment_date" = COALESCE("unassignment_date", CURRENT_DATE),
  "updated_at" = NOW()
WHERE "id" IN (
  SELECT "id" FROM ranked_active_routes WHERE active_rank > 1
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "student_routes_active_student_unique"
  ON "student_routes" USING btree ("student_id")
  WHERE "status" = 'active';
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "student_routes_active_vehicle_idx"
  ON "student_routes" USING btree ("vehicle_id")
  WHERE "status" = 'active';
