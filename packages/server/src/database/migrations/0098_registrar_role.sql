-- Adds the registrar role: the staff member who keeps student records and
-- exchanges them with Massar. Imports, creates, edits and exports students, and
-- reads and exports grades, exams and assessments without changing them. It is
-- school-wide (SCHOOL_WIDE_ROLES), so these reads reach every class.
--
-- Additive and idempotent: an existing role, grant or job title is left alone.
INSERT INTO "roles" ("id", "name", "description") VALUES
  ('role_registrar', 'registrar', 'Student records and the Massar exchange: imports, creates, edits and exports students, and reads and exports grades, exams and assessments across the school without changing them')
ON CONFLICT ("name") DO NOTHING;
--> statement-breakpoint
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT "roles"."id", "permissions"."id"
FROM "roles"
CROSS JOIN "permissions"
WHERE "roles"."name" = 'registrar'
  AND "permissions"."name" IN (
    'read:dashboard',
    'create:students', 'read:students', 'update:students',
    'read:teachers', 'read:classes', 'read:sections', 'read:subjects',
    'read:grades', 'read:exams', 'read:assessments'
  )
ON CONFLICT DO NOTHING;
--> statement-breakpoint
-- A staff member given this job title and an email gets this login.
INSERT INTO "staff_roles" ("code", "label", "labels", "category", "sort_order", "is_system", "active", "access_role_id")
SELECT 'registrar', 'Registrar',
  '{"fr":"Registraire","ar":"مسجل","es":"Registrador"}'::jsonb,
  'administration', 36, false, true, "roles"."id"
FROM "roles"
WHERE "roles"."name" = 'registrar'
ON CONFLICT ("code") DO NOTHING;
