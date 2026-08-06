DO $$ BEGIN
 CREATE TYPE "public"."shift" AS ENUM('morning', 'afternoon', 'evening', 'fullDay');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "staff" ADD COLUMN IF NOT EXISTS "shift" "shift";
--> statement-breakpoint
ALTER TABLE "staff_roles" ADD COLUMN IF NOT EXISTS "access_role_id" text;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "staff_roles" ADD CONSTRAINT "staff_roles_access_role_id_roles_id_fk" FOREIGN KEY ("access_role_id") REFERENCES "public"."roles"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
