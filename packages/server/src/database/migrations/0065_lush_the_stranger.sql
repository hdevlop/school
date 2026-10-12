ALTER TABLE "settings" ADD COLUMN "teaching_days" jsonb DEFAULT '["monday","tuesday","wednesday","thursday","friday","saturday"]'::jsonb NOT NULL;
--> statement-breakpoint
-- Adopt the union of the active year's existing days and booked days so no
-- lesson or supervision disappears when the school-wide setting takes over.
WITH school AS (
  SELECT id, current_academic_year FROM settings ORDER BY created_at DESC LIMIT 1
), booked_days AS (
  SELECT jsonb_array_elements_text(r.active_days) AS day
  FROM routine_schedules r JOIN school s ON r.academic_year = s.current_academic_year
  WHERE r.status IN ('draft', 'published')
  UNION
  SELECT e.day_of_week::text FROM routine_entries e
  JOIN routine_schedules r ON r.id = e.schedule_id
  JOIN school s ON r.academic_year = s.current_academic_year
  WHERE r.status IN ('draft', 'published')
  UNION
  SELECT d.day_of_week::text FROM routine_duties d
  JOIN routine_schedules r ON r.id = d.schedule_id
  JOIN school s ON r.academic_year = s.current_academic_year
  WHERE r.status IN ('draft', 'published')
), ordered_days AS (
  SELECT day, array_position(ARRAY['monday','tuesday','wednesday','thursday','friday','saturday','sunday'], day) AS position
  FROM booked_days
)
UPDATE settings SET teaching_days = COALESCE(
  (SELECT jsonb_agg(day ORDER BY position) FROM ordered_days WHERE position IS NOT NULL), teaching_days
) WHERE id = (SELECT id FROM school);
--> statement-breakpoint
UPDATE routine_schedules r SET active_days = s.teaching_days
FROM (SELECT current_academic_year, teaching_days FROM settings ORDER BY created_at DESC LIMIT 1) s
WHERE r.academic_year = s.current_academic_year AND r.status IN ('draft', 'published');
