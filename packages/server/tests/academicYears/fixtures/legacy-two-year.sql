-- Disposable PostgreSQL fixture for the schema at migration 0048.
-- Apply only to a fresh isolated database before migrations 0049-0057.
-- IDs and credentials are synthetic. Do not run against an app database.

INSERT INTO settings (id, school_name, current_academic_year)
VALUES ('fixture_settings', 'History Rehearsal School', '2026-2027');

INSERT INTO classes (id, name, academic_year)
VALUES
  ('fixture_class_old', 'Year 5', '2025-2026'),
  ('fixture_class_active', 'Year 6', '2026-2027');

INSERT INTO sections (id, class_id, name)
VALUES
  ('fixture_section_old', 'fixture_class_old', 'A'),
  ('fixture_section_active', 'fixture_class_active', 'A');

INSERT INTO users (id, email, password, status, name)
VALUES ('fixture_student_user', 'student@history-fixture.invalid', 'fixture-only-no-login', 'active', 'Fixture Student');

-- The legacy student row knows only the current class. It cannot prove the
-- date or duration of the previous year's enrollment.
INSERT INTO students (
  id, user_id, class_id, section_id, student_code, name, enrollment_date, status
) VALUES (
  'fixture_student', 'fixture_student_user', 'fixture_class_active',
  'fixture_section_active', 'FIXTURE-001', 'Fixture Student', '2025-09-01', 'active'
);

INSERT INTO staff (id, employee_code, name, role, hire_date)
VALUES
  ('fixture_staff_old', 'FIXTURE-STAFF-OLD', 'Old-year Teacher', 'teacher', '2025-09-01'),
  ('fixture_staff_active', 'FIXTURE-STAFF-ACTIVE', 'Active-year Teacher', 'teacher', '2026-09-01');

INSERT INTO teachers (id, staff_id)
VALUES
  ('fixture_teacher_old', 'fixture_staff_old'),
  ('fixture_teacher_active', 'fixture_staff_active');

INSERT INTO subjects (id, code, name)
VALUES ('fixture_subject', 'FIXTURE-MATH', 'Fixture Mathematics');

INSERT INTO teacher_assignments (id, class_id, subject_id, teacher_id, section_id)
VALUES
  ('fixture_assignment_old', 'fixture_class_old', 'fixture_subject', 'fixture_teacher_old', 'fixture_section_old'),
  ('fixture_assignment_active', 'fixture_class_active', 'fixture_subject', 'fixture_teacher_active', 'fixture_section_active');

INSERT INTO assessments (
  id, teacher_assignment_id, title, date, total_marks, passing_marks, section_ids
) VALUES
  ('fixture_assessment_old', 'fixture_assignment_old', 'Old-year quiz', '2026-05-10', 20, 10, '["fixture_section_old"]'),
  ('fixture_assessment_active', 'fixture_assignment_active', 'Active-year quiz', '2026-10-05', 20, 10, '["fixture_section_active"]');

INSERT INTO grades (id, student_id, assessment_id, marks_obtained)
VALUES
  ('fixture_grade_old', 'fixture_student', 'fixture_assessment_old', 15),
  ('fixture_grade_active', 'fixture_student', 'fixture_assessment_active', 17);

INSERT INTO fee_types (id, name, category, amount, payment_type)
VALUES ('fixture_fee_type', 'Fixture tuition', 'tuition', 100, 'oneTime');

INSERT INTO fees (
  id, student_id, fee_type_id, academic_year, base_amount, gross_amount,
  net_amount, paid_amount, status, effective_date
) VALUES
  ('fixture_fee_old', 'fixture_student', 'fixture_fee_type', '2025-2026', 100, 100, 100, 75, 'partiallyPaid', '2025-09-10'),
  ('fixture_fee_active', 'fixture_student', 'fixture_fee_type', '2026-2027', 100, 100, 100, 75, 'partiallyPaid', '2026-09-10');

INSERT INTO fee_installments (
  id, fee_id, number, due_date, amount, paid_amount, status
) VALUES
  ('fixture_installment_old', 'fixture_fee_old', 1, '2025-10-01', 100, 75, 'partiallyPaid'),
  ('fixture_installment_active', 'fixture_fee_active', 1, '2026-10-01', 100, 75, 'partiallyPaid');

-- One receipt contains an allocation to each fee year. Its receipt date is
-- in the active year, even though half the cash settles older debt.
INSERT INTO payments (
  id, student_id, amount, payment_date, payment_method, status, receipt_number
) VALUES (
  'fixture_payment_mixed', 'fixture_student', 150, '2026-09-26', 'cash', 'completed', 'FIXTURE-RECEIPT-001'
);

INSERT INTO payment_allocations (
  id, payment_id, fee_id, installment_id, amount
) VALUES
  ('fixture_allocation_old', 'fixture_payment_mixed', 'fixture_fee_old', 'fixture_installment_old', 75),
  ('fixture_allocation_active', 'fixture_payment_mixed', 'fixture_fee_active', 'fixture_installment_active', 75);

INSERT INTO attendance (id, student_id, section_id, date, status, type)
VALUES
  ('fixture_attendance_old', 'fixture_student', 'fixture_section_old', '2026-05-10', 'present', 'student'),
  ('fixture_attendance_active', 'fixture_student', 'fixture_section_active', '2026-09-10', 'present', 'student');
