ALTER TABLE "grades" DROP CONSTRAINT "grades_assessment_id_assessments_id_fk";
--> statement-breakpoint
ALTER TABLE "grades" DROP CONSTRAINT "grades_exam_id_exams_id_fk";
--> statement-breakpoint
ALTER TABLE "grades" ADD CONSTRAINT "grades_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grades" ADD CONSTRAINT "grades_exam_id_exams_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE FUNCTION school_validate_academic_source_year() RETURNS trigger AS $$
DECLARE
  v_year_label text;
  v_starts_on date;
  v_ends_on date;
  v_assignment_section_id text;
  v_assignment_class_id text;
  v_section_class_id text;
  v_class_year text;
  v_has_grades boolean;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF TG_TABLE_NAME = 'assessments' THEN
      SELECT EXISTS(SELECT 1 FROM grades WHERE assessment_id = OLD.id) INTO v_has_grades;
    ELSE
      SELECT EXISTS(SELECT 1 FROM grades WHERE exam_id = OLD.id) INTO v_has_grades;
    END IF;
    IF v_has_grades AND (
      OLD.date IS DISTINCT FROM NEW.date OR
      OLD.teacher_assignment_id IS DISTINCT FROM NEW.teacher_assignment_id OR
      OLD.section_ids IS DISTINCT FROM NEW.section_ids OR
      (OLD.academic_year_id IS NOT NULL AND OLD.academic_year_id IS DISTINCT FROM NEW.academic_year_id)
    ) THEN
      RAISE EXCEPTION 'Cannot change the historical context of a graded academic source';
    END IF;
    IF v_has_grades AND OLD.academic_year_id IS NULL AND NEW.academic_year_id IS NOT NULL THEN
      IF TG_TABLE_NAME = 'assessments' THEN
        IF EXISTS (
          SELECT 1 FROM grades
          WHERE assessment_id = OLD.id AND academic_year_id IS NOT NULL
            AND academic_year_id IS DISTINCT FROM NEW.academic_year_id
        ) THEN
          RAISE EXCEPTION 'Assessment year conflicts with an existing registered grade';
        END IF;
      ELSE
        IF EXISTS (
          SELECT 1 FROM grades
          WHERE exam_id = OLD.id AND academic_year_id IS NOT NULL
            AND academic_year_id IS DISTINCT FROM NEW.academic_year_id
        ) THEN
          RAISE EXCEPTION 'Exam year conflicts with an existing registered grade';
        END IF;
      END IF;
    END IF;
  END IF;

  -- Legacy rows remain nullable until their year and targets are reviewed.
  IF NEW.academic_year_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT label, reporting_starts_on, reporting_ends_on
    INTO v_year_label, v_starts_on, v_ends_on
    FROM academic_years WHERE id = NEW.academic_year_id;
  IF NOT FOUND OR NEW.date < v_starts_on OR NEW.date > v_ends_on THEN
    RAISE EXCEPTION 'Academic source date is outside its registered year';
  END IF;

  SELECT assignment.section_id, assignment.class_id, section.class_id, class.academic_year
    INTO v_assignment_section_id, v_assignment_class_id, v_section_class_id, v_class_year
    FROM teacher_assignments AS assignment
    JOIN sections AS section ON section.id = assignment.section_id
    JOIN classes AS class ON class.id = section.class_id
    WHERE assignment.id = NEW.teacher_assignment_id;
  IF NOT FOUND OR v_assignment_class_id IS DISTINCT FROM v_section_class_id
    OR v_class_year IS DISTINCT FROM v_year_label THEN
    RAISE EXCEPTION 'Academic source assignment does not belong to its registered year';
  END IF;

  IF NEW.section_ids IS NOT NULL THEN
    IF jsonb_typeof(NEW.section_ids) IS DISTINCT FROM 'array' THEN
      RAISE EXCEPTION 'Academic source sections must be an array';
    END IF;
    IF jsonb_array_length(NEW.section_ids) = 0
      OR NOT (NEW.section_ids ? v_assignment_section_id) THEN
      RAISE EXCEPTION 'Academic source must target its assignment section';
    END IF;
    IF EXISTS (
      SELECT 1
      FROM jsonb_array_elements_text(NEW.section_ids) AS target(section_id)
      LEFT JOIN sections AS section ON section.id = target.section_id
      LEFT JOIN classes AS class ON class.id = section.class_id
      WHERE section.id IS NULL OR class.academic_year IS DISTINCT FROM v_year_label
    ) THEN
      RAISE EXCEPTION 'Academic source target sections span different years';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER assessments_year_context_guard
  BEFORE INSERT OR UPDATE OF academic_year_id, date, teacher_assignment_id, section_ids
  ON assessments FOR EACH ROW EXECUTE FUNCTION school_validate_academic_source_year();
--> statement-breakpoint
CREATE TRIGGER exams_year_context_guard
  BEFORE INSERT OR UPDATE OF academic_year_id, date, teacher_assignment_id, section_ids
  ON exams FOR EACH ROW EXECUTE FUNCTION school_validate_academic_source_year();
--> statement-breakpoint
CREATE FUNCTION school_validate_grade_year() RETURNS trigger AS $$
DECLARE
  v_source_year_id text;
  v_source_date date;
  v_target_sections jsonb;
  v_primary_section_id text;
  v_assignment_class_id text;
  v_section_class_id text;
  v_source_class_year text;
  v_year_label text;
  v_starts_on date;
  v_ends_on date;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.academic_year_id IS NOT NULL AND (
    OLD.academic_year_id IS DISTINCT FROM NEW.academic_year_id OR
    OLD.assessment_id IS DISTINCT FROM NEW.assessment_id OR
    OLD.exam_id IS DISTINCT FROM NEW.exam_id
  ) THEN
    RAISE EXCEPTION 'Registered grade source and year cannot be changed';
  END IF;
  IF NEW.academic_year_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF (NEW.assessment_id IS NULL) = (NEW.exam_id IS NULL) THEN
    RAISE EXCEPTION 'A registered grade must have exactly one source';
  END IF;

  IF NEW.assessment_id IS NOT NULL THEN
    SELECT source.academic_year_id, source.date, source.section_ids,
      assignment.section_id, assignment.class_id, section.class_id, class.academic_year
      INTO v_source_year_id, v_source_date, v_target_sections,
        v_primary_section_id, v_assignment_class_id, v_section_class_id, v_source_class_year
      FROM assessments AS source
      JOIN teacher_assignments AS assignment ON assignment.id = source.teacher_assignment_id
      JOIN sections AS section ON section.id = assignment.section_id
      JOIN classes AS class ON class.id = section.class_id
      WHERE source.id = NEW.assessment_id
      FOR SHARE OF source;
  ELSE
    SELECT source.academic_year_id, source.date, source.section_ids,
      assignment.section_id, assignment.class_id, section.class_id, class.academic_year
      INTO v_source_year_id, v_source_date, v_target_sections,
        v_primary_section_id, v_assignment_class_id, v_section_class_id, v_source_class_year
      FROM exams AS source
      JOIN teacher_assignments AS assignment ON assignment.id = source.teacher_assignment_id
      JOIN sections AS section ON section.id = assignment.section_id
      JOIN classes AS class ON class.id = section.class_id
      WHERE source.id = NEW.exam_id
      FOR SHARE OF source;
  END IF;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Registered grade source has no valid assignment';
  END IF;

  SELECT label, reporting_starts_on, reporting_ends_on
    INTO v_year_label, v_starts_on, v_ends_on
    FROM academic_years WHERE id = NEW.academic_year_id;
  IF NOT FOUND OR v_source_date < v_starts_on OR v_source_date > v_ends_on
    OR v_source_class_year IS DISTINCT FROM v_year_label
    OR v_assignment_class_id IS DISTINCT FROM v_section_class_id
    OR (v_source_year_id IS NOT NULL AND v_source_year_id IS DISTINCT FROM NEW.academic_year_id) THEN
    RAISE EXCEPTION 'Grade source conflicts with its registered academic year';
  END IF;

  IF v_target_sections IS NOT NULL THEN
    IF jsonb_typeof(v_target_sections) IS DISTINCT FROM 'array'
      OR jsonb_array_length(v_target_sections) = 0
      OR NOT (v_target_sections ? v_primary_section_id) THEN
      RAISE EXCEPTION 'Grade source has invalid target sections';
    END IF;
    IF EXISTS (
      SELECT 1 FROM jsonb_array_elements_text(v_target_sections) AS target(section_id)
      LEFT JOIN sections AS section ON section.id = target.section_id
      LEFT JOIN classes AS class ON class.id = section.class_id
      WHERE section.id IS NULL OR class.academic_year IS DISTINCT FROM v_year_label
    ) THEN
      RAISE EXCEPTION 'Grade source target sections conflict with its year';
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM student_enrollments WHERE student_id = NEW.student_id)
    AND NOT EXISTS (
      SELECT 1 FROM student_enrollments AS enrollment
      JOIN student_enrollment_placements AS placement ON placement.enrollment_id = enrollment.id
      WHERE enrollment.student_id = NEW.student_id
        AND enrollment.academic_year_id = NEW.academic_year_id
        AND enrollment.enrolled_on <= v_source_date
        AND (enrollment.left_on IS NULL OR v_source_date < enrollment.left_on)
        AND placement.valid_from <= v_source_date
        AND (placement.valid_to IS NULL OR v_source_date < placement.valid_to)
        AND (
          (v_target_sections IS NULL AND placement.section_id = v_primary_section_id)
          OR (v_target_sections IS NOT NULL AND v_target_sections ? placement.section_id)
        )
    ) THEN
    RAISE EXCEPTION 'Student has no dated grade placement in a source section';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER grades_year_context_guard
  BEFORE INSERT OR UPDATE OF academic_year_id, assessment_id, exam_id, student_id
  ON grades FOR EACH ROW EXECUTE FUNCTION school_validate_grade_year();
