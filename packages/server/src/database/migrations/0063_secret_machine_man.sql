CREATE TYPE "public"."visit_request_status" AS ENUM('new', 'contacted', 'scheduled', 'closed');--> statement-breakpoint
CREATE TABLE "school_landing" (
	"id" text PRIMARY KEY DEFAULT 'school' NOT NULL,
	"published" boolean DEFAULT true NOT NULL,
	"stats" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"testimonials" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"program_blurbs" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"program_photo_slots" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"admissions_open" boolean DEFAULT false NOT NULL,
	"admissions_year_label" text,
	"social_links" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "school_landing_singleton" CHECK ("school_landing"."id" = 'school')
);
--> statement-breakpoint
CREATE TABLE "visit_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"parent_name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"cycle_id" text,
	"message" text,
	"language" "language" DEFAULT 'en' NOT NULL,
	"status" "visit_request_status" DEFAULT 'new' NOT NULL,
	"handled_by" text,
	"staff_note" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "visit_requests" ADD CONSTRAINT "visit_requests_cycle_id_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."cycles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_requests" ADD CONSTRAINT "visit_requests_handled_by_users_id_fk" FOREIGN KEY ("handled_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "visit_requests_status_created_idx" ON "visit_requests" USING btree ("status","created_at");