CREATE TYPE "public"."disciplineAction" AS ENUM('verbal_warning', 'written_warning', 'detention', 'counseling', 'parent_meeting', 'suspension', 'other');
--> statement-breakpoint
CREATE TYPE "public"."disciplineCategory" AS ENUM('classroom_disruption', 'disrespect', 'bullying', 'fighting', 'cheating', 'vandalism', 'uniform_violation', 'device_misuse', 'prohibited_item', 'other');
--> statement-breakpoint
CREATE TYPE "public"."disciplineSeverity" AS ENUM('low', 'medium', 'high', 'critical');
--> statement-breakpoint
CREATE TYPE "public"."disciplineStatus" AS ENUM('open', 'resolved');
--> statement-breakpoint
CREATE TABLE "discipline_incidents" (
	"id" text PRIMARY KEY NOT NULL,
	"student_id" text NOT NULL,
	"class_id" text NOT NULL,
	"section_id" text NOT NULL,
	"reported_by" text NOT NULL,
	"incident_at" timestamp with time zone NOT NULL,
	"category" "disciplineCategory" NOT NULL,
	"severity" "disciplineSeverity" NOT NULL,
	"location" text,
	"description" text NOT NULL,
	"status" "disciplineStatus" DEFAULT 'open' NOT NULL,
	"action_type" "disciplineAction",
	"action_note" text,
	"resolution_note" text,
	"resolved_by" text,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "discipline_incidents" ADD CONSTRAINT "discipline_incidents_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "discipline_incidents" ADD CONSTRAINT "discipline_incidents_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "discipline_incidents" ADD CONSTRAINT "discipline_incidents_section_id_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "discipline_incidents" ADD CONSTRAINT "discipline_incidents_reported_by_users_id_fk" FOREIGN KEY ("reported_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "discipline_incidents" ADD CONSTRAINT "discipline_incidents_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "discipline_incidents_student_idx" ON "discipline_incidents" USING btree ("student_id");
--> statement-breakpoint
CREATE INDEX "discipline_incidents_reporter_idx" ON "discipline_incidents" USING btree ("reported_by");
--> statement-breakpoint
CREATE INDEX "discipline_incidents_status_idx" ON "discipline_incidents" USING btree ("status");
--> statement-breakpoint
CREATE INDEX "discipline_incidents_severity_idx" ON "discipline_incidents" USING btree ("severity");
--> statement-breakpoint
CREATE INDEX "discipline_incidents_incident_at_idx" ON "discipline_incidents" USING btree ("incident_at");
--> statement-breakpoint
INSERT INTO "permissions" ("id", "name", "description", "resource", "action") VALUES
  ('perm_disc_create', 'create:discipline', 'Permission to create discipline incidents', 'discipline', 'create'),
  ('perm_disc_read', 'read:discipline', 'Permission to view discipline incidents', 'discipline', 'read'),
  ('perm_disc_update', 'update:discipline', 'Permission to update discipline incidents', 'discipline', 'update'),
  ('perm_disc_delete', 'delete:discipline', 'Permission to delete discipline incidents', 'discipline', 'delete'),
  ('perm_disc_resolve', 'resolve:discipline', 'Permission to resolve and reopen discipline incidents', 'discipline', 'resolve')
ON CONFLICT ("name") DO UPDATE SET
  "description" = EXCLUDED."description",
  "resource" = EXCLUDED."resource",
  "action" = EXCLUDED."action";
--> statement-breakpoint
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT "roles"."id", "permissions"."id"
FROM "roles"
CROSS JOIN "permissions"
WHERE "roles"."name" = 'teacher'
  AND "permissions"."name" IN ('read:discipline', 'create:discipline', 'update:discipline')
ON CONFLICT DO NOTHING;
