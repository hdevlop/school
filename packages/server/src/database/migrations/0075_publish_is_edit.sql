-- Publishing is an edit. Preserve custom role grants and existing Edit IDs.
DO $$
BEGIN
  LOCK TABLE "permissions", "role_permissions" IN SHARE ROW EXCLUSIVE MODE;
  INSERT INTO "permissions" ("id", "name", "description", "resource", "action") VALUES
    ('perm_update_class_routines', 'update:class-routines', 'Permission to edit and publish class timetables', 'class-routines', 'update')
  ON CONFLICT ("name") DO NOTHING;
  INSERT INTO "role_permissions" ("role_id", "permission_id")
  SELECT rp."role_id", next."id"
  FROM "role_permissions" rp
  JOIN "permissions" old ON old."id" = rp."permission_id"
  JOIN (VALUES ('publish:class-routines', 'update:class-routines'))
    AS mapping(legacy_name, replacement_name) ON old."name" = mapping.legacy_name
  JOIN "permissions" next ON next."name" = mapping.replacement_name
  ON CONFLICT DO NOTHING;
  UPDATE "tokens" SET "status" = 'revoked', "updated_at" = now()
  WHERE "status" = 'active' AND "user_id" IN (
    SELECT u."id" FROM "users" u
    JOIN "role_permissions" rp ON rp."role_id" = u."role_id"
    JOIN "permissions" p ON p."id" = rp."permission_id"
    WHERE p."name" = 'publish:class-routines'
  );
  DELETE FROM "role_permissions" WHERE "permission_id" IN (SELECT "id" FROM "permissions" WHERE "name" = 'publish:class-routines');
  DELETE FROM "permissions" WHERE "name" = 'publish:class-routines';
END $$;
