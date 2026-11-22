-- A subject's Arabic name, and a sub-subject list per level (a class name,
-- CE2 or 3APG, kept from year to year) next to the school's own list.
ALTER TABLE "subjects" ADD COLUMN IF NOT EXISTS "name_ar" text;
--> statement-breakpoint
ALTER TABLE "sub_subjects" ADD COLUMN IF NOT EXISTS "level" text;
--> statement-breakpoint
-- A name may now repeat across levels (always under the same subject, which
-- SubjectValidator checks); within one list it is still unique.
DROP INDEX IF EXISTS "sub_subjects_name_unique";
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "sub_subjects_level_name_unique" ON "sub_subjects" (lower(btrim(coalesce("level", ''))), lower(btrim("name")));
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "subject_level_lists" (
  "id" text PRIMARY KEY NOT NULL,
  "subject_id" text NOT NULL REFERENCES "subjects"("id") ON DELETE cascade,
  "level" text NOT NULL,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "subject_level_lists_subject_level_unique" ON "subject_level_lists" ("subject_id", lower(btrim("level")));
--> statement-breakpoint
-- The catalogue listed each subject's Arabic name as one of its own
-- sub-subjects, so Planning's Arabic rows found the subject. That name moves to
-- name_ar, where it still finds it; only these exact defaults move.
WITH alias("code", "name") AS (VALUES
  ('AR', 'اللغة العربية'), ('EI', 'التربية الإسلامية'), ('SCI', 'النشاط العلمي'),
  ('ART', 'التربية الفنية'), ('HG', 'الاجتماعيات')
), moved AS (
  UPDATE "subjects" subject SET "name_ar" = alias."name", "updated_at" = now()
  FROM alias
  WHERE upper(btrim(subject."code")) = alias."code" AND subject."name_ar" IS NULL
    AND EXISTS (SELECT 1 FROM "sub_subjects" part WHERE part."subject_id" = subject."id" AND part."level" IS NULL AND lower(btrim(part."name")) = lower(alias."name"))
  RETURNING subject."id", alias."name"
)
DELETE FROM "sub_subjects" part USING moved
WHERE part."subject_id" = moved."id" AND part."level" IS NULL AND lower(btrim(part."name")) = lower(moved."name");
--> statement-breakpoint
-- Editing a level's sub-subjects: the school-wide roles every subject, a
-- teacher the subjects they teach in that level (SubjectValidator.ensureMayEditLevel).
INSERT INTO "permissions" ("id", "name", "description", "resource", "action") VALUES
  ('school-update-sub-subjects', 'update:sub-subjects', 'Permission to edit a level''s sub-subjects: every subject school-wide, a teacher''s own subjects in their levels otherwise', 'sub-subjects', 'update')
ON CONFLICT ("name") DO NOTHING;
--> statement-breakpoint
WITH added AS (
  INSERT INTO "role_permissions" ("role_id", "permission_id")
  SELECT role."id", grant_."id"
  FROM "roles" role
  JOIN "permissions" grant_ ON grant_."name" = 'update:sub-subjects'
  WHERE role."name" = 'teacher'
     OR role."id" IN (
       SELECT held."role_id" FROM "role_permissions" held
       JOIN "permissions" old ON old."id" = held."permission_id" AND old."name" = 'update:subjects'
     )
  ON CONFLICT DO NOTHING
  RETURNING "role_id"
)
-- Existing claims lack the new grant. Invalidate affected sessions once.
UPDATE "tokens" SET "status" = 'revoked', "updated_at" = now()
WHERE "status" = 'active' AND "user_id" IN (
  SELECT "id" FROM "users" WHERE "role_id" IN (SELECT "role_id" FROM added)
);
