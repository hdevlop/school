-- The teacher's follow-up of a homework, one row per pupil: done, incomplete
-- or not done, with an optional remark. No row is "not checked yet". It goes
-- with its homework and with the pupil. Additive.
CREATE TYPE "public"."homeworkCompletionStatus" AS ENUM('done', 'incomplete', 'not_done');--> statement-breakpoint
CREATE TABLE "homework_completions" (
	"id" text PRIMARY KEY NOT NULL,
	"homework_id" text NOT NULL,
	"student_id" text NOT NULL,
	"status" "homeworkCompletionStatus" NOT NULL,
	"note" text,
	"recorded_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "homework_completions" ADD CONSTRAINT "homework_completions_homework_id_homework_id_fk" FOREIGN KEY ("homework_id") REFERENCES "public"."homework"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "homework_completions" ADD CONSTRAINT "homework_completions_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "homework_completions" ADD CONSTRAINT "homework_completions_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "homework_completions_unique" ON "homework_completions" USING btree ("homework_id","student_id");--> statement-breakpoint
CREATE INDEX "homework_completions_student_idx" ON "homework_completions" USING btree ("student_id","status");