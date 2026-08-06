CREATE TABLE "attendance_history" (
	"id" text PRIMARY KEY NOT NULL,
	"attendance_id" text NOT NULL,
	"old_status" "attendanceStatus",
	"new_status" "attendanceStatus" NOT NULL,
	"note" text,
	"changed_by" text,
	"changed_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "attendance" ADD COLUMN "section_id" text;--> statement-breakpoint
ALTER TABLE "attendance" ADD COLUMN "last_updated_by" text;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "attendance_mode" text DEFAULT 'daily';--> statement-breakpoint
ALTER TABLE "attendance_history" ADD CONSTRAINT "attendance_history_attendance_id_attendance_id_fk" FOREIGN KEY ("attendance_id") REFERENCES "public"."attendance"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_history" ADD CONSTRAINT "attendance_history_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_section_id_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_last_updated_by_users_id_fk" FOREIGN KEY ("last_updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
UPDATE "attendance" SET "section_id" = "teacher_assignments"."section_id"
FROM "teacher_assignments"
WHERE "attendance"."teacher_assignment_id" = "teacher_assignments"."id"
  AND "attendance"."section_id" IS NULL;