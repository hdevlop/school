-- Split School's legacy manage grants without reseeding roles or changing ownership.
-- One atomic statement: catalog + existing/custom role grants + token revocation.
-- Deploy with an app/worker restart (clears process auth caches); affected users
-- sign in again. Re-running it does not regrant anything or revoke new sessions.
DO $$
BEGIN
  LOCK TABLE "permissions", "role_permissions" IN SHARE ROW EXCLUSIVE MODE;
  INSERT INTO "permissions" ("id", "name", "description", "resource", "action") VALUES
    ('perm_update_staff_attendance', 'update:staff-attendance', 'Permission to record and correct the staff attendance roster', 'staff-attendance', 'update'),
    ('perm_rollover_financial_operations', 'rollover:financial-operations', 'Permission to commit a year-end rollover', 'financial-operations', 'rollover'),
    ('perm_create_class_routines', 'create:class-routines', 'Permission to create class-routines', 'class-routines', 'create'),
    ('perm_update_class_routines', 'update:class-routines', 'Permission to update class-routines', 'class-routines', 'update'),
    ('perm_delete_class_routines', 'delete:class-routines', 'Permission to delete class-routines', 'class-routines', 'delete'),
    ('perm_publish_class_routines', 'publish:class-routines', 'Permission to publish class-routines', 'class-routines', 'publish'),
    ('perm_read_participants', 'read:participants', 'Permission to read participants', 'participants', 'read'),
    ('perm_create_participants', 'create:participants', 'Permission to create participants', 'participants', 'create'),
    ('perm_update_participants', 'update:participants', 'Permission to update participants', 'participants', 'update'),
    ('perm_delete_participants', 'delete:participants', 'Permission to delete participants', 'participants', 'delete')
  ON CONFLICT ("name") DO NOTHING;

  INSERT INTO "role_permissions" ("role_id", "permission_id")
  SELECT DISTINCT rp."role_id", next."id"
  FROM "role_permissions" rp
  JOIN "permissions" old ON old."id" = rp."permission_id"
  JOIN (VALUES
      ('manage:staff-attendance', 'update:staff-attendance'),
      ('manage:financial-operations', 'rollover:financial-operations'),
      ('manage:class-routines', 'create:class-routines'),
      ('manage:class-routines', 'update:class-routines'),
      ('manage:class-routines', 'delete:class-routines'),
      ('manage:class-routines', 'publish:class-routines'),
      ('manage:participants', 'read:participants'),
      ('manage:participants', 'create:participants'),
      ('manage:participants', 'update:participants'),
      ('manage:participants', 'delete:participants')
  ) AS mapping(legacy_name, replacement_name)
    ON old."name" = mapping.legacy_name OR old."name" = 'manage:*'
  JOIN "permissions" next ON next."name" = mapping.replacement_name
  ON CONFLICT DO NOTHING;

  -- Old access/refresh tokens contain the retired grants. Reauthenticate rather
  -- than leaving a mixed old/new permission set active during the transition.
  UPDATE "tokens" SET "status" = 'revoked', "updated_at" = now()
  WHERE "status" = 'active' AND "user_id" IN (
    SELECT u."id" FROM "users" u
    JOIN "role_permissions" rp ON rp."role_id" = u."role_id"
    JOIN "permissions" p ON p."id" = rp."permission_id"
    WHERE p."name" IN ('manage:attendance', 'manage:staff-attendance', 'manage:financial-operations', 'manage:class-routines', 'manage:participants', 'manage:*')
  );

  DELETE FROM "role_permissions" WHERE "permission_id" IN (
    SELECT "id" FROM "permissions" WHERE "name" IN ('manage:attendance', 'manage:staff-attendance', 'manage:financial-operations', 'manage:class-routines', 'manage:participants', 'manage:*')
  );
  DELETE FROM "permissions" WHERE "name" IN ('manage:attendance', 'manage:staff-attendance', 'manage:financial-operations', 'manage:class-routines', 'manage:participants', 'manage:*');
END $$;
