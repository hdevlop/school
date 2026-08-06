CREATE TABLE "staff_roles" (
	"code" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"labels" jsonb,
	"category" text,
	"sort_order" integer DEFAULT 0,
	"is_system" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "staff" ALTER COLUMN "role" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."staffRole";