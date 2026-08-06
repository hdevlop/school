CREATE TABLE IF NOT EXISTS "accountant_assignments" (
	"id" text PRIMARY KEY NOT NULL,
	"staff_id" text NOT NULL,
	"status" "assignmentStatus" DEFAULT 'active' NOT NULL,
	"start_date" date,
	"end_date" date,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"cycle_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "assistant_assignments" (
	"id" text PRIMARY KEY NOT NULL,
	"staff_id" text NOT NULL,
	"status" "assignmentStatus" DEFAULT 'active' NOT NULL,
	"start_date" date,
	"end_date" date,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"class_id" text NOT NULL,
	"section_id" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cleaner_assignments" (
	"id" text PRIMARY KEY NOT NULL,
	"staff_id" text NOT NULL,
	"status" "assignmentStatus" DEFAULT 'active' NOT NULL,
	"start_date" date,
	"end_date" date,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"zone_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cycles" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"labels" jsonb,
	"sort_order" integer DEFAULT 0,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "staff_credentials" (
	"id" text PRIMARY KEY NOT NULL,
	"staff_id" text NOT NULL,
	"credential_type" text NOT NULL,
	"number" text,
	"label" text,
	"issued_by" text,
	"issued_at" date,
	"expires_at" date,
	"file_path" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "zones" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"building" text,
	"floor" text,
	"description" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "classes" ADD COLUMN IF NOT EXISTS "cycle_id" text;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "accountant_assignments" ADD CONSTRAINT "accountant_assignments_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "accountant_assignments" ADD CONSTRAINT "accountant_assignments_cycle_id_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."cycles"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "assistant_assignments" ADD CONSTRAINT "assistant_assignments_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "assistant_assignments" ADD CONSTRAINT "assistant_assignments_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "assistant_assignments" ADD CONSTRAINT "assistant_assignments_section_id_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cleaner_assignments" ADD CONSTRAINT "cleaner_assignments_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cleaner_assignments" ADD CONSTRAINT "cleaner_assignments_zone_id_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."zones"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "staff_credentials" ADD CONSTRAINT "staff_credentials_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "classes" ADD CONSTRAINT "classes_cycle_id_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."cycles"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
