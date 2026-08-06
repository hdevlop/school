CREATE TYPE "public"."attendanceType" AS ENUM('student', 'teacher');--> statement-breakpoint
CREATE TYPE "public"."llmProvider" AS ENUM('anthropic', 'openai', 'google', 'zai', 'ollama', 'custom');--> statement-breakpoint
CREATE TABLE "ai_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"provider" "llmProvider" DEFAULT 'ollama' NOT NULL,
	"api_key" text,
	"base_url" text,
	"model" text DEFAULT 'llama3.1' NOT NULL,
	"system_prompt" text,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "attendance" DROP CONSTRAINT "attendance_student_id_students_id_fk";
--> statement-breakpoint
ALTER TABLE "attendance" DROP CONSTRAINT "attendance_teacher_assignment_id_teacher_assignments_id_fk";
--> statement-breakpoint
ALTER TABLE "attendance" ALTER COLUMN "student_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "attendance" ALTER COLUMN "teacher_assignment_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "attendance" ADD COLUMN "type" "attendanceType" DEFAULT 'student' NOT NULL;--> statement-breakpoint
ALTER TABLE "attendance" ADD COLUMN "teacher_id" text;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_teacher_id_teachers_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_teacher_assignment_id_teacher_assignments_id_fk" FOREIGN KEY ("teacher_assignment_id") REFERENCES "public"."teacher_assignments"("id") ON DELETE set null ON UPDATE no action;