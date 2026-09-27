ALTER TABLE "assessments" DROP CONSTRAINT "assessments_teacher_assignment_id_teacher_assignments_id_fk";
--> statement-breakpoint
ALTER TABLE "exams" DROP CONSTRAINT "exams_teacher_assignment_id_teacher_assignments_id_fk";
--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_teacher_assignment_id_teacher_assignments_id_fk" FOREIGN KEY ("teacher_assignment_id") REFERENCES "public"."teacher_assignments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exams" ADD CONSTRAINT "exams_teacher_assignment_id_teacher_assignments_id_fk" FOREIGN KEY ("teacher_assignment_id") REFERENCES "public"."teacher_assignments"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE FUNCTION retain_academic_assignment_context() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
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
--> statement-breakpoint
CREATE TRIGGER retain_academic_assignment_context
  BEFORE UPDATE OF class_id, section_id, teacher_id, subject_id ON teacher_assignments
  FOR EACH ROW EXECUTE FUNCTION retain_academic_assignment_context();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION retain_placed_class_year() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.academic_year IS DISTINCT FROM OLD.academic_year
    AND (
      EXISTS (SELECT 1 FROM student_enrollment_placements WHERE class_id = OLD.id)
      OR EXISTS (
        SELECT 1 FROM routine_schedules AS routine
        JOIN sections AS routine_section ON routine_section.id = routine.section_id
        WHERE routine_section.class_id = OLD.id
      )
      OR EXISTS (
        SELECT 1 FROM teacher_assignments AS assignment
        WHERE (assignment.class_id = OLD.id
          OR assignment.section_id IN (SELECT id FROM sections WHERE class_id = OLD.id))
          AND (EXISTS (SELECT 1 FROM assessments WHERE teacher_assignment_id = assignment.id)
            OR EXISTS (SELECT 1 FROM exams WHERE teacher_assignment_id = assignment.id)
            OR EXISTS (SELECT 1 FROM routine_entries WHERE teacher_assignment_id = assignment.id))
      )
    ) THEN
    RAISE EXCEPTION 'Class year is referenced by historical placements, academic records, or routines';
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION retain_placed_section_class() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.class_id IS DISTINCT FROM OLD.class_id
    AND (
      EXISTS (SELECT 1 FROM student_enrollment_placements WHERE section_id = OLD.id)
      OR EXISTS (SELECT 1 FROM routine_schedules WHERE section_id = OLD.id)
      OR EXISTS (
        SELECT 1 FROM teacher_assignments AS assignment
        WHERE assignment.section_id = OLD.id
          AND (EXISTS (SELECT 1 FROM assessments WHERE teacher_assignment_id = assignment.id)
            OR EXISTS (SELECT 1 FROM exams WHERE teacher_assignment_id = assignment.id)
            OR EXISTS (SELECT 1 FROM routine_entries WHERE teacher_assignment_id = assignment.id))
      )
    ) THEN
    RAISE EXCEPTION 'Section class is referenced by historical placements, academic records, or routines';
  END IF;
  RETURN NEW;
END $$;
