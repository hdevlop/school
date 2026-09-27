ALTER TABLE "attendance" ADD COLUMN "academic_year_id" text;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attendance_year_date_idx" ON "attendance" USING btree ("academic_year_id","date");
--> statement-breakpoint
CREATE FUNCTION school_validate_attendance_year() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_year_label text;
  v_starts_on date;
  v_ends_on date;
  v_section_year text;
  v_assignment_section_id text;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.academic_year_id IS NOT NULL AND (
    NEW.academic_year_id IS DISTINCT FROM OLD.academic_year_id OR
    NEW.type IS DISTINCT FROM OLD.type OR
    NEW.student_id IS DISTINCT FROM OLD.student_id OR
    NEW.staff_id IS DISTINCT FROM OLD.staff_id OR
    NEW.section_id IS DISTINCT FROM OLD.section_id OR
    NEW.teacher_assignment_id IS DISTINCT FROM OLD.teacher_assignment_id OR
    NEW.date IS DISTINCT FROM OLD.date
  ) THEN
    RAISE EXCEPTION 'Registered attendance context cannot be rewritten';
  END IF;

  IF NEW.academic_year_id IS NULL THEN RETURN NEW; END IF;
  SELECT label, reporting_starts_on, reporting_ends_on
    INTO v_year_label, v_starts_on, v_ends_on
    FROM academic_years WHERE id = NEW.academic_year_id;
  IF NOT FOUND OR NEW.date < v_starts_on OR NEW.date > v_ends_on THEN
    RAISE EXCEPTION 'Attendance date is outside its registered academic year';
  END IF;

  IF NEW.type = 'student' THEN
    IF NEW.student_id IS NULL OR NEW.section_id IS NULL THEN
      RAISE EXCEPTION 'Registered student attendance requires student and section';
    END IF;
    SELECT school_class.academic_year INTO v_section_year
      FROM sections AS section JOIN classes AS school_class ON school_class.id = section.class_id
      WHERE section.id = NEW.section_id;
    IF NOT FOUND OR v_section_year IS DISTINCT FROM v_year_label THEN
      RAISE EXCEPTION 'Attendance section belongs to another academic year';
    END IF;
    IF NEW.teacher_assignment_id IS NOT NULL THEN
      SELECT section_id INTO v_assignment_section_id FROM teacher_assignments
        WHERE id = NEW.teacher_assignment_id;
      IF NOT FOUND OR v_assignment_section_id IS DISTINCT FROM NEW.section_id THEN
        RAISE EXCEPTION 'Attendance assignment belongs to another section';
      END IF;
    END IF;
    IF EXISTS (SELECT 1 FROM student_enrollments WHERE student_id = NEW.student_id)
      AND NOT EXISTS (
        SELECT 1 FROM student_enrollments AS enrollment
        JOIN student_enrollment_placements AS placement ON placement.enrollment_id = enrollment.id
        WHERE enrollment.student_id = NEW.student_id
          AND enrollment.academic_year_id = NEW.academic_year_id
          AND enrollment.enrolled_on <= NEW.date
          AND (enrollment.left_on IS NULL OR NEW.date < enrollment.left_on)
          AND placement.section_id = NEW.section_id
          AND placement.valid_from <= NEW.date
          AND (placement.valid_to IS NULL OR NEW.date < placement.valid_to)
      ) THEN
      RAISE EXCEPTION 'Student has no dated placement for registered attendance';
    END IF;
  ELSIF NEW.type = 'staff' THEN
    IF NEW.staff_id IS NULL THEN
      RAISE EXCEPTION 'Registered staff attendance requires staff';
    END IF;
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER school_validate_attendance_year
  BEFORE INSERT OR UPDATE OF academic_year_id, type, student_id, staff_id, section_id, teacher_assignment_id, date
  ON attendance FOR EACH ROW EXECUTE FUNCTION school_validate_attendance_year();
--> statement-breakpoint
CREATE FUNCTION retain_registered_attendance_class_year() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.academic_year IS DISTINCT FROM OLD.academic_year AND EXISTS (
    SELECT 1 FROM attendance AS record
    JOIN sections AS section ON section.id = record.section_id
    WHERE section.class_id = OLD.id AND record.academic_year_id IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Class year is referenced by registered attendance';
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER retain_registered_attendance_class_year
  BEFORE UPDATE OF academic_year ON classes
  FOR EACH ROW EXECUTE FUNCTION retain_registered_attendance_class_year();
--> statement-breakpoint
CREATE FUNCTION retain_registered_attendance_section_class() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.class_id IS DISTINCT FROM OLD.class_id AND EXISTS (
    SELECT 1 FROM attendance
    WHERE section_id = OLD.id AND academic_year_id IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Section class is referenced by registered attendance';
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER retain_registered_attendance_section_class
  BEFORE UPDATE OF class_id ON sections
  FOR EACH ROW EXECUTE FUNCTION retain_registered_attendance_section_class();
