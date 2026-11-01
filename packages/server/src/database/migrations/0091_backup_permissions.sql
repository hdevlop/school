-- Declares the permissions behind Settings > Backup, so the roles screen can
-- show them. A backup holds every account and its password hash, so no role is
-- granted either here: the administrator already holds them through `*:*`.
--
-- Additive and idempotent: an existing permission is left alone.
INSERT INTO "permissions" ("id", "name", "description", "resource", "action") VALUES
  ('school-system-backup', 'backup:system', 'Download a full backup of the school''s data, accounts and files', 'system', 'backup'),
  ('school-system-restore', 'restore:system', 'Replace all of the school''s data from a backup', 'system', 'restore')
ON CONFLICT ("name") DO NOTHING;
