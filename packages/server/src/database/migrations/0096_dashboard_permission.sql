-- The dashboard used to open by role. It now asks for read:dashboard, so an
-- administrator grants or revokes it in the roles screen. Preserve existing
-- access once: every role that reached the dashboard keeps it.
INSERT INTO "permissions" ("id", "name", "description", "resource", "action") VALUES
  ('school-read-dashboard', 'read:dashboard', 'Permission to open the dashboard home page', 'dashboard', 'read')
ON CONFLICT ("name") DO NOTHING;
--> statement-breakpoint
WITH added AS (
  INSERT INTO "role_permissions" ("role_id", "permission_id")
  SELECT role."id", next."id"
  FROM "roles" role
  JOIN "permissions" next ON next."name" = 'read:dashboard'
  WHERE role."name" IN ('principal', 'accounting', 'teacher', 'secretary', 'assistant', 'supervisor', 'floor_manager')
  ON CONFLICT DO NOTHING
  RETURNING "role_id"
)
-- Existing claims lack the new grant. Invalidate affected sessions once.
UPDATE "tokens" SET "status" = 'revoked', "updated_at" = now()
WHERE "status" = 'active' AND "user_id" IN (
  SELECT "id" FROM "users" WHERE "role_id" IN (SELECT "role_id" FROM added)
);
