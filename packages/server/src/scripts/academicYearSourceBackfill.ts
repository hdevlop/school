import postgres from 'postgres';

// Attribute legacy assessments or exams only when their saved date, assignment,
// class year, and every targeted section agree with one verified calendar.
const option = (name: string) => process.argv.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
const target = option('target');
const kind = option('kind');
const runId = option('run-id');
const apply = process.argv.includes('--apply');
const batchSize = Number(option('batch-size') ?? 500);
const afterId = option('after-id') ?? '';
const requestedCutoff = option('cutoff-at');
if (!target || !process.env.DB_URL || (kind !== 'assessment' && kind !== 'exam') ||
  (apply && !runId) || !Number.isInteger(batchSize) || batchSize < 1 || batchSize > 2000 ||
  (afterId && !requestedCutoff) ||
  (requestedCutoff !== undefined && !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d{1,6})?$/.test(requestedCutoff))) {
  throw new Error('Use --target=<environment-label> --kind=assessment|exam [--batch-size=1..2000] [--after-id=<checkpoint> --cutoff-at="YYYY-MM-DD HH:MM:SS.ffffff"] [--apply --run-id=<unique-id>] with DB_URL set');
}

const table = kind === 'assessment' ? 'assessments' : 'exams';
const guard = kind === 'assessment' ? 'assessments_year_context_guard' : 'exams_year_context_guard';
type Candidate = { id: string; year_ids: string[] };

const candidateSql = (lockRows: boolean) => `
  WITH picked AS (
    SELECT id, date, teacher_assignment_id, section_ids
    FROM ${table}
    WHERE academic_year_id IS NULL AND id > $1
      AND created_at IS NOT NULL AND created_at <= $3::text::timestamp
      AND (updated_at IS NULL OR updated_at <= $3::text::timestamp)
    ORDER BY id LIMIT $2
    ${lockRows ? 'FOR UPDATE' : ''}
  ), matches AS (
    SELECT picked.id AS source_id, year.id AS academic_year_id
    FROM picked
    JOIN teacher_assignments AS assignment ON assignment.id = picked.teacher_assignment_id
    JOIN sections AS primary_section ON primary_section.id = assignment.section_id
    JOIN classes AS school_class ON school_class.id = primary_section.class_id
      AND school_class.id = assignment.class_id
    JOIN academic_years AS year ON year.label = school_class.academic_year
      AND year.status <> 'draft' AND year.provenance = 'verified'
      AND picked.date >= year.reporting_starts_on
      AND picked.date <= year.reporting_ends_on
    WHERE (picked.section_ids IS NULL OR (
      jsonb_typeof(picked.section_ids) = 'array'
      AND jsonb_array_length(CASE WHEN jsonb_typeof(picked.section_ids) = 'array'
        THEN picked.section_ids ELSE '[]'::jsonb END) > 0
      AND picked.section_ids ? primary_section.id
      AND NOT EXISTS (
        SELECT 1
        FROM jsonb_array_elements_text(CASE WHEN jsonb_typeof(picked.section_ids) = 'array'
          THEN picked.section_ids ELSE '[]'::jsonb END) AS targeted(section_id)
        LEFT JOIN sections AS target_section ON target_section.id = targeted.section_id
        LEFT JOIN classes AS target_class ON target_class.id = target_section.class_id
        WHERE target_section.id IS NULL OR target_class.academic_year IS DISTINCT FROM year.label
      )
    ))
    AND NOT EXISTS (
      SELECT 1 FROM grades AS grade
      WHERE grade.${kind === 'assessment' ? 'assessment_id' : 'exam_id'} = picked.id
        AND grade.academic_year_id IS NOT NULL
        AND grade.academic_year_id IS DISTINCT FROM year.id
    )
  )
  SELECT picked.id,
    coalesce(array_agg(DISTINCT matches.academic_year_id)
      FILTER (WHERE matches.academic_year_id IS NOT NULL), '{}'::text[]) AS year_ids
  FROM picked LEFT JOIN matches ON matches.source_id = picked.id
  GROUP BY picked.id ORDER BY picked.id
`;

const connection = postgres(process.env.DB_URL, { prepare: false, max: 1, onnotice: () => {} });
let cursor = afterId;
let batches = 0;
let examined = 0;
let eligible = 0;
let unresolved = 0;
let ambiguous = 0;
let updated = 0;
let issuesInserted = 0;

try {
  if (!apply) await connection.unsafe('SET default_transaction_read_only = on');
  const [schema] = await connection.unsafe(`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1 AND column_name = 'academic_year_id'
    ) AS year_column,
    to_regclass('public.academic_year_migration_issues') IS NOT NULL AS issue_table,
    EXISTS (
      SELECT 1 FROM pg_trigger WHERE tgrelid = to_regclass($2) AND tgname = $3 AND NOT tgisinternal
    ) AS source_guard,
    EXISTS (
      SELECT 1 FROM pg_trigger WHERE tgrelid = to_regclass('public.teacher_assignments')
        AND tgname = 'retain_academic_assignment_context' AND NOT tgisinternal
    ) AS assignment_guard
  `, [table, `public.${table}`, guard]);
  if (!schema?.year_column || !schema.issue_table) {
    throw new Error('Apply the additive academic-year migrations through 0052 on the designated target first');
  }
  if (apply && (!schema.source_guard || !schema.assignment_guard)) {
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
        UPDATE ${table} AS source
        SET academic_year_id = proposed.year_id
        FROM unnest($1::text[], $2::text[]) AS proposed(id, year_id)
        WHERE source.id = proposed.id AND source.academic_year_id IS NULL
        RETURNING source.id
      `, [assignable.map((row) => row.id), assignable.map((row) => row.year_ids[0])]) : [];
      const needsReview = rows.filter((row) => row.year_ids.length !== 1);
      const inserted = needsReview.length ? await query.unsafe<{ id: string }[]>(`
        INSERT INTO academic_year_migration_issues (
          id, entity_type, entity_id, issue_code, academic_year_label,
          evidence_source, evidence, proposed_resolution, run_id
        )
        SELECT 'ayi_' || md5($3 || ':' || source.id || ':' || proposed.issue_code),
          $3, source.id, proposed.issue_code, '',
          'academic_year_source_backfill',
          jsonb_build_object(
            'date', source.date::text,
            'teacherAssignmentId', source.teacher_assignment_id,
            'sectionIds', source.section_ids::text,
            'candidateYearIds', proposed.candidate_year_ids
          ),
          'Review the source date, teaching assignment, target sections, calendar, and linked grades before recording a year',
          $4
        FROM unnest($1::text[], $2::text[], $5::text[])
          AS proposed(id, issue_code, candidate_year_ids)
        JOIN ${table} AS source ON source.id = proposed.id
        WHERE source.academic_year_id IS NULL
        ON CONFLICT (entity_type, entity_id, issue_code, academic_year_label) DO NOTHING
        RETURNING id
      `, [
        needsReview.map((row) => row.id),
        needsReview.map((row) => row.year_ids.length ? 'ambiguous_academic_source_year' : 'unattributed_academic_source_year'),
        kind, runId, needsReview.map((row) => row.year_ids.join(',')),
      ]) : [];
      return { rows, updatedIds: assigned.map((row) => row.id), insertedIssues: inserted.length };
    };
    const result = apply
      ? await connection.begin(async (tx) => processBatch(tx))
      : await processBatch(connection);
    if (!result.rows.length) break;
    batches++;
    cursor = result.rows[result.rows.length - 1].id;
    issuesInserted += result.insertedIssues;
    examined += result.rows.length;
    const updatedIds = new Set(result.updatedIds);
    updated += updatedIds.size;
    for (const row of result.rows) {
      if (row.year_ids.length === 0) unresolved++;
      else if (row.year_ids.length > 1) ambiguous++;
      else eligible++;
    }
    if (apply) process.stderr.write(JSON.stringify({
      target, kind, runId, cutoffAtDbTime: cutoffAt,
      committedBatch: batches, lastExaminedId: cursor,
      updated: updatedIds.size, issuesInserted: result.insertedIssues,
    }) + '\n');
  }

  const [remaining] = await connection.unsafe<{ records: number }[]>(`
    SELECT count(*)::integer AS records FROM ${table} WHERE academic_year_id IS NULL
  `);
  process.stdout.write(JSON.stringify({
    target, kind, runId: apply ? runId : null, mode: apply ? 'apply' : 'dry-run',
    cutoffAtDbTime: cutoffAt, startAfterId: afterId || null,
    lastExaminedId: cursor || null, batches,
    examined, eligible, unresolved, ambiguous, updated, issuesInserted,
    remainingNullYear: remaining.records, reconciliationRequired: true,
    note: 'Review unresolved sources and compare a fresh audit and changes since cutoff before switching reads',
  }, null, 2) + '\n');
} finally {
  await connection.end();
}
