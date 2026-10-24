CREATE TABLE IF NOT EXISTS "offline_read_snapshots" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"context" jsonb NOT NULL,
	"pages" jsonb NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "offline_read_snapshots_account_idx" ON "offline_read_snapshots" USING btree ("account_id");
--> statement-breakpoint
-- Add one capability, preserving resource/custom grants. Custom roles require an
-- explicit operator grant (or an existing wildcard that already includes it).
INSERT INTO "permissions" ("id", "name", "description", "resource", "action")
VALUES ('school-offline-read', 'read:offline', 'Read previously downloaded authorized data offline', 'offline', 'read')
ON CONFLICT ("name") DO NOTHING;
--> statement-breakpoint
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r."id", p."id" FROM "roles" r CROSS JOIN "permissions" p
WHERE r."name" IN ('admin','principal','accounting','teacher','parent','student','secretary','driver','assistant','supervisor')
  AND p."name" = 'read:offline'
ON CONFLICT DO NOTHING;
