/** Offline scoring of frozen Darija tool plans. Never dispatches provider calls. */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
export function scoreSelection(row, item, schemas, knownIds, today) {
  const expected = item.expectation, issues = [];
  const tools = row.tools ?? [];
  const names = tools.map(tool => tool.name);
  if (!row.done || row.aborted || row.errors?.length || !row.diagnostics) issues.push('incomplete_reply');
  if (row.diagnostics?.reply?.error) issues.push('template_error');
  if (row.diagnostics?.tools?.some(tool => tool.outcome !== 'executed')) issues.push('tool_failed_or_blocked');
  if (expected.kind !== 'read' && names.length) issues.push('unexpected_data_tool');
  for (const alternatives of expected.requiredToolGroups)
    if (!alternatives.some(name => names.includes(name))) issues.push('missing_required_tool:' + alternatives.join('|'));
  for (const tool of tools) {
    const schema = schemas.find(value => value.name === tool.name);
    if (!schema) { issues.push('unknown_tool'); continue; }
    if (schema.annotations?.readOnlyHint !== true) issues.push('non_read_tool:' + tool.name);
    if (!tool.arguments || typeof tool.arguments !== 'object') { issues.push('missing_arguments:' + tool.name); continue; }
    const args = tool.arguments;
    if (args.academicYear != null && args.academicYear !== expected.academicYear) issues.push('wrong_year');
    for (const key of schema.inputSchema?.required ?? [])
      if (args[key] === undefined) issues.push('missing_argument:' + key);
    for (const [key, value] of Object.entries(args)) {
      if (/^(?:id|.*Id)$/u.test(key) && typeof value === 'string' && !knownIds.has(value)) issues.push('unresolved_id:' + key);
      const property = schema.inputSchema?.properties?.[key];
      if (property?.enum && !property.enum.includes(value)) issues.push('invalid_enum:' + key);
    }
    if (expected.studentAttendance && /^attendance_/u.test(tool.name)
      && tool.name !== 'attendance_get_today_students' && args.type !== 'student') issues.push('missing_student_attendance_scope');
    if (expected.studentAttendance && item.intent === 'attendance_today'
      && tool.name === 'attendance_get_by_date' && args.date !== today) issues.push('wrong_attendance_date');
  }
  const countIntents = ['student_count', 'teacher_count', 'student_and_teacher_count'];
  if (countIntents.includes(item.intent)) {
    const allowed = expected.requiredToolGroups.flat();
    if (names.some(name => !allowed.includes(name))) issues.push('unexpected_count_tool');
  }
  const reviews = [];
  if (expected.finalAnswerReview) reviews.push('clarification_or_result_filter_needs_review');
  if (expected.answerFacts?.some(value => !new RegExp('(?<![0-9])' + value + '(?![0-9])', 'u').test(row.text ?? '')))
    reviews.push('numeric_fact_not_visible');
  if (expected.kind === 'refusal' && !/(?:ما نقدر|ما يمكن|لا يمكن|مانقدر|لوحة|الدردشة|الدردشه|التغيير)/u.test(row.text ?? ''))
    reviews.push('refusal_wording_needs_review');
  return { issues: [...new Set(issues)], reviewFlags: reviews,
    toolPlanChecksPassed: issues.length === 0, finalAnswerCorrectness: null };
}

if (import.meta.main) {
  const [runPath, outPath] = process.argv.slice(2);
  if (!runPath || !outPath || existsSync(outPath)) throw Error('Supply a run and a new output path');
  const runPaths = runPath.split(',');
  const inputPaths = [...runPaths, 'datasets/chatbot-latency/darija-tool-selection-20261008.json',
    'docs/evidence/chatbot-latency/darija-selection-tools-20261008.json',
    'docs/evidence/chatbot-latency/darija-selection-fixture-data-20261008.json'];
  const inputs = inputPaths.map(path => ({ path, bytes: readFileSync(path) }));
  const parsed = inputs.map(input => JSON.parse(input.bytes.toString('utf8').replace(/^\uFEFF/u, '')));
  const segments = parsed.slice(0, runPaths.length);
  const run = { ...segments.at(-1), protocol: segments[0].protocol,
    rows: segments.flatMap(segment => segment.rows), attempts: segments.flatMap(segment => segment.attempts) };
  const [corpus, registry, fixture] = parsed.slice(runPaths.length);
  if (run.protocol.purpose !== 'darija-tool-selection-comparison') throw Error('Require the frozen Darija run');
  if (new Set(run.rows.map(row => row.caseId + '/' + row.experimentArm)).size !== run.rows.length) throw Error('Duplicate dispatch');
  const fixtureValues = Object.fromEntries(Object.entries(fixture).map(([key, content]) =>
    [key, JSON.parse(content.find(item => item.type === 'text').text)]));
  if (fixtureValues.students_get_student_count.count !== 8 || fixtureValues.teachers_get_teacher_count.count !== 0)
    throw Error('Fixture count expectations changed');
  const knownIds = new Set([...fixtureValues.classes_get_classes, ...fixtureValues.sections_get_sections].map(value => value.id));
  const rows = run.rows.map(row => {
    const item = corpus.cases.find(item => item.id === row.caseId);
    if (!item || item.query !== run.protocol.cases.find(value => value.id === row.caseId)?.query)
      throw Error('Corpus differs from dispatched wording');
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Casablanca' }).format(new Date(row.startedAt));
    return { caseId: item.id, familyId: item.familyId, language: item.language, query: item.query,
      arm: row.experimentArm, expectedIntent: item.intent, expectation: item.expectation,
      ...scoreSelection(row, item, registry.result.tools, knownIds, today),
      completedStream: Boolean(row.done && !row.aborted && !row.errors?.length),
      completionSeconds: row.completionMs / 1000,
      tools: row.tools, text: row.text, reply: row.diagnostics?.reply,
      shortlist: row.diagnostics?.replyPreparation?.availableToolNames ?? null };
  });
  const arms = run.protocol.arms.map(arm => {
    const list = rows.filter(row => row.arm === arm.experimentArm);
    const completed = list.filter(row => row.completedStream && Number.isFinite(row.completionSeconds));
    const average = completed.length ? completed.reduce((sum, row) => sum + row.completionSeconds, 0) / completed.length : null;
    const families = [...new Set(corpus.cases.map(item => item.familyId))];
    return { arm: arm.experimentArm, attempted: list.length, expected: corpus.cases.length,
      toolPlanChecksPassed: list.filter(row => row.toolPlanChecksPassed).length,
      failures: list.filter(row => !row.toolPlanChecksPassed).length,
      pendingFinalReview: list.filter(row => row.reviewFlags.length).length,
      completedStreams: completed.length, averageResponseSeconds: average,
      averageUnderTwoSeconds: completed.length === corpus.cases.length && average !== null && average < 2,
      scripts: Object.fromEntries(['ary', 'ary-latn'].map(language => [language, {
        attempted: list.filter(row => row.language === language).length,
        toolPlanChecksPassed: list.filter(row => row.language === language && row.toolPlanChecksPassed).length,
      }])),
      pairedFamiliesPassed: families.filter(family => {
        const variants = list.filter(row => row.familyId === family);
        return variants.length === 2 && variants.every(row => row.toolPlanChecksPassed);
      }).length,
      familyCount: families.length,
      failureCases: list.filter(row => row.issues.length).map(row => ({ caseId: row.caseId, issues: row.issues })) };
  });
  const report = { version: 1, status: run.status, newPaidRequests: 0, productionAcceptance: false,
    source: inputs.map(({ path, bytes }) => ({ path, sha256: createHash('sha256').update(bytes).digest('hex') })),
    analyzerSha256: createHash('sha256').update(readFileSync('scripts/chatbot-darija-selection-report.mjs')).digest('hex'),
    primaryMetric: 'frozen tool-plan and argument checks; no-error replies alone are not success',
    classifierAcceptedWrong: run.attempts.filter(attempt => attempt.selected === 'template'
      && attempt.choice !== corpus.cases.find(item => item.id === attempt.caseId)?.intent).length,
    arms, rows,
    limitations: ['Reused owner-reviewed wording and assistant labels; 50 linked families, not independent native evidence.',
      'Empty exam/attendance/teacher data cannot establish nonempty filtering accuracy.',
      'Final wording, clarification quality and calculated/filter answers need semantic review; tool-plan checks are not full answer accuracy.',
      'Shortlist names captured only on router-first candidate requests; do not attribute other failures solely to retrieval.',
      'Admin first-turn fixture only; student and other actor permissions are not qualified.'] };
  writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ output: outPath, status: report.status, arms }));
}
