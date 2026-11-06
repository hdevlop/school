-- The app shows the floor manager role as Monitor. This renames what the
-- database stores, so code, data and screens use one name:
--   role floor_manager           -> monitor (its id stays the same)
--   job title code floorManager  -> monitor, labelled Monitor in every language
--   staff records of that title  -> monitor
--   floor_manager_assignments    -> monitor_assignments
--   default avatars /images/floorManager_* -> /images/monitor_*
-- 0089 and 0090 created these under the old names and are left as they ran.
--
-- A name another role or job title already holds is left alone, so nothing is
-- merged by accident. A second run finds nothing to rename.

-- A signed-in monitor's session keeps the old role name. Sign those out once.
UPDATE "tokens" SET "status" = 'revoked', "updated_at" = now()
WHERE "status" = 'active'
  AND NOT EXISTS (SELECT 1 FROM "roles" WHERE "name" = 'monitor')
  AND "user_id" IN (
    SELECT "users"."id" FROM "users"
    JOIN "roles" ON "roles"."id" = "users"."role_id"
    WHERE "roles"."name" = 'floor_manager'
  );
--> statement-breakpoint
UPDATE "roles"
SET "name" = 'monitor',
  "description" = regexp_replace("description", '^Responsable d''étage:', 'Moniteur:'),
  "updated_at" = now()
WHERE "name" = 'floor_manager'
  AND NOT EXISTS (SELECT 1 FROM "roles" WHERE "name" = 'monitor');
--> statement-breakpoint
-- The dashboard already displayed this title as Monitor whatever was stored.
UPDATE "staff_roles"
SET "code" = 'monitor',
  "label" = 'Monitor',
  "labels" = '{"fr":"Moniteur","ar":"المراقب","es":"Monitor"}'::jsonb,
  "updated_at" = now()
WHERE "code" = 'floorManager'
  AND NOT EXISTS (SELECT 1 FROM "staff_roles" WHERE "code" = 'monitor');
--> statement-breakpoint
-- Only once the title itself was renamed.
UPDATE "staff" SET "role" = 'monitor' WHERE "role" = 'floorManager'
  AND NOT EXISTS (SELECT 1 FROM "staff_roles" WHERE "code" = 'floorManager');
--> statement-breakpoint
UPDATE "users"
SET "image" = replace("image", '/images/floorManager_', '/images/monitor_')
WHERE starts_with("image", '/images/floorManager_');
--> statement-breakpoint
ALTER TABLE IF EXISTS "floor_manager_assignments" RENAME TO "monitor_assignments";
--> statement-breakpoint
ALTER INDEX IF EXISTS "floor_manager_assignments_class_name_idx" RENAME TO "monitor_assignments_class_name_idx";
--> statement-breakpoint
ALTER INDEX IF EXISTS "floor_manager_assignments_pkey" RENAME TO "monitor_assignments_pkey";
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'floor_manager_assignments_staff_id_staff_id_fk') THEN
    ALTER TABLE "monitor_assignments"
      RENAME CONSTRAINT "floor_manager_assignments_staff_id_staff_id_fk" TO "monitor_assignments_staff_id_staff_id_fk";
  END IF;
END $$;
