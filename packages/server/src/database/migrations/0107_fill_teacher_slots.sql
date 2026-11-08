-- Planning creates a class's exams before a teacher is assigned, on a teaching
-- assignment with no teacher yet. Giving that slot its first teacher rewrites
-- no history (its records never had a teacher), so it is the one change allowed
-- once records use the assignment. Every other change stays refused.
CREATE OR REPLACE FUNCTION retain_academic_assignment_context() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.teacher_id IS NULL AND NEW.teacher_id IS NOT NULL
    AND NEW.class_id IS NOT DISTINCT FROM OLD.class_id
    AND NEW.section_id IS NOT DISTINCT FROM OLD.section_id
    AND NEW.subject_id IS NOT DISTINCT FROM OLD.subject_id THEN
    RETURN NEW;
  END IF;
  IF (NEW.class_id IS DISTINCT FROM OLD.class_id
      OR NEW.section_id IS DISTINCT FROM OLD.section_id
      OR NEW.teacher_id IS DISTINCT FROM OLD.teacher_id
      OR NEW.subject_id IS DISTINCT FROM OLD.subject_id)
    AND (EXISTS (SELECT 1 FROM assessments WHERE teacher_assignment_id = OLD.id)
      OR EXISTS (SELECT 1 FROM exams WHERE teacher_assignment_id = OLD.id)
      OR EXISTS (SELECT 1 FROM routine_entries WHERE teacher_assignment_id = OLD.id)) THEN
    RAISE EXCEPTION 'Teaching assignment is referenced by historical academic records or routines';
  END IF;
  RETURN NEW;
END $$;
