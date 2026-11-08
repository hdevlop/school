ALTER TYPE "public"."examType" ADD VALUE 'test';--> statement-breakpoint
CREATE TABLE "exam_planning_subjects" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"subject_id" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "teacher_assignments" ALTER COLUMN "teacher_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "exams" ADD COLUMN "planning_entry_id" text;--> statement-breakpoint
ALTER TABLE "exam_planning_subjects" ADD CONSTRAINT "exam_planning_subjects_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "exam_planning_subject_name_unique" ON "exam_planning_subjects" USING btree ("name");--> statement-breakpoint
CREATE INDEX "exams_planning_entry_idx" ON "exams" USING btree ("planning_entry_id");