-- Who may write a student record, and who may see grades, narrows once:
--   secretary  - the bridge to parents and visitors: creates, changes and deletes
--                no student, and neither reads nor changes grades
--   teacher    - neither changes nor deletes a student
--   supervisor - does not delete a student, and only reads grades
-- Removal has to be a migration: seed:role-permissions only ever adds. Anything
-- granted again in the roles screen afterwards stays.
WITH removed AS (
  DELETE FROM "role_permissions" held
  USING "roles" role, "permissions" permission, (VALUES
    ('secretary', 'create:students'),
    ('secretary', 'update:students'),
    ('secretary', 'delete:students'),
    ('secretary', 'read:grades'),
    ('secretary', 'create:grades'),
    ('secretary', 'update:grades'),
    ('secretary', 'delete:grades'),
    ('teacher', 'update:students'),
    ('teacher', 'delete:students'),
    ('supervisor', 'delete:students'),
    ('supervisor', 'create:grades'),
    ('supervisor', 'update:grades'),
    ('supervisor', 'delete:grades')
  ) AS revoked("role_name", "permission_name")
  WHERE held."role_id" = role."id"
    AND held."permission_id" = permission."id"
    AND role."name" = revoked."role_name"
    AND permission."name" = revoked."permission_name"
  RETURNING held."role_id"
)
-- Existing claims still carry the removed grants. Invalidate those sessions once.
UPDATE "tokens" SET "status" = 'revoked', "updated_at" = now()
WHERE "status" = 'active' AND "user_id" IN (
  SELECT "id" FROM "users" WHERE "role_id" IN (SELECT "role_id" FROM removed)
);
