-- Insurance and timetable reads used to share student/class permissions.
-- Preserve existing access once, then let administrators revoke each separately.
INSERT INTO "permissions" ("id", "name", "description", "resource", "action") VALUES
  ('school-read-insurance', 'read:insurance', 'Permission to view and print the student insurance register', 'insurance', 'read'),
  ('school-read-class-routines', 'read:class-routines', 'Permission to view class timetables', 'class-routines', 'read')
ON CONFLICT ("name") DO NOTHING;
--> statement-breakpoint
WITH added AS (
  INSERT INTO "role_permissions" ("role_id", "permission_id")
  SELECT DISTINCT old_grant."role_id", next."id"
  FROM "role_permissions" old_grant
  JOIN "permissions" old ON old."id" = old_grant."permission_id"
  JOIN "roles" role ON role."id" = old_grant."role_id"
  JOIN "permissions" next ON (
    next."name" = 'read:class-routines'
    AND old."name" IN ('read:classes', '*:classes', 'read:*', '*:*')
  ) OR (
    next."name" = 'read:insurance'
    AND old."name" IN ('read:students', '*:students', 'read:*', '*:*')
    AND role."name" IN ('admin', 'principal', 'accounting', 'secretary', 'driver', 'assistant', 'supervisor')
  )
  ON CONFLICT DO NOTHING
  RETURNING "role_id"
)
-- Existing claims lack the new grants. Invalidate affected sessions once.
UPDATE "tokens" SET "status" = 'revoked', "updated_at" = now()
WHERE "status" = 'active' AND "user_id" IN (
  SELECT "id" FROM "users" WHERE "role_id" IN (SELECT "role_id" FROM added)
);
