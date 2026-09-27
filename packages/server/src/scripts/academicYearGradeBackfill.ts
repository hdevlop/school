import postgres from 'postgres';

// Legacy grade attribution requires a registered source and exactly one
// event-time student placement. It never infers a year from created_at.
const option = (name: string) => process.argv.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
const target = option('target');
const runId = option('run-id');
const apply = process.argv.includes('--apply');
const batchSize = Number(option('batch-size') ?? 500);
const afterId = option('after-id') ?? '';
const requestedCutoff = option('cutoff-at');
if (!target || !process.env.DB_URL || (apply && !runId) ||
  !Number.isInteger(batchSize) || batchSize < 1 || batchSize > 2000 ||
  (afterId && !requestedCutoff) ||
  (requestedCutoff !== undefined && !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d{1,6})?$/.test(requestedCutoff))) {
  throw new Error('Use --target=<environment-label> [--batch-size=1..2000] [--after-id=<checkpoint> --cutoff-at="YYYY-MM-DD HH:MM:SS.ffffff"] [--apply --run-id=<unique-id>] with DB_URL set');
}

type Candidate = { id: string; year_ids: string[] };
const candidateSql = (lockRows: boolean) => `
  WITH picked AS (
    SELECT id, student_id, assessment_id, exam_id
    FROM grades
    WHERE academic_year_id IS NULL AND id > $1
      AND created_at IS NOT NULL AND created_at <= $3::text::timestamp
      AND (updated_at IS NULL OR updated_at <= $3::text::timestamp)
    ORDER BY id LIMIT $2
    ${lockRows ? 'FOR UPDATE' : ''}
  ), source_records AS (
    SELECT picked.id AS grade_id, picked.student_id,
      source.academic_year_id, source.date, source.teacher_assignment_id, source.section_ids
    FROM picked JOIN assessments AS source ON source.id = picked.assessment_id
    WHERE picked.exam_id IS NULL
    UNION ALL
    SELECT picked.id, picked.student_id,
      source.academic_year_id, source.date, source.teacher_assignment_id, source.section_ids
    FROM picked JOIN exams AS source ON source.id = picked.exam_id
    WHERE picked.assessment_id IS NULL
  ), matches AS (
    SELECT source.grade_id, year.id AS academic_year_id
    FROM source_records AS source
    JOIN academic_years AS year ON year.id = source.academic_year_id
      AND year.status <> 'draft' AND year.provenance = 'verified'
      AND source.date >= year.reporting_starts_on
      AND source.date <= year.reporting_ends_on
    JOIN teacher_assignments AS assignment ON assignment.id = source.teacher_assignment_id
    JOIN sections AS primary_section ON primary_section.id = assignment.section_id
    JOIN classes AS school_class ON school_class.id = primary_section.class_id
      AND school_class.id = assignment.class_id
      AND school_class.academic_year = year.label
    WHERE source.student_id IS NOT NULL
      AND (source.section_ids IS NULL OR (
        jsonb_typeof(source.section_ids) = 'array'
        AND jsonb_array_length(CASE WHEN jsonb_typeof(source.section_ids) = 'array'
          THEN source.section_ids ELSE '[]'::jsonb END) > 0
        AND source.section_ids ? primary_section.id
        AND NOT EXISTS (
          SELECT 1 FROM jsonb_array_elements_text(CASE WHEN jsonb_typeof(source.section_ids) = 'array'
            THEN source.section_ids ELSE '[]'::jsonb END) AS targeted(section_id)
          LEFT JOIN sections AS target_section ON target_section.id = targeted.section_id
          LEFT JOIN classes AS target_class ON target_class.id = target_section.class_id
          WHERE target_section.id IS NULL OR target_class.academic_year IS DISTINCT FROM year.label
        )
      ))
      AND (
        SELECT count(*) FROM student_enrollments AS enrollment
        JOIN student_enrollment_placements AS placement ON placement.enrollment_id = enrollment.id
        WHERE enrollment.student_id = source.student_id
          AND enrollment.academic_year_id = year.id
          AND enrollment.enrolled_on <= source.date
          AND (enrollment.left_on IS NULL OR source.date < enrollment.left_on)
          AND placement.valid_from <= source.date
          AND (placement.valid_to IS NULL OR source.date < placement.valid_to)
      ) = 1
      AND EXISTS (
        SELECT 1 FROM student_enrollments AS enrollment
        JOIN student_enrollment_placements AS placement ON placement.enrollment_id = enrollment.id
        WHERE enrollment.student_id = source.student_id
          AND enrollment.academic_year_id = year.id
          AND enrollment.enrolled_on <= source.date
          AND (enrollment.left_on IS NULL OR source.date < enrollment.left_on)
          AND placement.valid_from <= source.date
          AND (placement.valid_to IS NULL OR source.date < placement.valid_to)
          AND ((source.section_ids IS NULL AND placement.section_id = primary_section.id)
            OR (source.section_ids IS NOT NULL AND source.section_ids ? placement.section_id))
      )
  )
  SELECT picked.id,
    coalesce(array_agg(DISTINCT matches.academic_year_id)
      FILTER (WHERE matches.academic_year_id IS NOT NULL), '{}'::text[]) AS year_ids
  FROM picked LEFT JOIN matches ON matches.grade_id = picked.id
  GROUP BY picked.id ORDER BY picked.id
`;

const connection = postgres(process.env.DB_URL, { prepare: false, max: 1, onnotice: () => {} });
let cursor = afterId;
let batches = 0;
let examined = 0;
let eligible = 0;
let unresolved = 0;
let updated = 0;
let issuesInserted = 0;

try {
  if (!apply) await connection.unsafe('SET default_transaction_read_only = on');
  const [schema] = await connection.unsafe(`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'grades' AND column_name = 'academic_year_id'
    ) AS year_column,
    to_regclass('public.academic_year_migration_issues') IS NOT NULL AS issue_table,
    EXISTS (
      SELECT 1 FROM pg_trigger WHERE tgrelid = to_regclass('public.grades')
        AND tgname = 'grades_year_context_guard' AND NOT tgisinternal
    ) AS grade_guard,
    EXISTS (
      SELECT 1 FROM pg_trigger WHERE tgrelid = to_regclass('public.teacher_assignments')
        AND tgname = 'retain_academic_assignment_context' AND NOT tgisinternal
    ) AS assignment_guard
  `);
  if (!schema?.year_column || !schema.issue_table) {
    throw new Error('Apply the additive academic-year migrations through 0052 on the designated target first');
  }
  if (apply && (!schema.grade_guard || !schema.assignment_guard)) {
    throw new Error('Apply academic-year context and retention migrations 0053-0054 before attribution');
  }
  const [captured] = await connection.unsafe<{ cutoff_at: string }[]>(
    'SELECT clock_timestamp()::timestamp::text AS cutoff_at',
  );
  const cutoffAt = requestedCutoff ?? captured.cutoff_at;

  while (true) {
    const processBatch = async (query: Pick<typeof connection, 'unsafe'>) => {
      const rows = await query.unsafe<Candidate[]>(candidateSql(apply), [cursor, batchSize, cutoffAt]);
      if (!rows.length) return { rows, updatedIds: [] as string[], insertedIssues: 0 };
      if (!apply) return { rows, updatedIds: [] as string[], insertedIssues: 0 };
      const assignable = rows.filter((row) => row.year_ids.length === 1);
      const assigned = assignable.length ? await query.unsafe<{ id: string }[]>(`
        UPDATE grades AS grade
        SET academic_year_id = proposed.year_id
        FROM unnest($1::text[], $2::text[]) AS proposed(id, year_id)
        WHERE grade.id = proposed.id AND grade.academic_year_id IS NULL
        RETURNING grade.id
      `, [assignable.map((row) => row.id), assignable.map((row) => row.year_ids[0])]) : [];
      const needsReview = rows.filter((row) => row.year_ids.length !== 1);
      const inserted = needsReview.length ? await query.unsafe<{ id: string }[]>(`
        INSERT INTO academic_year_migration_issues (
          id, entity_type, entity_id, issue_code, academic_year_label,
          evidence_source, evidence, proposed_resolution, run_id
        )
        SELECT 'ayi_' || md5('grade:' || grade.id || ':unattributed_grade_year'),
          'grade', grade.id, 'unattributed_grade_year', '',
          'academic_year_grade_backfill',
          jsonb_build_object(
            'studentId', grade.student_id,
            'assessmentId', grade.assessment_id,
            'examId', grade.exam_id
          ),
          'Review the grade source and a single dated student placement in its target sections before recording a year',
          $2
        FROM unnest($1::text[]) AS proposed(id)
        JOIN grades AS grade ON grade.id = proposed.id
        WHERE grade.academic_year_id IS NULL
        ON CONFLICT (entity_type, entity_id, issue_code, academic_year_label) DO NOTHING
        RETURNING id
      `, [needsReview.map((row) => row.id), runId]) : [];
      return { rows, updatedIds: assigned.map((row) => row.id), insertedIssues: inserted.length };
    };
    const result = apply
      ? await connection.begin(async (tx) => processBatch(tx))
      : await processBatch(connection);
    if (!result.rows.length) break;
    batches++;
    cursor = result.rows[result.rows.length - 1].id;
    examined += result.rows.length;
    issuesInserted += result.insertedIssues;
    updated += result.updatedIds.length;
    for (const row of result.rows) {
      if (row.year_ids.length === 1) eligible++;
      else unresolved++;
    }
    if (apply) process.stderr.write(JSON.stringify({
      target, runId, cutoffAtDbTime: cutoffAt,
      committedBatch: batches, lastExaminedId: cursor,
      updated: result.updatedIds.length, issuesInserted: result.insertedIssues,
    }) + '\n');
  }

  const [remaining] = await connection.unsafe<{ records: number }[]>(`
    SELECT count(*)::integer AS records FROM grades WHERE academic_year_id IS NULL
  `);
  process.stdout.write(JSON.stringify({
    target, runId: apply ? runId : null, mode: apply ? 'apply' : 'dry-run',
    cutoffAtDbTime: cutoffAt, startAfterId: afterId || null,
    lastExaminedId: cursor || null, batches,
    examined, eligible, unresolved, updated, issuesInserted,
    remainingNullYear: remaining.records, reconciliationRequired: true,
    note: 'Review unresolved grades and compare a fresh audit and changes since cutoff before switching reads',
  }, null, 2) + '\n');
} finally {
  await connection.end();
}
