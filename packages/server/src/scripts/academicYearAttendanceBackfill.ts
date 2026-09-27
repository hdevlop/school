import postgres from 'postgres';

// Assign only rows supported by a registered year and event-time evidence.
// Dry-run is read-only. Apply requires an explicitly named target and run ID.
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

type Candidate = { id: string; type: 'student' | 'staff'; year_ids: string[] };

// The section's stored class year, the student's dated placement, and the
// teaching assignment must agree. A staff row uses its date and employment
// interval. DISTINCT collapses duplicate evidence within one registered year;
// overlapping registered years remain ambiguous and are never assigned.
const candidateSql = (lockRows: boolean) => `
  WITH picked AS (
    SELECT id, type, student_id, staff_id, teacher_id, section_id, teacher_assignment_id, date
    FROM attendance
    WHERE academic_year_id IS NULL AND id > $1
      AND created_at IS NOT NULL AND created_at <= $3::text::timestamp
      AND (updated_at IS NULL OR updated_at <= $3::text::timestamp)
    ORDER BY id LIMIT $2
    ${lockRows ? 'FOR UPDATE' : ''}
  ), matches AS (
    SELECT picked.id AS attendance_id, year.id AS academic_year_id
    FROM picked
    JOIN academic_years AS year
      ON picked.date >= year.reporting_starts_on
      AND picked.date <= year.reporting_ends_on
      AND year.status <> 'draft'
      AND year.provenance = 'verified'
    WHERE (
      picked.type = 'staff' AND picked.staff_id IS NOT NULL
      AND picked.student_id IS NULL AND picked.section_id IS NULL
      AND picked.teacher_assignment_id IS NULL
      AND (picked.teacher_id IS NULL OR EXISTS (
        SELECT 1 FROM teachers AS teacher
        WHERE teacher.id = picked.teacher_id AND teacher.staff_id = picked.staff_id
      ))
      AND EXISTS (
        SELECT 1 FROM staff AS member
        WHERE member.id = picked.staff_id
          AND member.hire_date <= picked.date
          AND (member.end_date IS NULL OR picked.date <= member.end_date)
      )
    ) OR (
      picked.type = 'student' AND picked.student_id IS NOT NULL
      AND picked.section_id IS NOT NULL AND picked.staff_id IS NULL
      AND (
        SELECT count(*) FROM student_enrollments AS dated_enrollment
        JOIN student_enrollment_placements AS dated_placement
          ON dated_placement.enrollment_id = dated_enrollment.id
        WHERE dated_enrollment.student_id = picked.student_id
          AND dated_enrollment.academic_year_id = year.id
          AND dated_enrollment.enrolled_on <= picked.date
          AND (dated_enrollment.left_on IS NULL OR picked.date < dated_enrollment.left_on)
          AND dated_placement.valid_from <= picked.date
          AND (dated_placement.valid_to IS NULL OR picked.date < dated_placement.valid_to)
      ) = 1
      AND EXISTS (
        SELECT 1 FROM student_enrollments AS enrollment
        JOIN student_enrollment_placements AS placement
          ON placement.enrollment_id = enrollment.id
        JOIN sections AS section ON section.id = placement.section_id
        JOIN classes AS school_class ON school_class.id = section.class_id
        WHERE enrollment.student_id = picked.student_id
          AND enrollment.academic_year_id = year.id
          AND enrollment.enrolled_on <= picked.date
          AND (enrollment.left_on IS NULL OR picked.date < enrollment.left_on)
          AND placement.section_id = picked.section_id
          AND placement.class_id = section.class_id
          AND placement.valid_from <= picked.date
          AND (placement.valid_to IS NULL OR picked.date < placement.valid_to)
          AND school_class.academic_year = year.label
          AND (picked.teacher_assignment_id IS NULL AND picked.teacher_id IS NULL OR EXISTS (
            SELECT 1 FROM teacher_assignments AS assignment
            WHERE assignment.id = picked.teacher_assignment_id
              AND assignment.section_id = section.id
              AND assignment.class_id = section.class_id
              AND (picked.teacher_id IS NULL OR assignment.teacher_id = picked.teacher_id)
          ))
      )
    )
  )
  SELECT picked.id, picked.type,
    coalesce(array_agg(DISTINCT matches.academic_year_id)
      FILTER (WHERE matches.academic_year_id IS NOT NULL), '{}'::text[]) AS year_ids
  FROM picked LEFT JOIN matches ON matches.attendance_id = picked.id
  GROUP BY picked.id, picked.type
  ORDER BY picked.id
`;

const connection = postgres(process.env.DB_URL, { prepare: false, max: 1, onnotice: () => {} });
const counts = {
  student: { examined: 0, eligible: 0, unresolved: 0, ambiguous: 0, updated: 0 },
  staff: { examined: 0, eligible: 0, unresolved: 0, ambiguous: 0, updated: 0 },
};
let issuesInserted = 0;
let cursor = afterId;
let batches = 0;

try {
  if (!apply) await connection.unsafe('SET default_transaction_read_only = on');
  const [schema] = await connection.unsafe(`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'attendance'
        AND column_name = 'academic_year_id'
    ) AS available
  `);
  if (!schema?.available) throw new Error('Apply academic-year migration 0055 on the designated target first');
  const [captured] = await connection.unsafe<{ cutoff_at: string }[]>(
    'SELECT clock_timestamp()::timestamp::text AS cutoff_at',
  );
  const cutoffAt = requestedCutoff ?? captured.cutoff_at;

  while (true) {
    const processBatch = async (query: Pick<typeof connection, 'unsafe'>) => {
      const rows = await query.unsafe<Candidate[]>(candidateSql(apply), [cursor, batchSize, cutoffAt]);
      if (!rows.length) return { rows, updatedIds: [] as string[], insertedIssues: 0 };
      const assignable = rows.filter((row) => row.year_ids.length === 1);
      if (!apply) return { rows, updatedIds: [] as string[], insertedIssues: 0 };
      const updated = assignable.length ? await query.unsafe<{ id: string }[]>(`
          UPDATE attendance AS record
          SET academic_year_id = proposed.year_id
          FROM unnest($1::text[], $2::text[]) AS proposed(id, year_id)
          WHERE record.id = proposed.id AND record.academic_year_id IS NULL
          RETURNING record.id
        `, [assignable.map((row) => row.id), assignable.map((row) => row.year_ids[0])]) : [];
      const needsReview = rows.filter((row) => row.year_ids.length !== 1);
      const inserted = needsReview.length ? await query.unsafe<{ id: string }[]>(`
          INSERT INTO academic_year_migration_issues (
            id, entity_type, entity_id, issue_code, academic_year_label,
            evidence_source, evidence, proposed_resolution, run_id
          )
          SELECT 'ayi_' || md5('attendance:' || record.id || ':' || proposed.issue_code),
            'attendance', record.id, proposed.issue_code, '',
            'academic_year_attendance_backfill',
            jsonb_build_object(
              'date', record.date::text, 'type', record.type::text,
              'studentId', record.student_id, 'staffId', record.staff_id,
              'sectionId', record.section_id,
              'teacherId', record.teacher_id,
              'teacherAssignmentId', record.teacher_assignment_id,
              'candidateYearIds', proposed.candidate_year_ids
            ),
            CASE WHEN proposed.issue_code = 'ambiguous_attendance_year'
              THEN 'Review the competing calendars and source records, then record a supported attendance year'
              ELSE 'Review the event date, identity, and dated placement or employment evidence before recording an attendance year'
            END,
            $3
          FROM unnest($1::text[], $2::text[], $4::text[])
            AS proposed(id, issue_code, candidate_year_ids)
          JOIN attendance AS record ON record.id = proposed.id
          WHERE record.academic_year_id IS NULL
          ON CONFLICT (entity_type, entity_id, issue_code, academic_year_label) DO NOTHING
          RETURNING id
        `, [
          needsReview.map((row) => row.id),
          needsReview.map((row) => row.year_ids.length ? 'ambiguous_attendance_year' : 'unattributed_attendance_year'),
          runId,
          needsReview.map((row) => row.year_ids.join(',')),
        ]) : [];
      return { rows, updatedIds: updated.map((row) => row.id), insertedIssues: inserted.length };
    };
    const result = apply
      ? await connection.begin(async (tx) => processBatch(tx))
      : await processBatch(connection);
    if (!result.rows.length) break;
    batches++;
    cursor = result.rows[result.rows.length - 1].id;
    issuesInserted += result.insertedIssues;
    const updatedIds = new Set(result.updatedIds);
    for (const row of result.rows) {
      const count = counts[row.type];
      count.examined++;
      if (row.year_ids.length === 0) count.unresolved++;
      else if (row.year_ids.length > 1) count.ambiguous++;
      else count.eligible++;
      if (updatedIds.has(row.id)) count.updated++;
    }
    if (apply) {
      process.stderr.write(JSON.stringify({
        target, runId, cutoffAtDbTime: cutoffAt,
        committedBatch: batches, lastExaminedId: cursor,
        updated: updatedIds.size, issuesInserted: result.insertedIssues,
      }) + '\n');
    }
  }

  const remainingNullYear = await connection.unsafe<{
    type: 'student' | 'staff'; records: number;
  }[]>(`
    SELECT type, count(*)::integer AS records
    FROM attendance WHERE academic_year_id IS NULL
    GROUP BY type ORDER BY type
  `);

  process.stdout.write(JSON.stringify({
    target, runId: apply ? runId : null, mode: apply ? 'apply' : 'dry-run',
    cutoffAtDbTime: cutoffAt, startAfterId: afterId || null,
    lastExaminedId: cursor || null, batches, counts, issuesInserted, remainingNullYear,
    reconciliationRequired: true,
    note: 'Review unresolved and ambiguous rows; compare a fresh audit and changes since cutoffAtDbTime before switching reads',
  }, null, 2) + '\n');
} finally {
  await connection.end();
}
