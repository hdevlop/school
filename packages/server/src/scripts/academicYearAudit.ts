import postgres from 'postgres';

// Read-only discovery. Requires an explicit target label to make saved output
// identifiable; the label is never interpolated into a database statement.
const target = process.argv.find((arg) => arg.startsWith('--target='))?.slice('--target='.length);
const url = process.env.DB_URL;
if (!target || !url) {
  throw new Error('Use --target=<environment-label> with DB_URL set');
}

const connection = postgres(url, { prepare: false, max: 1, onnotice: () => {} });
try {
  const result = await connection.begin(async (tx) => {
    await tx.unsafe('SET TRANSACTION READ ONLY');
    const labels = await tx.unsafe(`
      SELECT source, label, count(*)::integer AS rows
      FROM (
        SELECT 'settings' AS source, current_academic_year AS label FROM settings
        UNION ALL SELECT 'classes', academic_year FROM classes
        UNION ALL SELECT 'fees', academic_year FROM fees
        UNION ALL SELECT 'routines', academic_year FROM routine_schedules
      ) records GROUP BY source, label ORDER BY label, source
    `);
    const invalidLabels = await tx.unsafe(`
      SELECT source, label, count(*)::integer AS rows FROM (
        SELECT 'settings' AS source, current_academic_year AS label FROM settings
        UNION ALL SELECT 'classes', academic_year FROM classes
        UNION ALL SELECT 'fees', academic_year FROM fees
        UNION ALL SELECT 'routines', academic_year FROM routine_schedules
      ) records
      WHERE NOT CASE WHEN label ~ '^[0-9]{4}-[0-9]{4}$'
        THEN substring(label, 6, 4)::integer = substring(label, 1, 4)::integer + 1
        ELSE false END
      GROUP BY source, label ORDER BY source, label
    `);
    const relationshipIssues = await tx.unsafe(`
      SELECT
        (SELECT count(*)::integer FROM teacher_assignments ta
          JOIN sections se ON se.id = ta.section_id
          WHERE ta.class_id <> se.class_id) AS teacher_assignment_class_mismatch,
        (SELECT count(*)::integer FROM students st
          JOIN sections se ON se.id = st.section_id
          WHERE st.class_id <> se.class_id) AS student_section_class_mismatch,
        (SELECT count(*)::integer FROM students st
          JOIN classes c ON c.id = st.class_id
          CROSS JOIN (SELECT current_academic_year FROM settings ORDER BY created_at DESC LIMIT 1) cfg
          WHERE c.academic_year <> cfg.current_academic_year) AS student_class_not_active_year,
        (SELECT count(*)::integer FROM attendance a
          WHERE a.type = 'student' AND (a.section_id IS NULL OR a.student_id IS NULL)) AS student_attendance_missing_context,
        (SELECT count(*)::integer FROM grades g
          WHERE (g.assessment_id IS NULL AND g.exam_id IS NULL)
             OR (g.assessment_id IS NOT NULL AND g.exam_id IS NOT NULL)) AS grades_with_ambiguous_source
    `);
    const routineContext = await tx.unsafe(`
      SELECT
        (SELECT count(*)::integer FROM routine_schedules r
          JOIN sections s ON s.id = r.section_id
          JOIN classes c ON c.id = s.class_id
          WHERE r.academic_year <> c.academic_year) AS schedule_class_year_mismatch,
        (SELECT count(*)::integer FROM routine_entries e
          JOIN routine_schedules r ON r.id = e.schedule_id
          JOIN teacher_assignments a ON a.id = e.teacher_assignment_id
          JOIN sections s ON s.id = r.section_id
          WHERE a.section_id <> r.section_id OR a.class_id <> s.class_id) AS entry_assignment_mismatch,
        (SELECT count(*)::integer FROM routine_schedules r
          WHERE NOT EXISTS (SELECT 1 FROM routine_periods p WHERE p.schedule_id = r.id)) AS schedules_without_own_periods
    `);
    const attendanceYearColumn = await tx.unsafe(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'attendance'
          AND column_name = 'academic_year_id'
      ) AS available
    `);
    const attendanceAttribution = attendanceYearColumn[0].available
      ? await tx.unsafe(`
          SELECT a.type, count(*)::integer AS records,
            count(*) FILTER (WHERE a.academic_year_id IS NULL)::integer AS unassigned_year,
            count(*) FILTER (WHERE a.academic_year_id IS NOT NULL
              AND (a.date < y.reporting_starts_on OR a.date > y.reporting_ends_on))::integer AS date_outside_stored_year
          FROM attendance a LEFT JOIN academic_years y ON y.id = a.academic_year_id
          GROUP BY a.type ORDER BY a.type
        `)
      : null;
    const [migrationIssueTable] = await tx.unsafe(`
      SELECT to_regclass('public.academic_year_migration_issues') IS NOT NULL AS available
    `);
    const migrationIssues = migrationIssueTable.available
      ? await tx.unsafe(`
          SELECT entity_type, issue_code, review_status, count(*)::integer AS records
          FROM academic_year_migration_issues
          GROUP BY entity_type, issue_code, review_status
          ORDER BY entity_type, issue_code, review_status
        `)
      : null;
    const [academicYearColumns] = await tx.unsafe(`
      SELECT count(*)::integer AS present
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name IN ('assessments', 'exams', 'grades')
        AND column_name = 'academic_year_id'
    `);
    const academicAttribution = academicYearColumns.present === 3
      ? await tx.unsafe(`
          SELECT 'assessment' AS entity_type, count(*)::integer AS records,
            count(*) FILTER (WHERE source.academic_year_id IS NULL)::integer AS unassigned_year,
            count(*) FILTER (WHERE source.academic_year_id IS NOT NULL
              AND (source.date < year.reporting_starts_on OR source.date > year.reporting_ends_on))::integer AS date_outside_stored_year
          FROM assessments AS source LEFT JOIN academic_years AS year ON year.id = source.academic_year_id
          UNION ALL
          SELECT 'exam', count(*)::integer,
            count(*) FILTER (WHERE source.academic_year_id IS NULL)::integer,
            count(*) FILTER (WHERE source.academic_year_id IS NOT NULL
              AND (source.date < year.reporting_starts_on OR source.date > year.reporting_ends_on))::integer
          FROM exams AS source LEFT JOIN academic_years AS year ON year.id = source.academic_year_id
          UNION ALL
          SELECT 'grade', count(*)::integer,
            count(*) FILTER (WHERE grade.academic_year_id IS NULL)::integer,
            count(*) FILTER (WHERE grade.academic_year_id IS NOT NULL AND (
              (grade.assessment_id IS NULL) = (grade.exam_id IS NULL)
              OR coalesce(assessment.academic_year_id, exam.academic_year_id)
                IS DISTINCT FROM grade.academic_year_id
            ))::integer
          FROM grades AS grade
          LEFT JOIN assessments AS assessment ON assessment.id = grade.assessment_id
          LEFT JOIN exams AS exam ON exam.id = grade.exam_id
        `)
      : null;
    const feeTotals = await tx.unsafe(`
      SELECT academic_year, status, count(*)::integer AS fees,
        coalesce(sum(net_amount), 0)::text AS net_amount,
        coalesce(sum(paid_amount), 0)::text AS paid_amount
      FROM fees GROUP BY academic_year, status ORDER BY academic_year, status
    `);
    const allocationTotals = await tx.unsafe(`
      SELECT f.academic_year, count(*)::integer AS allocations,
        coalesce(sum(pa.amount), 0)::text AS allocated_amount
      FROM payment_allocations pa JOIN fees f ON f.id = pa.fee_id
      GROUP BY f.academic_year ORDER BY f.academic_year
    `);
    const installmentTotals = await tx.unsafe(`
      SELECT f.academic_year, installment.status,
        count(*)::integer AS installments,
        coalesce(sum(installment.amount), 0)::text AS scheduled_amount,
        coalesce(sum(installment.paid_amount), 0)::text AS paid_amount
      FROM fee_installments AS installment
      JOIN fees AS f ON f.id = installment.fee_id
      GROUP BY f.academic_year, installment.status
      ORDER BY f.academic_year, installment.status
    `);
    const paymentTotals = await tx.unsafe(`
      WITH allocated AS (
        SELECT payment_id, sum(amount) AS amount
        FROM payment_allocations GROUP BY payment_id
      )
      SELECT payment.status, count(*)::integer AS payments,
        coalesce(sum(payment.amount), 0)::text AS received_amount,
        coalesce(sum(coalesce(allocated.amount, 0)), 0)::text AS allocated_amount,
        coalesce(sum(payment.amount - coalesce(allocated.amount, 0)), 0)::text AS unallocated_amount,
        count(*) FILTER (WHERE coalesce(allocated.amount, 0) > payment.amount)::integer AS overallocated_payments
      FROM payments AS payment
      LEFT JOIN allocated ON allocated.payment_id = payment.id
      GROUP BY payment.status ORDER BY payment.status
    `);
    const [financialMismatches] = await tx.unsafe(`
      SELECT
        (SELECT count(*)::integer FROM payment_allocations AS allocation
          JOIN fee_installments AS installment ON installment.id = allocation.installment_id
          WHERE installment.fee_id IS DISTINCT FROM allocation.fee_id) AS allocation_installment_fee_mismatch,
        (SELECT count(*)::integer FROM fees AS fee
          LEFT JOIN (
            SELECT fee_id, sum(paid_amount) AS paid_amount
            FROM fee_installments GROUP BY fee_id
          ) AS installments ON installments.fee_id = fee.id
          WHERE coalesce(fee.paid_amount, 0) <> coalesce(installments.paid_amount, 0)) AS fee_paid_installment_mismatch
    `);
    const mixedYearPayments = await tx.unsafe(`
      SELECT count(*)::integer AS receipts FROM (
        SELECT pa.payment_id FROM payment_allocations pa
        JOIN fees f ON f.id = pa.fee_id
        GROUP BY pa.payment_id HAVING count(DISTINCT f.academic_year) > 1
      ) receipts
    `);
    return {
      labels, invalidLabels, relationshipIssues: relationshipIssues[0],
      routineContext: routineContext[0], attendanceAttribution, academicAttribution,
      migrationIssues,
      feeTotals, installmentTotals, allocationTotals, paymentTotals,
      financialMismatches, mixedYearPayments: mixedYearPayments[0],
    };
  });
  process.stdout.write(JSON.stringify({ target, capturedAt: new Date().toISOString(), ...result }, null, 2) + '\n');
} finally {
  await connection.end();
}
