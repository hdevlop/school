ALTER TABLE "staff" ADD COLUMN IF NOT EXISTS "email" text;--> statement-breakpoint
UPDATE "staff" AS "s"
SET "email" = "u"."email"
FROM "users" AS "u"
WHERE "s"."user_id" = "u"."id"
  AND "s"."email" IS NULL;--> statement-breakpoint
UPDATE "staff"
SET "email" = LOWER(REGEXP_REPLACE("employee_code", '[^a-zA-Z0-9]+', '', 'g')) || '@staff.school.local'
WHERE "email" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "staff_email_unique" ON "staff" USING btree ("email");
