-- Rollover, resolve and reopen are edits to their respective modules.
-- Preserve existing/custom grants and IDs; revoke stale claims atomically.
DO $$
BEGIN
  LOCK TABLE "permissions", "role_permissions" IN SHARE ROW EXCLUSIVE MODE;
  INSERT INTO "permissions" ("id", "name", "description", "resource", "action") VALUES
    ('perm_update_financial_operations', 'update:financial-operations', 'Permission to update financial operations, including year-end rollover', 'financial-operations', 'update'),
    ('perm_update_discipline', 'update:discipline', 'Permission to update, resolve and reopen discipline incidents', 'discipline', 'update')
  ON CONFLICT ("name") DO NOTHING;
  INSERT INTO "role_permissions" ("role_id", "permission_id")
  SELECT DISTINCT rp."role_id", next."id"
  FROM "role_permissions" rp
  JOIN "permissions" old ON old."id" = rp."permission_id"
  JOIN (VALUES
    ('rollover:financial-operations', 'update:financial-operations'),
    ('resolve:discipline', 'update:discipline'),
    ('manage:financial-operations', 'update:financial-operations')
  ) AS mapping(legacy_name, replacement_name) ON old."name" = mapping.legacy_name
  JOIN "permissions" next ON next."name" = mapping.replacement_name
  ON CONFLICT DO NOTHING;
  UPDATE "tokens" SET "status" = 'revoked', "updated_at" = now()
  WHERE "status" = 'active' AND "user_id" IN (
    SELECT u."id" FROM "users" u
    JOIN "role_permissions" rp ON rp."role_id" = u."role_id"
    JOIN "permissions" p ON p."id" = rp."permission_id"
    WHERE p."name" IN ('rollover:financial-operations', 'resolve:discipline', 'manage:financial-operations')
  );
  DELETE FROM "role_permissions" WHERE "permission_id" IN (
    SELECT "id" FROM "permissions" WHERE "name" IN ('rollover:financial-operations', 'resolve:discipline', 'manage:financial-operations')
  );
  DELETE FROM "permissions" WHERE "name" IN ('rollover:financial-operations', 'resolve:discipline', 'manage:financial-operations');
END $$;
