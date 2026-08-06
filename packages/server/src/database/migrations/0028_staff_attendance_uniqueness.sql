WITH ranked_staff_attendance AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "staff_id", "date"
      ORDER BY "updated_at" DESC NULLS LAST, "created_at" DESC NULLS LAST, "id" DESC
    ) AS duplicate_rank
  FROM "attendance"
  WHERE "type" = 'staff' AND "staff_id" IS NOT NULL
)
DELETE FROM "attendance"
WHERE "id" IN (
  SELECT "id"
  FROM ranked_staff_attendance
  WHERE duplicate_rank > 1
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "attendance_staff_date_unique"
ON "attendance" USING btree ("staff_id", "date")
WHERE "type" = 'staff';
