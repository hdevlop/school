-- The reward bank: ready-made rewards by category and reward type. Recording a
-- reward copies a template's values, so no reward references this table.
CREATE TABLE IF NOT EXISTS "behavior_reward_templates" (
  "id" text PRIMARY KEY NOT NULL,
  "title" text NOT NULL,
  "category" "behavior_reward_category" NOT NULL,
  "reward_type" "behavior_reward_type" NOT NULL,
  "points" integer DEFAULT 0 NOT NULL,
  "description" text DEFAULT '' NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "created_by" text,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now(),
  CONSTRAINT "behavior_reward_templates_points_check" CHECK ("points" >= 0 AND "points" <= 100)
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "behavior_reward_templates" ADD CONSTRAINT "behavior_reward_templates_created_by_users_id_fk"
    FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "behavior_reward_templates_title_idx"
  ON "behavior_reward_templates" USING btree ("category", "reward_type", lower("title"));
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "behavior_reward_templates_pair_idx"
  ON "behavior_reward_templates" USING btree ("category", "reward_type");
--> statement-breakpoint
-- Whoever records rewards reads the bank to fill the reward form; the
-- principal curates it (the admin holds every permission already).
INSERT INTO "permissions" ("id", "name", "description", "resource", "action") VALUES
  ('school-read-reward-templates', 'read:reward-templates', 'Permission to view the reward bank and fill a reward from it', 'reward-templates', 'read'),
  ('school-create-reward-templates', 'create:reward-templates', 'Permission to add rewards to the reward bank', 'reward-templates', 'create'),
  ('school-update-reward-templates', 'update:reward-templates', 'Permission to edit and archive rewards in the reward bank', 'reward-templates', 'update'),
  ('school-delete-reward-templates', 'delete:reward-templates', 'Permission to remove rewards from the reward bank', 'reward-templates', 'delete')
ON CONFLICT ("name") DO NOTHING;
--> statement-breakpoint
WITH added AS (
  INSERT INTO "role_permissions" ("role_id", "permission_id")
  SELECT role."id", grant_."id"
  FROM "roles" role
  JOIN "permissions" grant_ ON grant_."name" = 'read:reward-templates'
  WHERE role."id" IN (
    SELECT held."role_id" FROM "role_permissions" held
    JOIN "permissions" old ON old."id" = held."permission_id" AND old."name" = 'create:behavior-rewards'
  )
  UNION
  SELECT role."id", grant_."id"
  FROM "roles" role
  JOIN "permissions" grant_ ON grant_."name" IN ('read:reward-templates', 'create:reward-templates', 'update:reward-templates', 'delete:reward-templates')
  WHERE role."name" = 'principal'
  ON CONFLICT DO NOTHING
  RETURNING "role_id"
)
-- Existing claims lack the new grants. Invalidate affected sessions once.
UPDATE "tokens" SET "status" = 'revoked', "updated_at" = now()
WHERE "status" = 'active' AND "user_id" IN (
  SELECT "id" FROM "users" WHERE "role_id" IN (SELECT "role_id" FROM added)
);
