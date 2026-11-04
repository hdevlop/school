-- Offline reading is removed. These rows were short-lived copies of what each
-- device downloaded, so nothing is lost with them.
DROP TABLE IF EXISTS "offline_read_snapshots" CASCADE;
--> statement-breakpoint
DELETE FROM "role_permissions" WHERE "permission_id" IN (SELECT "id" FROM "permissions" WHERE "name" = 'read:offline');
--> statement-breakpoint
DELETE FROM "permissions" WHERE "name" = 'read:offline';
