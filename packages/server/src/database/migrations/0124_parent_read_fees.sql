-- A parent reads their own children's fees through the profile routes, which
-- now ask for read:fees instead of read:fees school-wide. Each of those routes
-- loads the parent or student through ownership first, so a parent sees only
-- their own family. Every other fee and payment route stays school-wide, as do
-- the dashboard's fee pages, so the grant opens nothing else.
-- Additive and idempotent. Signed-in parents get it at their next sign-in.
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT role."id", permission."id"
FROM "roles" role
JOIN "permissions" permission ON permission."name" = 'read:fees'
WHERE role."name" = 'parent'
ON CONFLICT DO NOTHING;
