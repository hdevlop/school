CREATE TABLE "teacher_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"cin" text NOT NULL,
	"address" text NOT NULL,
	"gender" "gender",
	"specialization" text,
	"years_of_experience" integer,
	"academic_degrees" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "teacher_requests_email_unique" UNIQUE("email")
);
