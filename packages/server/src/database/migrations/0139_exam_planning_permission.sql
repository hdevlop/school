-- Saving a class's month of Planning (and reading what to pick from) now asks
-- for update:exam-planning instead of a school-wide role with update:exams, so
-- a teacher can plan the subjects they teach in their own classes
-- (ExamPlanningValidator.ensureMayChange). Every role that planned through
-- update:exams keeps planning, and the teacher role gets the new grant.
INSERT INTO "permissions" ("id", "name", "description", "resource", "action") VALUES
  ('school-update-exam-planning', 'update:exam-planning', 'Permission to plan exams: every class school-wide, a teacher''s own subjects otherwise', 'exam-planning', 'update')
ON CONFLICT ("name") DO NOTHING;
--> statement-breakpoint
WITH added AS (
  INSERT INTO "role_permissions" ("role_id", "permission_id")
  SELECT role."id", grant_."id"
  FROM "roles" role
  JOIN "permissions" grant_ ON grant_."name" = 'update:exam-planning'
  WHERE role."name" = 'teacher'
     OR role."id" IN (
       SELECT held."role_id" FROM "role_permissions" held
       JOIN "permissions" old ON old."id" = held."permission_id" AND old."name" = 'update:exams'
     )
  ON CONFLICT DO NOTHING
  RETURNING "role_id"
)
-- Existing claims lack the new grant. Invalidate affected sessions once.
UPDATE "tokens" SET "status" = 'revoked', "updated_at" = now()
WHERE "status" = 'active' AND "user_id" IN (
  SELECT "id" FROM "users" WHERE "role_id" IN (SELECT "role_id" FROM added)
);
