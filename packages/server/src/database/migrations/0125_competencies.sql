CREATE TYPE "public"."competencyLevel" AS ENUM('beginning', 'in_progress', 'advanced', 'mastered');--> statement-breakpoint
CREATE TABLE "competencies" (
	"id" text PRIMARY KEY NOT NULL,
	"domain_id" text NOT NULL,
	"name" text NOT NULL,
	"alt_name" text,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "competency_domains" (
	"id" text PRIMARY KEY NOT NULL,
	"teacher_assignment_id" text NOT NULL,
	"academic_year_id" text NOT NULL,
	"name" text NOT NULL,
	"alt_name" text,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "competency_evaluations" (
	"id" text PRIMARY KEY NOT NULL,
	"competency_id" text NOT NULL,
	"student_id" text NOT NULL,
	"academic_year_id" text NOT NULL,
	"month" text NOT NULL,
	"level" "competencyLevel" NOT NULL,
	"evaluated_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "competencies" ADD CONSTRAINT "competencies_domain_id_competency_domains_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."competency_domains"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competency_domains" ADD CONSTRAINT "competency_domains_teacher_assignment_id_teacher_assignments_id_fk" FOREIGN KEY ("teacher_assignment_id") REFERENCES "public"."teacher_assignments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competency_domains" ADD CONSTRAINT "competency_domains_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competency_evaluations" ADD CONSTRAINT "competency_evaluations_competency_id_competencies_id_fk" FOREIGN KEY ("competency_id") REFERENCES "public"."competencies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competency_evaluations" ADD CONSTRAINT "competency_evaluations_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competency_evaluations" ADD CONSTRAINT "competency_evaluations_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competency_evaluations" ADD CONSTRAINT "competency_evaluations_evaluated_by_users_id_fk" FOREIGN KEY ("evaluated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "competencies_domain_idx" ON "competencies" USING btree ("domain_id");--> statement-breakpoint
CREATE INDEX "competency_domains_assignment_idx" ON "competency_domains" USING btree ("teacher_assignment_id","academic_year_id");--> statement-breakpoint
CREATE UNIQUE INDEX "competency_evaluations_unique" ON "competency_evaluations" USING btree ("competency_id","student_id","month");--> statement-breakpoint
CREATE INDEX "competency_evaluations_student_idx" ON "competency_evaluations" USING btree ("student_id","month");