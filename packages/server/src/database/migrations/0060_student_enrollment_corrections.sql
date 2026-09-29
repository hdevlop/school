-- Validate the final transaction state so an audited correction can change
-- enrollment dates and its placement together without inventing a transfer.
CREATE OR REPLACE FUNCTION validate_student_enrollment() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  e student_enrollments%ROWTYPE;
  y academic_years%ROWTYPE;
  admission date;
BEGIN
  IF TG_OP = 'UPDATE' AND (NEW.student_id IS DISTINCT FROM OLD.student_id OR
    NEW.academic_year_id IS DISTINCT FROM OLD.academic_year_id) THEN
    RAISE EXCEPTION 'Historical enrollment identity cannot be rewritten';
  END IF;
  SELECT * INTO e FROM student_enrollments WHERE id = NEW.id FOR UPDATE;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT * INTO y FROM academic_years WHERE id = e.academic_year_id;
  SELECT enrollment_date INTO admission FROM students WHERE id = e.student_id;
  IF e.enrolled_on < y.reporting_starts_on OR e.enrolled_on > y.reporting_ends_on OR
    (e.left_on IS NOT NULL AND (e.left_on <= e.enrolled_on OR e.left_on > y.reporting_ends_on + 1)) OR
    (admission IS NOT NULL AND e.enrolled_on < admission) THEN
    RAISE EXCEPTION 'Enrollment dates are outside the academic year or admission interval';
  END IF;
  IF (e.left_on IS NULL AND e.status <> 'active') OR (e.left_on IS NOT NULL AND e.status = 'active') THEN
    RAISE EXCEPTION 'Enrollment status does not match its end date';
  END IF;
  IF EXISTS (SELECT 1 FROM student_enrollment_placements p WHERE p.enrollment_id = e.id AND
    (p.valid_from < e.enrolled_on OR (e.left_on IS NOT NULL AND (p.valid_to IS NULL OR p.valid_to > e.left_on)))) THEN
    RAISE EXCEPTION 'Dated placements must fit the enrollment interval';
  END IF;
  RETURN NULL;
END $$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION validate_student_placement() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  p student_enrollment_placements%ROWTYPE;
  e student_enrollments%ROWTYPE;
  y academic_years%ROWTYPE;
  class_year text;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.enrollment_id IS DISTINCT FROM OLD.enrollment_id THEN
    RAISE EXCEPTION 'Historical placement enrollment cannot be rewritten';
  END IF;
  SELECT * INTO p FROM student_enrollment_placements WHERE id = NEW.id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT * INTO e FROM student_enrollments WHERE id = p.enrollment_id FOR UPDATE;
  SELECT * INTO y FROM academic_years WHERE id = e.academic_year_id;
  SELECT c.academic_year INTO class_year FROM classes c JOIN sections s ON s.class_id = c.id
    WHERE c.id = p.class_id AND s.id = p.section_id;
  IF NOT FOUND OR class_year <> y.label THEN
    RAISE EXCEPTION 'Placement class or section belongs to another year';
  END IF;
  IF p.valid_from < e.enrolled_on OR p.valid_from < y.reporting_starts_on OR p.valid_from > y.reporting_ends_on OR
    (p.valid_to IS NOT NULL AND (p.valid_to <= p.valid_from OR p.valid_to > y.reporting_ends_on + 1)) OR
    (e.left_on IS NOT NULL AND (p.valid_to IS NULL OR p.valid_to > e.left_on)) THEN
    RAISE EXCEPTION 'Placement is outside its enrollment interval';
  END IF;
  IF EXISTS (SELECT 1 FROM student_enrollment_placements other WHERE other.enrollment_id = p.enrollment_id AND other.id <> p.id
    AND daterange(other.valid_from, COALESCE(other.valid_to, 'infinity'::date), '[)')
      && daterange(p.valid_from, COALESCE(p.valid_to, 'infinity'::date), '[)')) THEN
    RAISE EXCEPTION 'Placement intervals overlap';
  END IF;
  RETURN NULL;
END $$;
--> statement-breakpoint
DROP TRIGGER student_enrollment_integrity ON student_enrollments;
--> statement-breakpoint
DROP TRIGGER student_placement_integrity ON student_enrollment_placements;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER student_enrollment_integrity AFTER INSERT OR UPDATE ON student_enrollments
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION validate_student_enrollment();
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER student_placement_integrity AFTER INSERT OR UPDATE ON student_enrollment_placements
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION validate_student_placement();
