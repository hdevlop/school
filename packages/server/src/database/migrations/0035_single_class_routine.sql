WITH "ranked_routines" AS (
  SELECT
    "id",
    row_number() OVER (
      PARTITION BY "section_id", "academic_year"
      ORDER BY
        CASE WHEN "status" = 'published' THEN 0 ELSE 1 END,
        "updated_at" DESC NULLS LAST,
        "created_at" DESC NULLS LAST
    ) AS "position"
  FROM "routine_schedules"
  WHERE "status" IN ('draft', 'published')
)
UPDATE "routine_schedules"
SET "status" = 'archived', "updated_at" = now()
WHERE "id" IN (
  SELECT "id" FROM "ranked_routines" WHERE "position" > 1
);
--> statement-breakpoint
DROP INDEX IF EXISTS "routine_schedules_section_year_status_unique";
--> statement-breakpoint
CREATE UNIQUE INDEX "routine_schedules_section_year_status_unique"
  ON "routine_schedules" USING btree ("section_id", "academic_year")
  WHERE "status" IN ('draft', 'published');
