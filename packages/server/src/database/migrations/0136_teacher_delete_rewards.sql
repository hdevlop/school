-- A teacher may now delete the rewards they gave (BehaviorRewardValidator.ensureCanDelete
-- still refuses anyone else's). Grant the permission once to the teacher role.
WITH added AS (
  INSERT INTO "role_permissions" ("role_id", "permission_id")
  SELECT role."id", grant_."id"
  FROM "roles" role
  JOIN "permissions" grant_ ON grant_."name" = 'delete:behavior-rewards'
  WHERE role."name" = 'teacher'
  ON CONFLICT DO NOTHING
  RETURNING "role_id"
)
-- Existing claims lack the new grant. Invalidate affected sessions once.
UPDATE "tokens" SET "status" = 'revoked', "updated_at" = now()
WHERE "status" = 'active' AND "user_id" IN (
  SELECT "id" FROM "users" WHERE "role_id" IN (SELECT "role_id" FROM added)
);
