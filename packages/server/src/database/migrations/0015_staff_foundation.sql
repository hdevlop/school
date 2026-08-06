CREATE TYPE "public"."staffRole" AS ENUM('principal', 'vicePrincipal', 'teacher', 'driver', 'accountant', 'nurse', 'librarian', 'secretary', 'itSupport', 'security', 'janitor', 'other');--> statement-breakpoint
CREATE TYPE "public"."staffStatus" AS ENUM('active', 'inactive', 'onLeave', 'suspended', 'terminated');--> statement-breakpoint
CREATE TABLE "staff" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"employee_code" text NOT NULL,
	"name" text NOT NULL,
	"cin" text,
	"gender" "gender",
	"phone" text,
	"address" text,
	"role" "staffRole" NOT NULL,
	"department" text,
	"salary" numeric(10, 2),
	"employment_type" "employmentType",
	"hire_date" date NOT NULL,
	"end_date" date,
	"status" "staffStatus" DEFAULT 'active' NOT NULL,
	"bank_account" text,
	"emergency_contact" text,
	"emergency_phone" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "staff_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "staff_employee_code_unique" UNIQUE("employee_code"),
	CONSTRAINT "staff_cin_unique" UNIQUE("cin")
);
--> statement-breakpoint
ALTER TABLE "staff" ADD CONSTRAINT "staff_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teachers" ADD COLUMN "staff_id" text;--> statement-breakpoint
ALTER TABLE "drivers" ADD COLUMN "staff_id" text;--> statement-breakpoint
ALTER TABLE "teachers" ADD CONSTRAINT "teachers_staff_id_unique" UNIQUE("staff_id");--> statement-breakpoint
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_staff_id_unique" UNIQUE("staff_id");--> statement-breakpoint
ALTER TABLE "teachers" ADD CONSTRAINT "teachers_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE set null ON UPDATE no action;
