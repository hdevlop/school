-- Importing, listing and deleting desk-card backgrounds (storage namespace
-- desk-card-backgrounds) now asks for update:desk-card-backgrounds instead of
-- the admin role (StorageManageGuard), so the roles screen decides who may.
-- Admins keep it through *:*; the principal (every permission but access
-- control) and the secretary, who prints the teachers' desk cards, get the new
-- grant. Additive and idempotent.
INSERT INTO "permissions" ("id", "name", "description", "resource", "action") VALUES
  ('school-update-desk-card-backgrounds', 'update:desk-card-backgrounds', 'Import and delete the backgrounds printed behind teachers'' desk cards', 'desk-card-backgrounds', 'update')
ON CONFLICT ("name") DO NOTHING;
--> statement-breakpoint
WITH added AS (
  INSERT INTO "role_permissions" ("role_id", "permission_id")
  SELECT role."id", grant_."id"
  FROM "roles" role
  JOIN "permissions" grant_ ON grant_."name" = 'update:desk-card-backgrounds'
  WHERE role."name" IN ('principal', 'secretary')
  ON CONFLICT DO NOTHING
  RETURNING "role_id"
)
-- Existing claims lack the new grant. Invalidate affected sessions once.
UPDATE "tokens" SET "status" = 'revoked', "updated_at" = now()
WHERE "status" = 'active' AND "user_id" IN (
  SELECT "id" FROM "users" WHERE "role_id" IN (SELECT "role_id" FROM added)
);
