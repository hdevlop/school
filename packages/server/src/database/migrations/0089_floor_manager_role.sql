-- Adds the floor manager (responsable d'étage) role for the staff
-- member in charge of one floor. It is the supervisor's work on students without
-- the parts the surveillant général keeps: editing student records, parent
-- records, visit requests, and sending alerts and announcements. It still
-- receives both, as a teacher does.
-- Unlike the supervisor it is not school-wide: it reads the classes of the
-- grades its staff record names (floor_manager_assignments, migration 0090).
--
-- Additive and idempotent: an existing role, grant or job title is left alone.
INSERT INTO "roles" ("id", "name", "description") VALUES
  ('role_floor_manager', 'floor_manager', 'Responsable d''étage: student attendance, discipline and behavior follow-up for the grades named in their staff record, with read-only access to those students and classes, their grades and the timetable; receives announcements and alerts without sending them, and has no access to parents or visit requests')
ON CONFLICT ("name") DO NOTHING;
--> statement-breakpoint
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT "roles"."id", "permissions"."id"
FROM "roles"
CROSS JOIN "permissions"
WHERE "roles"."name" = 'floor_manager'
  AND "permissions"."name" IN (
    'read:students', 'read:teachers', 'read:classes',
    'read:sections', 'read:subjects', 'create:attendance', 'read:attendance',
    'update:attendance', 'create:discipline', 'read:discipline', 'update:discipline',
    'create:behavior-rewards', 'read:behavior-rewards', 'update:behavior-rewards', 'read:grades',
    'read:exams', 'read:assessments', 'read:events', 'read:alerts',
    'update:alerts', 'read:announcements', 'read:offline'
  )
ON CONFLICT DO NOTHING;
--> statement-breakpoint
-- A staff member given this job title and an email gets this login.
INSERT INTO "staff_roles" ("code", "label", "labels", "category", "sort_order", "is_system", "active", "access_role_id")
SELECT 'floorManager', 'Floor Manager',
  '{"fr":"Responsable d''étage","ar":"مسؤول الطابق","es":"Responsable de planta"}'::jsonb,
  'administration', 35, false, true, "roles"."id"
FROM "roles"
WHERE "roles"."name" = 'floor_manager'
ON CONFLICT ("code") DO NOTHING;
