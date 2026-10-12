-- Guards that named roles (isFinancial, isAdministrator, isAdmin) now name
-- permissions. This adds those permissions, grants each role exactly what it
-- reached through a role guard before, and adds the supervisor (surveillant
-- général) role, so every role keeps the access it had. Additive and
-- idempotent: nothing is removed, and re-running it changes nothing.
--
-- It also links the standard job titles to their login roles, which no
-- migration or seed did before: a staff member created with one of them and
-- an email now gets that login, and Reset access can reach staff and teachers.
-- And it removes the unused counselor, nurse and librarian login roles, unless
-- an account still holds one (their job titles stay).
--
-- The new role defaults in packages/seed/src/scripts/admin/data seed a new
-- database. An existing one adopts them once, deliberately, with
-- `bun run seed:role-permissions`; grants edited in the dashboard stay.
--> statement-breakpoint
INSERT INTO "permissions" ("id", "name", "description", "resource", "action") VALUES
  ('perm_create_staff', 'create:staff', 'Permission to create staff members', 'staff', 'create'),
  ('perm_read_staff', 'read:staff', 'Permission to view staff members, job titles and zones', 'staff', 'read'),
  ('perm_update_staff', 'update:staff', 'Permission to update staff members and zones', 'staff', 'update'),
  ('perm_delete_staff', 'delete:staff', 'Permission to delete staff members and zones', 'staff', 'delete'),
  ('perm_read_staff_attendance', 'read:staff-attendance', 'Permission to view the staff attendance roster', 'staff-attendance', 'read'),
  ('perm_manage_staff_attendance', 'manage:staff-attendance', 'Permission to record and correct staff attendance', 'staff-attendance', 'manage'),
  ('perm_create_payroll', 'create:payroll', 'Permission to run payroll', 'payroll', 'create'),
  ('perm_read_payroll', 'read:payroll', 'Permission to view payroll and payslips', 'payroll', 'read'),
  ('perm_update_payroll', 'update:payroll', 'Permission to pay and edit payslips', 'payroll', 'update'),
  ('perm_delete_payroll', 'delete:payroll', 'Permission to delete payslips', 'payroll', 'delete'),
  ('perm_read_financial_operations', 'read:financial-operations', 'Permission to view the financial audit log and preview a rollover', 'financial-operations', 'read'),
  ('perm_manage_financial_operations', 'manage:financial-operations', 'Permission to commit a year-end rollover', 'financial-operations', 'manage'),
  ('perm_create_cycles', 'create:cycles', 'Permission to create cycles', 'cycles', 'create'),
  ('perm_read_cycles', 'read:cycles', 'Permission to view cycles', 'cycles', 'read'),
  ('perm_update_cycles', 'update:cycles', 'Permission to update cycles', 'cycles', 'update'),
  ('perm_delete_cycles', 'delete:cycles', 'Permission to delete cycles', 'cycles', 'delete'),
  ('perm_create_student_routes', 'create:student-routes', 'Permission to assign students to transport routes', 'student-routes', 'create'),
  ('perm_read_student_routes', 'read:student-routes', 'Permission to view student transport routes', 'student-routes', 'read'),
  ('perm_update_student_routes', 'update:student-routes', 'Permission to change student transport routes', 'student-routes', 'update'),
  ('perm_delete_student_routes', 'delete:student-routes', 'Permission to delete student transport routes', 'student-routes', 'delete'),
  ('perm_manage_class_routines', 'manage:class-routines', 'Permission to build and publish class timetables', 'class-routines', 'manage'),
  ('perm_reset_users', 'reset:users', 'Permission to reset another user''s login', 'users', 'reset'),
  ('perm_manage_participants', 'manage:participants', 'Permission to manage event participants and their attendance', 'participants', 'manage')
ON CONFLICT ("name") DO NOTHING;
--> statement-breakpoint
INSERT INTO "permissions" ("id", "name", "description", "resource", "action") VALUES
  ('perm_read_students', 'read:students', 'Permission to view students', 'students', 'read'),
  ('perm_update_students', 'update:students', 'Permission to update student information', 'students', 'update'),
  ('perm_read_teachers', 'read:teachers', 'Permission to view teachers', 'teachers', 'read'),
  ('perm_read_parents', 'read:parents', 'Permission to view parents', 'parents', 'read'),
  ('perm_read_classes', 'read:classes', 'Permission to view classes', 'classes', 'read'),
  ('perm_read_sections', 'read:sections', 'Permission to view sections', 'sections', 'read'),
  ('perm_read_subjects', 'read:subjects', 'Permission to view subjects', 'subjects', 'read'),
  ('perm_read_grades', 'read:grades', 'Permission to view grades', 'grades', 'read'),
  ('perm_manage_attendance', 'manage:attendance', 'Permission to manage student attendance', 'attendance', 'manage'),
  ('perm_create_feeTypes', 'create:feeTypes', 'Permission to create new fee types', 'feeTypes', 'create'),
  ('perm_read_feeTypes', 'read:feeTypes', 'Permission to view fee types', 'feeTypes', 'read'),
  ('perm_update_feeTypes', 'update:feeTypes', 'Permission to update fee type information', 'feeTypes', 'update'),
  ('perm_delete_feeTypes', 'delete:feeTypes', 'Permission to delete fee types', 'feeTypes', 'delete'),
  ('perm_create_fees', 'create:fees', 'Permission to assign fees to students', 'fees', 'create'),
  ('perm_read_fees', 'read:fees', 'Permission to view student fees', 'fees', 'read'),
  ('perm_update_fees', 'update:fees', 'Permission to update fee information', 'fees', 'update'),
  ('perm_delete_fees', 'delete:fees', 'Permission to delete fees', 'fees', 'delete'),
  ('perm_create_payments', 'create:payments', 'Permission to process payments', 'payments', 'create'),
  ('perm_read_payments', 'read:payments', 'Permission to view payment records', 'payments', 'read'),
  ('perm_update_payments', 'update:payments', 'Permission to update payment information', 'payments', 'update'),
  ('perm_delete_payments', 'delete:payments', 'Permission to delete payments', 'payments', 'delete'),
  ('perm_create_expenses', 'create:expenses', 'Permission to create new expenses', 'expenses', 'create'),
  ('perm_read_expenses', 'read:expenses', 'Permission to view expenses', 'expenses', 'read'),
  ('perm_update_expenses', 'update:expenses', 'Permission to update expense information', 'expenses', 'update'),
  ('perm_delete_expenses', 'delete:expenses', 'Permission to delete expenses', 'expenses', 'delete'),
  ('perm_read_exams', 'read:exams', 'Permission to view exams', 'exams', 'read'),
  ('perm_read_assessments', 'read:assessments', 'Permission to view assessments', 'assessments', 'read'),
  ('perm_create_attendance', 'create:attendance', 'Permission to create attendance records', 'attendance', 'create'),
  ('perm_read_attendance', 'read:attendance', 'Permission to view attendance records', 'attendance', 'read'),
  ('perm_update_attendance', 'update:attendance', 'Permission to update attendance information', 'attendance', 'update'),
  ('perm_create_announcements', 'create:announcements', 'Permission to create new announcements', 'announcements', 'create'),
  ('perm_read_announcements', 'read:announcements', 'Permission to view announcements', 'announcements', 'read'),
  ('perm_update_announcements', 'update:announcements', 'Permission to update announcement information', 'announcements', 'update'),
  ('perm_read_events', 'read:events', 'Permission to view events', 'events', 'read'),
  ('perm_create_alerts', 'create:alerts', 'Permission to create new alerts', 'alerts', 'create'),
  ('perm_read_alerts', 'read:alerts', 'Permission to view alerts', 'alerts', 'read'),
  ('perm_update_alerts', 'update:alerts', 'Permission to update alert information', 'alerts', 'update'),
  ('perm_create_settings', 'create:settings', 'Permission to create new settings', 'settings', 'create'),
  ('perm_read_settings', 'read:settings', 'Permission to view settings', 'settings', 'read'),
  ('perm_update_settings', 'update:settings', 'Permission to update settings', 'settings', 'update'),
  ('perm_create_behavior_rewards', 'create:behavior-rewards', 'Permission to create positive behavior and reward records', 'behavior-rewards', 'create'),
  ('perm_read_behavior_rewards', 'read:behavior-rewards', 'Permission to view positive behavior and reward records', 'behavior-rewards', 'read'),
  ('perm_update_behavior_rewards', 'update:behavior-rewards', 'Permission to update positive behavior and reward records', 'behavior-rewards', 'update'),
  ('perm_create_discipline', 'create:discipline', 'Permission to create discipline incidents', 'discipline', 'create'),
  ('perm_read_discipline', 'read:discipline', 'Permission to view discipline incidents', 'discipline', 'read'),
  ('perm_update_discipline', 'update:discipline', 'Permission to update discipline incidents', 'discipline', 'update'),
  ('perm_resolve_discipline', 'resolve:discipline', 'Permission to resolve and reopen discipline incidents', 'discipline', 'resolve'),
  ('perm_read_visit_requests', 'read:visit-requests', 'read school visit requests', 'visit-requests', 'read'),
  ('perm_update_visit_requests', 'update:visit-requests', 'update school visit requests', 'visit-requests', 'update')
ON CONFLICT ("name") DO NOTHING;
--> statement-breakpoint
INSERT INTO "roles" ("id", "name", "description") VALUES
  ('role_supervisor', 'supervisor', 'Surveillant général: school-wide student attendance, discipline and behavior follow-up, parent contact and visit requests, with read access to classes, grades and the timetable')
ON CONFLICT ("name") DO NOTHING;
--> statement-breakpoint
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT "roles"."id", "permissions"."id"
FROM "roles"
CROSS JOIN "permissions"
WHERE "roles"."name" = 'accounting'
  AND "permissions"."name" IN (
    'create:fees', 'read:fees', 'update:fees', 'delete:fees',
    'create:payments', 'read:payments', 'update:payments', 'delete:payments',
    'create:expenses', 'read:expenses', 'update:expenses', 'delete:expenses',
    'create:feeTypes', 'read:feeTypes', 'update:feeTypes', 'delete:feeTypes'
  )
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT "roles"."id", "permissions"."id"
FROM "roles"
CROSS JOIN "permissions"
WHERE "roles"."name" = 'principal'
  AND "permissions"."name" IN (
    'create:fees', 'read:fees', 'update:fees', 'delete:fees',
    'create:payments', 'read:payments', 'update:payments', 'delete:payments',
    'create:expenses', 'read:expenses', 'update:expenses', 'delete:expenses',
    'create:feeTypes', 'read:feeTypes', 'update:feeTypes', 'delete:feeTypes',
    'create:settings', 'read:settings', 'update:settings', 'manage:class-routines',
    'manage:staff-attendance'
  )
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT "roles"."id", "permissions"."id"
FROM "roles"
CROSS JOIN "permissions"
WHERE "roles"."name" = 'supervisor'
  AND "permissions"."name" IN (
    'read:students', 'update:students', 'read:parents', 'read:teachers',
    'read:classes', 'read:sections', 'read:subjects', 'manage:attendance',
    'create:attendance', 'read:attendance', 'update:attendance', 'create:discipline',
    'read:discipline', 'update:discipline', 'resolve:discipline', 'create:behavior-rewards',
    'read:behavior-rewards', 'update:behavior-rewards', 'read:grades', 'read:exams',
    'read:assessments', 'read:events', 'create:alerts', 'read:alerts',
    'update:alerts', 'create:announcements', 'read:announcements', 'update:announcements',
    'read:visit-requests', 'update:visit-requests'
  )
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "staff_roles" ("code", "label", "labels", "category", "sort_order", "is_system", "active", "access_role_id")
SELECT 'supervisor', 'General Supervisor',
  '{"fr":"Surveillant général","ar":"الحارس العام","es":"Supervisor general"}'::jsonb,
  'administration', 34, false, true, "roles"."id"
FROM "roles"
WHERE "roles"."name" = 'supervisor'
ON CONFLICT ("code") DO NOTHING;
--> statement-breakpoint
-- A staff member with one of these job titles and an email gets this login,
-- and Reset access follows the link to it. A link already set is kept.
UPDATE "staff_roles" SET "access_role_id" = "roles"."id"
FROM "roles"
WHERE "staff_roles"."access_role_id" IS NULL
  AND ("staff_roles"."code", "roles"."name") IN (
    ('teacher', 'teacher'), ('driver', 'driver'), ('principal', 'principal'), ('secretary', 'secretary'),
    ('accountant', 'accounting'), ('assistant', 'assistant'), ('supervisor', 'supervisor')
  );
--> statement-breakpoint
DELETE FROM "roles"
WHERE "name" IN ('counselor', 'nurse', 'librarian')
  AND NOT EXISTS (SELECT 1 FROM "users" WHERE "users"."role_id" = "roles"."id");
