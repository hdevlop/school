-- Disposable follow-up after migrations 0049-0057. These are deliberately
-- reviewed synthetic fixture dates; the old year remains unattributed.
UPDATE academic_years
SET provenance = 'verified',
    provenance_note = 'Synthetic fixture calendar reviewed for rehearsal'
WHERE label IN ('2025-2026', '2026-2027');

INSERT INTO student_enrollments (
  id, student_id, academic_year_id, status, enrolled_on
)
SELECT 'fixture_enrollment_active', 'fixture_student', id, 'active', '2026-09-01'
FROM academic_years WHERE label = '2026-2027';

INSERT INTO student_enrollment_placements (
  id, enrollment_id, class_id, section_id, valid_from
) VALUES (
  'fixture_placement_active', 'fixture_enrollment_active',
  'fixture_class_active', 'fixture_section_active', '2026-09-01'
);
