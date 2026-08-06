CREATE TYPE "public"."studentRouteStatus" AS ENUM('active', 'completed', 'cancelled');--> statement-breakpoint
CREATE TABLE "student_routes" (
	"id" text PRIMARY KEY NOT NULL,
	"student_id" text NOT NULL,
	"vehicle_id" text NOT NULL,
	"assignment_date" date DEFAULT CURRENT_DATE NOT NULL,
	"unassignment_date" date,
	"status" "studentRouteStatus" DEFAULT 'active' NOT NULL,
	"pickup_location" text,
	"dropoff_location" text,
	"notes" text,
	"assigned_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "student_routes" ADD CONSTRAINT "student_routes_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_routes" ADD CONSTRAINT "student_routes_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_routes" ADD CONSTRAINT "student_routes_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;