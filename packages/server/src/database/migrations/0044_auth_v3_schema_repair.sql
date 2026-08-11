-- The historical 0000 baseline already described the later Auth schema in its
-- Drizzle snapshot, but its SQL omitted these columns and the composite key.
-- Consequently db:generate reported no drift while a fresh migrated database
-- could not run Najm Auth v3 services. Keep this repair additive and safe for
-- installations that already corrected the columns manually.
ALTER TABLE "roles" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "roles" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone_verified" boolean DEFAULT false;--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_phone_unique'
  ) THEN
    ALTER TABLE "users" ADD CONSTRAINT "users_phone_unique" UNIQUE("phone");
  END IF;
END $$;--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'role_permissions_role_id_permission_id_pk'
  ) THEN
    ALTER TABLE "role_permissions"
      ADD CONSTRAINT "role_permissions_role_id_permission_id_pk"
      PRIMARY KEY("role_id", "permission_id");
  END IF;
END $$;
