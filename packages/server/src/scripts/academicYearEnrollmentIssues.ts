import postgres from 'postgres';

// This script records uncertainty. It never creates an enrollment or changes
// legacy students. Run dry by default and require a named target and run ID
// before inserting review rows on an explicitly approved database.
const option = (name: string) => process.argv.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
const target = option('target');
const runId = option('run-id');
const apply = process.argv.includes('--apply');
const batchSize = Number(option('batch-size') ?? 500);
if (!target || !process.env.DB_URL || (apply && !runId) ||
  !Number.isInteger(batchSize) || batchSize < 1 || batchSize > 2000) {
  throw new Error('Use --target=<environment-label> [--batch-size=1..2000] [--apply --run-id=<unique-id>] with DB_URL set');
}

const connection = postgres(process.env.DB_URL, { prepare: false, max: 1, onnotice: () => {} });
let cursor = '';
let examined = 0;
let inserted = 0;
let sectionMismatches = 0;
const byYear = new Map<string, number>();

try {
  if (!apply) await connection.unsafe('SET default_transaction_read_only = on');
  const [table] = await connection.unsafe(`SELECT to_regclass('public.academic_year_migration_issues')::text AS name`);
  if (!table?.name) throw new Error('Apply the additive academic-year migrations on the designated target first');

  while (true) {
    const rows = await connection.unsafe<{
      id: string; academic_year_label: string | null; section_matches_class: boolean;
    }[]>(`
      SELECT st.id, c.academic_year AS academic_year_label,
        (se.id IS NOT NULL AND se.class_id = st.class_id) AS section_matches_class
      FROM students st
      LEFT JOIN classes c ON c.id = st.class_id
      LEFT JOIN sections se ON se.id = st.section_id
      LEFT JOIN academic_years y ON y.label = c.academic_year
      LEFT JOIN student_enrollments e ON e.student_id = st.id AND e.academic_year_id = y.id
      LEFT JOIN student_enrollment_placements ep ON ep.enrollment_id = e.id
        AND ep.class_id = st.class_id AND ep.section_id = st.section_id
      WHERE st.id > $1 AND ep.id IS NULL
      ORDER BY st.id LIMIT $2
    `, [cursor, batchSize]);
    if (!rows.length) break;
    cursor = rows[rows.length - 1].id;
    examined += rows.length;
    for (const row of rows) {
      const label = row.academic_year_label ?? '(unknown)';
      byYear.set(label, (byYear.get(label) ?? 0) + 1);
      if (!row.section_matches_class) sectionMismatches++;
    }
    if (!apply) continue;

    const ids = rows.map((row) => row.id);
    const result = await connection.begin(async (tx) => tx.unsafe(`
      INSERT INTO academic_year_migration_issues (
        id, entity_type, entity_id, issue_code, academic_year_label,
        evidence_source, evidence, proposed_resolution, run_id
      )
      SELECT 'ayi_' || md5('student:' || st.id || ':' || coalesce(c.academic_year, '')),
        'student', st.id, 'unknown_enrollment_date', coalesce(c.academic_year, ''),
        'legacy_students_current_placement',
        jsonb_build_object(
          'classId', st.class_id, 'sectionId', st.section_id,
          'admissionDate', st.enrollment_date::text,
          'sectionMatchesClass', CASE WHEN se.id IS NOT NULL AND se.class_id = st.class_id THEN 'true' ELSE 'false' END
        ),
        'Confirm this school-year entry date and section from source records before creating a dated enrollment',
        $2
      FROM students st
      LEFT JOIN classes c ON c.id = st.class_id
      LEFT JOIN sections se ON se.id = st.section_id
      LEFT JOIN academic_years y ON y.label = c.academic_year
      LEFT JOIN student_enrollments e ON e.student_id = st.id AND e.academic_year_id = y.id
      LEFT JOIN student_enrollment_placements ep ON ep.enrollment_id = e.id
        AND ep.class_id = st.class_id AND ep.section_id = st.section_id
      WHERE st.id = ANY($1::text[]) AND ep.id IS NULL
      ON CONFLICT (entity_type, entity_id, issue_code, academic_year_label) DO NOTHING
      RETURNING id
    `, [ids, runId]));
    inserted += result.length;
  }

  process.stdout.write(JSON.stringify({
    target, runId: apply ? runId : null, mode: apply ? 'apply' : 'dry-run',
    capturedAt: new Date().toISOString(), examined, inserted,
    sectionMismatches,
    byYear: Object.fromEntries([...byYear].sort(([a], [b]) => a.localeCompare(b))),
    reconciliationRequired: true,
  }, null, 2) + '\n');
} finally {
  await connection.end();
}
