-- Run only on the disposable legacy-two-year fixture after migrations 0049-0057
-- and confirmed-active-placement.sql. Every attempt is rolled back.
BEGIN;

DO $test$
BEGIN
  BEGIN
    INSERT INTO student_enrollment_placements
      (id, enrollment_id, class_id, section_id, valid_from, valid_to)
    VALUES ('fixture_invalid_year_placement', 'fixture_enrollment_active',
      'fixture_class_old', 'fixture_section_old', '2026-10-01', '2026-10-02');
    RAISE EXCEPTION 'Wrong-year placement unexpectedly succeeded';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'Placement class or section belongs to another year' THEN
      RAISE;
    END IF;
  END;

  BEGIN
    INSERT INTO student_enrollment_placements
      (id, enrollment_id, class_id, section_id, valid_from, valid_to)
    VALUES ('fixture_overlapping_placement', 'fixture_enrollment_active',
      'fixture_class_active', 'fixture_section_active', '2026-10-01', '2026-10-02');
    RAISE EXCEPTION 'Overlapping placement unexpectedly succeeded';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'Placement intervals overlap' THEN
      RAISE;
    END IF;
  END;

  BEGIN
    UPDATE student_enrollments SET enrolled_on = '2026-09-02'
    WHERE id = 'fixture_enrollment_active';
    RAISE EXCEPTION 'Historical enrollment identity rewrite unexpectedly succeeded';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'Historical enrollment identity and start date cannot be rewritten' THEN
      RAISE;
    END IF;
  END;

  BEGIN
    UPDATE classes SET academic_year = '2025-2026' WHERE id = 'fixture_class_active';
    RAISE EXCEPTION 'Placed class year rewrite unexpectedly succeeded';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'Class year is referenced by historical placements, academic records, or routines' THEN
      RAISE;
    END IF;
  END;

  BEGIN
    UPDATE assessments SET date = '2028-09-01'
    WHERE id = 'fixture_assessment_active';
    RAISE EXCEPTION 'Graded assessment context rewrite unexpectedly succeeded';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'Cannot change the historical context of a graded academic source' THEN
      RAISE;
    END IF;
  END;
END $test$;

ROLLBACK;
