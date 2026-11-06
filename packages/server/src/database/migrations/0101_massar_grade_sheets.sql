CREATE TABLE "massar_classes" (
	"id" text PRIMARY KEY NOT NULL,
	"academic_year_id" text NOT NULL,
	"name" text NOT NULL,
	"level_id" text NOT NULL,
	"guid" text NOT NULL,
	"class_id" text,
	"section_id" text,
	"unmatched_codes" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "massar_enrollments" (
	"id" text PRIMARY KEY NOT NULL,
	"academic_year_id" text NOT NULL,
	"student_id" text NOT NULL,
	"massar_class_id" text NOT NULL,
	"massar_student_id" text,
	"massar_student_id_numeric" boolean DEFAULT false NOT NULL,
	"name" text NOT NULL,
	"date_of_birth" text NOT NULL,
	"position" integer NOT NULL,
	"left_on" date
);
--> statement-breakpoint
CREATE TABLE "massar_imports" (
	"id" text PRIMARY KEY NOT NULL,
	"academic_year_id" text NOT NULL,
	"actor_id" text NOT NULL,
	"file_id" text NOT NULL,
	"digest" text NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "massar_levels" (
	"id" text PRIMARY KEY NOT NULL,
	"academic_year_id" text NOT NULL,
	"code" text NOT NULL,
	"label" text NOT NULL,
	"level_code" text NOT NULL,
	"level_code_numeric" boolean DEFAULT false NOT NULL,
	"max_mark" integer NOT NULL,
	"kind" text NOT NULL,
	CONSTRAINT "massar_level_kind_check" CHECK ("massar_levels"."kind" in ('components', 'exam')),
	CONSTRAINT "massar_max_check" CHECK ("massar_levels"."max_mark" in (10, 20))
);
--> statement-breakpoint
CREATE TABLE "massar_marks" (
	"id" text PRIMARY KEY NOT NULL,
	"academic_year_id" text NOT NULL,
	"sheet_id" text NOT NULL,
	"student_id" text NOT NULL,
	"component_code" text NOT NULL,
	"mark" numeric,
	"absence" text DEFAULT 'none' NOT NULL,
	"updated_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "massar_mark_check" CHECK (("massar_marks"."mark" is null or "massar_marks"."mark" between 0 and 20) and ("massar_marks"."absence" = 'none' or ("massar_marks"."absence" = 'justified' and "massar_marks"."mark" is null)))
);
--> statement-breakpoint
CREATE TABLE "massar_rounds" (
	"id" text PRIMARY KEY NOT NULL,
	"academic_year_id" text NOT NULL,
	"term" integer NOT NULL,
	"term_label" text NOT NULL,
	"exam" integer NOT NULL,
	"exam_label" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "massar_round_status_check" CHECK ("massar_rounds"."status" in ('open','exported','closed'))
);
--> statement-breakpoint
CREATE TABLE "massar_sheets" (
	"id" text PRIMARY KEY NOT NULL,
	"academic_year_id" text NOT NULL,
	"round_id" text NOT NULL,
	"massar_class_id" text NOT NULL,
	"massar_subject_id" text NOT NULL,
	"teacher_assignment_id" text,
	"roster" jsonb NOT NULL,
	"components" jsonb NOT NULL,
	"status" text DEFAULT 'not_started' NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	"teacher_unlocked" boolean DEFAULT false NOT NULL,
	"exported_at" timestamp,
	"export_hash" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "massar_sheet_status_check" CHECK ("massar_sheets"."status" in ('not_started','in_progress','submitted','exported','changed_after_export'))
);
--> statement-breakpoint
CREATE TABLE "massar_subjects" (
	"id" text PRIMARY KEY NOT NULL,
	"academic_year_id" text NOT NULL,
	"level_id" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"subject_id" text,
	"components" jsonb NOT NULL,
	"observed_rounds" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "massar_years" (
	"id" text PRIMARY KEY NOT NULL,
	"academic_year_id" text NOT NULL,
	"massar_year_id" integer NOT NULL,
	"school_code" text NOT NULL,
	"academy" text NOT NULL,
	"direction" text NOT NULL,
	"school_name" text NOT NULL,
	"template_file_id" text NOT NULL,
	"imported_at" timestamp DEFAULT now() NOT NULL,
	"imported_by" text
);
--> statement-breakpoint
ALTER TABLE "massar_classes" ADD CONSTRAINT "massar_classes_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "massar_classes" ADD CONSTRAINT "massar_classes_level_id_massar_levels_id_fk" FOREIGN KEY ("level_id") REFERENCES "public"."massar_levels"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "massar_classes" ADD CONSTRAINT "massar_classes_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "massar_classes" ADD CONSTRAINT "massar_classes_section_id_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "massar_enrollments" ADD CONSTRAINT "massar_enrollments_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "massar_enrollments" ADD CONSTRAINT "massar_enrollments_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "massar_enrollments" ADD CONSTRAINT "massar_enrollments_massar_class_id_massar_classes_id_fk" FOREIGN KEY ("massar_class_id") REFERENCES "public"."massar_classes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "massar_imports" ADD CONSTRAINT "massar_imports_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "massar_imports" ADD CONSTRAINT "massar_imports_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "massar_levels" ADD CONSTRAINT "massar_levels_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "massar_marks" ADD CONSTRAINT "massar_marks_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "massar_marks" ADD CONSTRAINT "massar_marks_sheet_id_massar_sheets_id_fk" FOREIGN KEY ("sheet_id") REFERENCES "public"."massar_sheets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "massar_marks" ADD CONSTRAINT "massar_marks_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "massar_marks" ADD CONSTRAINT "massar_marks_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "massar_rounds" ADD CONSTRAINT "massar_rounds_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "massar_rounds" ADD CONSTRAINT "massar_rounds_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "massar_sheets" ADD CONSTRAINT "massar_sheets_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "massar_sheets" ADD CONSTRAINT "massar_sheets_round_id_massar_rounds_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."massar_rounds"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "massar_sheets" ADD CONSTRAINT "massar_sheets_massar_class_id_massar_classes_id_fk" FOREIGN KEY ("massar_class_id") REFERENCES "public"."massar_classes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "massar_sheets" ADD CONSTRAINT "massar_sheets_massar_subject_id_massar_subjects_id_fk" FOREIGN KEY ("massar_subject_id") REFERENCES "public"."massar_subjects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "massar_sheets" ADD CONSTRAINT "massar_sheets_teacher_assignment_id_teacher_assignments_id_fk" FOREIGN KEY ("teacher_assignment_id") REFERENCES "public"."teacher_assignments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "massar_subjects" ADD CONSTRAINT "massar_subjects_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "massar_subjects" ADD CONSTRAINT "massar_subjects_level_id_massar_levels_id_fk" FOREIGN KEY ("level_id") REFERENCES "public"."massar_levels"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "massar_subjects" ADD CONSTRAINT "massar_subjects_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "massar_years" ADD CONSTRAINT "massar_years_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "massar_years" ADD CONSTRAINT "massar_years_imported_by_users_id_fk" FOREIGN KEY ("imported_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "massar_class_unique" ON "massar_classes" USING btree ("academic_year_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "massar_class_guid_unique" ON "massar_classes" USING btree ("academic_year_id","guid");--> statement-breakpoint
CREATE UNIQUE INDEX "massar_enrollment_unique" ON "massar_enrollments" USING btree ("academic_year_id","student_id");--> statement-breakpoint
CREATE INDEX "massar_roster_idx" ON "massar_enrollments" USING btree ("academic_year_id","massar_class_id");--> statement-breakpoint
CREATE UNIQUE INDEX "massar_level_unique" ON "massar_levels" USING btree ("academic_year_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "massar_mark_unique" ON "massar_marks" USING btree ("sheet_id","student_id","component_code");--> statement-breakpoint
CREATE UNIQUE INDEX "massar_round_unique" ON "massar_rounds" USING btree ("academic_year_id","term","exam");--> statement-breakpoint
CREATE UNIQUE INDEX "massar_sheet_unique" ON "massar_sheets" USING btree ("round_id","massar_class_id","massar_subject_id");--> statement-breakpoint
CREATE INDEX "massar_sheet_year_idx" ON "massar_sheets" USING btree ("academic_year_id","round_id");--> statement-breakpoint
CREATE UNIQUE INDEX "massar_subject_unique" ON "massar_subjects" USING btree ("academic_year_id","level_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "massar_year_unique" ON "massar_years" USING btree ("academic_year_id");
--> statement-breakpoint
-- Permissions for both fresh databases and the roles already in use.
INSERT INTO permissions (id, name, description, resource, action) VALUES
  ('perm_massar_read', 'read:massar', 'Read owned Massar sheets and progress', 'massar', 'read'),
  ('perm_massar_manage', 'manage:massar', 'Manage Massar imports, rounds and exports', 'massar', 'manage'),
  ('perm_massar_marks', 'update:massar-marks', 'Enter owned Massar marks', 'massar-marks', 'update'),
  ('perm_massar_sidebar', 'sidebar:massar', 'Show Massar navigation', 'sidebar', 'massar')
ON CONFLICT (name) DO NOTHING;
--> statement-breakpoint
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE (r.name IN ('admin', 'principal', 'registrar') AND p.name IN ('read:massar', 'manage:massar', 'update:massar-marks', 'sidebar:massar'))
   OR (r.name = 'teacher' AND p.name IN ('read:massar', 'update:massar-marks', 'sidebar:massar'))
   OR (r.name = 'supervisor' AND p.name IN ('read:massar', 'sidebar:massar'))
ON CONFLICT DO NOTHING;
