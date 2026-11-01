CREATE TABLE "floor_manager_assignments" (
	"id" text PRIMARY KEY NOT NULL,
	"staff_id" text NOT NULL,
	"status" "assignmentStatus" DEFAULT 'active' NOT NULL,
	"start_date" date,
	"end_date" date,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"class_name" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "floor_manager_assignments" ADD CONSTRAINT "floor_manager_assignments_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "floor_manager_assignments_class_name_idx" ON "floor_manager_assignments" USING btree ("class_name");