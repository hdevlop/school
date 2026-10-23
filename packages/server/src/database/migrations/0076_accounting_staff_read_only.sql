-- Accounting may read staff/payroll data, but no longer creates or edits staff.
-- Keep the permission catalog and every other role's grants unchanged.
DO $$
BEGIN
  LOCK TABLE "roles", "permissions", "role_permissions" IN SHARE ROW EXCLUSIVE MODE;

  UPDATE "tokens" SET "status" = 'revoked', "updated_at" = now()
  WHERE "status" = 'active' AND "user_id" IN (
    SELECT u."id" FROM "users" u
    JOIN "roles" r ON r."id" = u."role_id"
    JOIN "role_permissions" rp ON rp."role_id" = r."id"
    JOIN "permissions" p ON p."id" = rp."permission_id"
    WHERE lower(r."name") = 'accounting'
      AND p."name" IN ('create:staff', 'update:staff')
  );

  DELETE FROM "role_permissions" rp
  USING "roles" r, "permissions" p
  WHERE rp."role_id" = r."id" AND rp."permission_id" = p."id"
    AND lower(r."name") = 'accounting'
    AND p."name" IN ('create:staff', 'update:staff');
END $$;
