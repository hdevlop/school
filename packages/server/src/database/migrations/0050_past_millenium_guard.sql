CREATE TABLE "student_enrollment_placements" (
	"id" text PRIMARY KEY NOT NULL,
	"enrollment_id" text NOT NULL,
	"class_id" text NOT NULL,
	"section_id" text NOT NULL,
	"valid_from" date NOT NULL,
	"valid_to" date,
	"reason" text,
	"actor_id" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "student_placements_dates_check" CHECK ("student_enrollment_placements"."valid_to" IS NULL OR "student_enrollment_placements"."valid_to" > "student_enrollment_placements"."valid_from")
);
--> statement-breakpoint
CREATE TABLE "student_enrollments" (
	"id" text PRIMARY KEY NOT NULL,
	"student_id" text NOT NULL,
	"academic_year_id" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"enrolled_on" date NOT NULL,
	"left_on" date,
	"created_by" text,
	"updated_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "student_enrollments_dates_check" CHECK ("student_enrollments"."left_on" IS NULL OR "student_enrollments"."left_on" > "student_enrollments"."enrolled_on"),
	CONSTRAINT "student_enrollments_status_check" CHECK ("student_enrollments"."status" IN ('active', 'withdrawn', 'graduated', 'transferred'))
);
--> statement-breakpoint
ALTER TABLE "student_enrollment_placements" ADD CONSTRAINT "student_enrollment_placements_enrollment_id_student_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."student_enrollments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_enrollment_placements" ADD CONSTRAINT "student_enrollment_placements_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_enrollment_placements" ADD CONSTRAINT "student_enrollment_placements_section_id_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_enrollment_placements" ADD CONSTRAINT "student_enrollment_placements_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_enrollments" ADD CONSTRAINT "student_enrollments_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_enrollments" ADD CONSTRAINT "student_enrollments_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_enrollments" ADD CONSTRAINT "student_enrollments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_enrollments" ADD CONSTRAINT "student_enrollments_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "student_placements_enrollment_dates_idx" ON "student_enrollment_placements" USING btree ("enrollment_id","valid_from","valid_to");--> statement-breakpoint
CREATE UNIQUE INDEX "student_placements_one_open_unique" ON "student_enrollment_placements" USING btree ("enrollment_id") WHERE "student_enrollment_placements"."valid_to" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "student_enrollments_student_year_unique" ON "student_enrollments" USING btree ("student_id","academic_year_id");--> statement-breakpoint
CREATE INDEX "student_enrollments_year_student_idx" ON "student_enrollments" USING btree ("academic_year_id","student_id");--> statement-breakpoint
CREATE FUNCTION validate_student_enrollment() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  year_starts_on date;
  year_ends_on date;
BEGIN
  IF TG_OP = 'UPDATE' AND (
    NEW.student_id IS DISTINCT FROM OLD.student_id OR
    NEW.academic_year_id IS DISTINCT FROM OLD.academic_year_id OR
    NEW.enrolled_on IS DISTINCT FROM OLD.enrolled_on
  ) THEN
    RAISE EXCEPTION 'Historical enrollment identity and start date cannot be rewritten';
  END IF;

  SELECT reporting_starts_on, reporting_ends_on INTO year_starts_on, year_ends_on
  FROM academic_years WHERE id = NEW.academic_year_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Academic year does not exist'; END IF;
  IF NEW.enrolled_on < year_starts_on OR NEW.enrolled_on > year_ends_on OR
     (NEW.left_on IS NOT NULL AND NEW.left_on > year_ends_on + 1) THEN
    RAISE EXCEPTION 'Enrollment dates are outside the academic year';
  END IF;
  IF (NEW.left_on IS NULL AND NEW.status <> 'active') OR
     (NEW.left_on IS NOT NULL AND NEW.status = 'active') THEN
    RAISE EXCEPTION 'Enrollment status does not match its end date';
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.left_on IS NOT NULL AND EXISTS (
    SELECT 1 FROM student_enrollment_placements p
    WHERE p.enrollment_id = NEW.id AND
      (p.valid_to IS NULL OR p.valid_to > NEW.left_on)
  ) THEN
    RAISE EXCEPTION 'Close dated placements before ending an enrollment';
  END IF;
  RETURN NEW;
END $$;--> statement-breakpoint
CREATE TRIGGER student_enrollment_integrity
BEFORE INSERT OR UPDATE ON student_enrollments
FOR EACH ROW EXECUTE FUNCTION validate_student_enrollment();--> statement-breakpoint
CREATE FUNCTION validate_student_placement() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  enrolled_on date;
  left_on date;
  year_label text;
  year_starts_on date;
  year_ends_on date;
  class_year text;
  section_class_id text;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.enrollment_id IS DISTINCT FROM OLD.enrollment_id OR
       NEW.class_id IS DISTINCT FROM OLD.class_id OR
       NEW.section_id IS DISTINCT FROM OLD.section_id OR
       NEW.valid_from IS DISTINCT FROM OLD.valid_from THEN
      RAISE EXCEPTION 'Historical placement identity cannot be rewritten';
    END IF;
  END IF;

  SELECT e.enrolled_on, e.left_on, y.label, y.reporting_starts_on, y.reporting_ends_on
    INTO enrolled_on, left_on, year_label, year_starts_on, year_ends_on
  FROM student_enrollments e JOIN academic_years y ON y.id = e.academic_year_id
  WHERE e.id = NEW.enrollment_id FOR UPDATE OF e;
  IF NOT FOUND THEN RAISE EXCEPTION 'Enrollment does not exist'; END IF;

  SELECT c.academic_year, s.class_id INTO class_year, section_class_id
  FROM classes c JOIN sections s ON s.class_id = c.id
  WHERE c.id = NEW.class_id AND s.id = NEW.section_id;
  IF NOT FOUND OR class_year <> year_label OR section_class_id <> NEW.class_id THEN
    RAISE EXCEPTION 'Placement class or section belongs to another year';
  END IF;
  IF NEW.valid_from < enrolled_on OR NEW.valid_from < year_starts_on OR
     NEW.valid_from > year_ends_on OR
     (NEW.valid_to IS NOT NULL AND NEW.valid_to > year_ends_on + 1) OR
     (left_on IS NOT NULL AND COALESCE(NEW.valid_to, 'infinity'::date) > left_on) THEN
    RAISE EXCEPTION 'Placement is outside its enrollment interval';
  END IF;
  IF EXISTS (
    SELECT 1 FROM student_enrollment_placements p
    WHERE p.enrollment_id = NEW.enrollment_id AND p.id <> NEW.id
      AND daterange(p.valid_from, COALESCE(p.valid_to, 'infinity'::date), '[)')
          && daterange(NEW.valid_from, COALESCE(NEW.valid_to, 'infinity'::date), '[)')
  ) THEN
    RAISE EXCEPTION 'Placement intervals overlap';
  END IF;
  RETURN NEW;
END $$;--> statement-breakpoint
CREATE TRIGGER student_placement_integrity
BEFORE INSERT OR UPDATE ON student_enrollment_placements
FOR EACH ROW EXECUTE FUNCTION validate_student_placement();--> statement-breakpoint
CREATE FUNCTION retain_placed_class_year() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.academic_year IS DISTINCT FROM OLD.academic_year
     AND EXISTS (SELECT 1 FROM student_enrollment_placements WHERE class_id = OLD.id) THEN
    RAISE EXCEPTION 'Class year is referenced by historical placements';
  END IF;
  RETURN NEW;
END $$;--> statement-breakpoint
CREATE TRIGGER retain_placed_class_year BEFORE UPDATE OF academic_year ON classes
FOR EACH ROW EXECUTE FUNCTION retain_placed_class_year();--> statement-breakpoint
CREATE FUNCTION retain_placed_section_class() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.class_id IS DISTINCT FROM OLD.class_id
     AND EXISTS (SELECT 1 FROM student_enrollment_placements WHERE section_id = OLD.id) THEN
    RAISE EXCEPTION 'Section class is referenced by historical placements';
  END IF;
  RETURN NEW;
END $$;--> statement-breakpoint
CREATE TRIGGER retain_placed_section_class BEFORE UPDATE OF class_id ON sections
FOR EACH ROW EXECUTE FUNCTION retain_placed_section_class();
