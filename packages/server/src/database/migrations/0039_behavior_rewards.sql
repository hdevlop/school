DO $$ BEGIN
  CREATE TYPE "public"."behavior_reward_category" AS ENUM (
    'academic_effort', 'improvement', 'respect', 'helpfulness', 'leadership',
    'teamwork', 'responsibility', 'community_service', 'excellent_attendance', 'other'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."behavior_recognition_level" AS ENUM ('appreciation', 'achievement', 'excellence');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."behavior_reward_type" AS ENUM (
    'verbal_praise', 'written_praise', 'merit', 'badge', 'certificate', 'privilege', 'prize', 'other'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "behavior_rewards" (
  "id" text PRIMARY KEY NOT NULL,
  "student_id" text NOT NULL,
  "class_id" text NOT NULL,
  "section_id" text NOT NULL,
  "awarded_by" text NOT NULL,
  "behavior_at" timestamp with time zone NOT NULL,
  "category" "behavior_reward_category" NOT NULL,
  "recognition_level" "behavior_recognition_level" NOT NULL,
  "description" text NOT NULL,
  "reward_type" "behavior_reward_type" NOT NULL,
  "points" integer DEFAULT 0 NOT NULL,
  "reward_note" text,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now(),
  CONSTRAINT "behavior_rewards_points_check" CHECK ("points" >= 0 AND "points" <= 100)
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "behavior_rewards" ADD CONSTRAINT "behavior_rewards_student_id_students_id_fk"
    FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "behavior_rewards" ADD CONSTRAINT "behavior_rewards_class_id_classes_id_fk"
    FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "behavior_rewards" ADD CONSTRAINT "behavior_rewards_section_id_sections_id_fk"
    FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "behavior_rewards" ADD CONSTRAINT "behavior_rewards_awarded_by_users_id_fk"
    FOREIGN KEY ("awarded_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "behavior_rewards_student_idx" ON "behavior_rewards" USING btree ("student_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "behavior_rewards_awarded_by_idx" ON "behavior_rewards" USING btree ("awarded_by");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "behavior_rewards_category_idx" ON "behavior_rewards" USING btree ("category");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "behavior_rewards_recognition_level_idx" ON "behavior_rewards" USING btree ("recognition_level");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "behavior_rewards_reward_type_idx" ON "behavior_rewards" USING btree ("reward_type");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "behavior_rewards_behavior_at_idx" ON "behavior_rewards" USING btree ("behavior_at");
--> statement-breakpoint
INSERT INTO "permissions" ("id", "name", "description", "resource", "action") VALUES
  ('perm_br_create', 'create:behavior-rewards', 'Permission to create positive behavior and reward records', 'behavior-rewards', 'create'),
  ('perm_br_read', 'read:behavior-rewards', 'Permission to view positive behavior and reward records', 'behavior-rewards', 'read'),
  ('perm_br_update', 'update:behavior-rewards', 'Permission to update positive behavior and reward records', 'behavior-rewards', 'update'),
  ('perm_br_delete', 'delete:behavior-rewards', 'Permission to delete positive behavior and reward records', 'behavior-rewards', 'delete')
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
  AND "permissions"."name" IN (
    'read:behavior-rewards', 'create:behavior-rewards', 'update:behavior-rewards'
  )
ON CONFLICT DO NOTHING;
