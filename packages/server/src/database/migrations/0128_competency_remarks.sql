-- The teacher's remark for a pupil's parents at the foot of the competency
-- sheet: one per class and subject (teacher assignment), pupil and month, as on
-- the monthly paper sheet. It hangs on the assignment like the competency
-- list, so removing the teacher moves it to the class's vacant slot. Additive.
CREATE TABLE "competency_remarks" (
	"id" text PRIMARY KEY NOT NULL,
	"teacher_assignment_id" text NOT NULL,
	"student_id" text NOT NULL,
	"academic_year_id" text NOT NULL,
	"month" text NOT NULL,
	"body" text NOT NULL,
	"written_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "competency_remarks" ADD CONSTRAINT "competency_remarks_teacher_assignment_id_teacher_assignments_id_fk" FOREIGN KEY ("teacher_assignment_id") REFERENCES "public"."teacher_assignments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competency_remarks" ADD CONSTRAINT "competency_remarks_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competency_remarks" ADD CONSTRAINT "competency_remarks_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competency_remarks" ADD CONSTRAINT "competency_remarks_written_by_users_id_fk" FOREIGN KEY ("written_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "competency_remarks_unique" ON "competency_remarks" USING btree ("teacher_assignment_id","student_id","month");--> statement-breakpoint
CREATE INDEX "competency_remarks_student_idx" ON "competency_remarks" USING btree ("student_id","month");
