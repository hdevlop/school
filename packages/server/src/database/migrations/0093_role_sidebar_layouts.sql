CREATE TABLE "role_sidebar_layouts" (
	"role_id" text PRIMARY KEY NOT NULL,
	"item_order" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "role_sidebar_layouts" ADD CONSTRAINT "role_sidebar_layouts_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;