-- Contrôles as records: their days, classes and subjects (none listed: every
-- subject). Each class numbers its Contrôles of a semester in each subject in
-- date order, the Massar Contrôle they feed. A year without any keeps reading
-- them from Planning's months; the first one saved keeps those as records too.
CREATE TABLE IF NOT EXISTS "exam_controls" (
  "id" text PRIMARY KEY NOT NULL,
  "academic_year_id" text NOT NULL,
  "term" integer NOT NULL,
  "date_from" date NOT NULL,
  "date_to" date NOT NULL,
  "class_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "subject_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "created_by" text,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now(),
  CONSTRAINT "exam_controls_term_check" CHECK ("term" IN (1, 2)),
  CONSTRAINT "exam_controls_dates_check" CHECK ("date_from" <= "date_to")
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "exam_controls" ADD CONSTRAINT "exam_controls_academic_year_id_academic_years_id_fk"
    FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "exam_controls" ADD CONSTRAINT "exam_controls_created_by_users_id_fk"
    FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "exam_controls_year_idx" ON "exam_controls" USING btree ("academic_year_id");
--> statement-breakpoint
-- Who opens Contrôles: the principal for the school, a supervisor for the
-- classes they supervise (ExamPlanningValidator). A supervisor also sets the
-- day and time of their classes' exams in Planning.
INSERT INTO "permissions" ("id", "name", "description", "resource", "action") VALUES
  ('school-create-exam-controls', 'create:exam-controls', 'Permission to open a Contrôle: its days, classes and Massar Contrôle', 'exam-controls', 'create'),
  ('school-update-exam-controls', 'update:exam-controls', 'Permission to change a Contrôle''s days, classes or Massar Contrôle', 'exam-controls', 'update'),
  ('school-delete-exam-controls', 'delete:exam-controls', 'Permission to remove a Contrôle', 'exam-controls', 'delete')
ON CONFLICT ("name") DO NOTHING;
--> statement-breakpoint
WITH added AS (
  INSERT INTO "role_permissions" ("role_id", "permission_id")
  SELECT role."id", grant_."id"
  FROM "roles" role
  JOIN "permissions" grant_ ON grant_."name" IN ('create:exam-controls', 'update:exam-controls', 'delete:exam-controls')
  WHERE role."name" IN ('principal', 'supervisor')
  UNION
  SELECT role."id", grant_."id"
  FROM "roles" role
  JOIN "permissions" grant_ ON grant_."name" = 'update:exam-planning'
  WHERE role."name" = 'supervisor'
  ON CONFLICT DO NOTHING
  RETURNING "role_id"
)
-- Existing claims lack the new grants. Invalidate affected sessions once.
UPDATE "tokens" SET "status" = 'revoked', "updated_at" = now()
WHERE "status" = 'active' AND "user_id" IN (
  SELECT "id" FROM "users" WHERE "role_id" IN (SELECT "role_id" FROM added)
);
