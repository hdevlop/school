CREATE TYPE "public"."homeworkAttachmentKind" AS ENUM('image', 'pdf');--> statement-breakpoint
CREATE TABLE "homework" (
	"id" text PRIMARY KEY NOT NULL,
	"teacher_assignment_id" text NOT NULL,
	"academic_year_id" text,
	"section_ids" jsonb,
	"date" date NOT NULL,
	"due_on" date,
	"title" text NOT NULL,
	"content" text,
	"assessment_id" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "homework_acknowledgments" (
	"id" text PRIMARY KEY NOT NULL,
	"homework_id" text NOT NULL,
	"student_id" text NOT NULL,
	"parent_user_id" text NOT NULL,
	"seen_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "homework_attachments" (
	"id" text PRIMARY KEY NOT NULL,
	"homework_id" text NOT NULL,
	"file_hash" text NOT NULL,
	"kind" "homeworkAttachmentKind" NOT NULL,
	"mime_type" text NOT NULL,
	"size" integer NOT NULL,
	"width" integer,
	"height" integer,
	"position" integer DEFAULT 0 NOT NULL,
	"purged_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "homework_quota_mb" integer DEFAULT 500 NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "homework_retention_days" integer DEFAULT 180 NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "storage_alert_level" integer;--> statement-breakpoint
ALTER TABLE "homework" ADD CONSTRAINT "homework_teacher_assignment_id_teacher_assignments_id_fk" FOREIGN KEY ("teacher_assignment_id") REFERENCES "public"."teacher_assignments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "homework" ADD CONSTRAINT "homework_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "homework" ADD CONSTRAINT "homework_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "homework_acknowledgments" ADD CONSTRAINT "homework_acknowledgments_homework_id_homework_id_fk" FOREIGN KEY ("homework_id") REFERENCES "public"."homework"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "homework_acknowledgments" ADD CONSTRAINT "homework_acknowledgments_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "homework_acknowledgments" ADD CONSTRAINT "homework_acknowledgments_parent_user_id_users_id_fk" FOREIGN KEY ("parent_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "homework_attachments" ADD CONSTRAINT "homework_attachments_homework_id_homework_id_fk" FOREIGN KEY ("homework_id") REFERENCES "public"."homework"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "homework_year_date_idx" ON "homework" USING btree ("academic_year_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "homework_acknowledgments_unique" ON "homework_acknowledgments" USING btree ("homework_id","student_id","parent_user_id");--> statement-breakpoint
CREATE INDEX "homework_attachments_hash_idx" ON "homework_attachments" USING btree ("file_hash");--> statement-breakpoint
CREATE INDEX "homework_attachments_homework_idx" ON "homework_attachments" USING btree ("homework_id");