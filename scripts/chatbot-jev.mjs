/** Jev Stage A helpers: the closed intent list, request shape, labels and scoring. No network. */
import { percentile } from './chatbot-stream.mjs';

export { JEV_MODEL, JEV_DECISIONS_URL, LANGUAGES, SPLITS, INTENT_WORDING_VERSION, INTENTS, INTENT_NAMES, ACCEPTANCE_POLICIES, validateAcceptancePolicy, buildDecisionRequest, parseDecision, accepts } from '@sms/server/jev-intents';
import { LANGUAGES, SPLITS, INTENT_NAMES, ACCEPTANCE_POLICIES, validateAcceptancePolicy, accepts } from '@sms/server/jev-intents';

const READ_INTENTS = [
  ['students_get_student_count', 'student_count'],
  ['teachers_get_teacher_count', 'teacher_count'],
  ['classes_get_classes', 'class_list'],
  ['attendance_get_today_students', 'attendance_today'],
  ['exams_get_upcoming_exams', 'upcoming_exams'],
];

/** Labels a questions.json case: an unqualified read maps to its template intent; a named lookup needs the model. */
export function labelBaseCase(item) {
  const base = { id: item.id, language: item.language, query: item.query, split: 'dev', source: 'questions.json' };
  if (item.kind === 'small-talk') return { ...base, intent: 'small_talk', isWrite: false };
  if (item.kind === 'blocked-write') return { ...base, intent: 'write_request', isWrite: true };
  if (item.kind === 'multi-read') return { ...base, intent: 'student_and_teacher_count', isWrite: false };
  if (item.kind === 'single-read') {
    const first = item.expectedToolGroups?.[0]?.[0];
    const match = READ_INTENTS.find(([tool]) => tool === first);
    return { ...base, intent: match ? match[1] : 'needs_llm', isWrite: false };
  }
  throw new Error(`Unlabelled base case ${item.id}`);
}

export function validateCases(cases) {
  const ids = new Set();
  for (const item of cases) {
    if (!item.id || ids.has(item.id) || !LANGUAGES.includes(item.language) || !SPLITS.includes(item.split)
      || !INTENT_NAMES.includes(item.intent) || typeof item.isWrite !== 'boolean'
      || item.isWrite !== (item.intent === 'write_request') || typeof item.query !== 'string' || !item.query.trim()) {
      throw new Error(`Invalid Jev case ${item.id ?? '(no id)'}`);
    }
    ids.add(item.id);
  }
  return cases;
}


function rate(numerator, denominator) {
  return denominator ? numerator / denominator : null;
}

/** One summary row over samples; each sample is { item, decision, error, durationMs }. */
export function summarize(samples, threshold, guarded = false, policy = 'full') {
  validateAcceptancePolicy(policy);
  const ok = samples.filter((sample) => sample.decision);
  const accepted = ok.filter((sample) => accepts(sample.decision, threshold, guarded, policy));
  const wrong = accepted.filter((sample) => sample.decision.choice !== sample.item.intent);
  const deterministic = ok.filter((sample) => ACCEPTANCE_POLICIES[policy].includes(sample.item.intent));
  const covered = accepted.filter((sample) => sample.decision.choice === sample.item.intent);
  return {
    acceptancePolicy: policy,
    samples: samples.length,
    errors: samples.length - ok.length,
    topChoiceAccuracy: rate(ok.filter((sample) => sample.decision.choice === sample.item.intent).length, ok.length),
    writeAccuracy: rate(ok.filter((sample) => (sample.decision.writeProbability >= 0.5) === sample.item.isWrite).length, ok.length),
    accepted: accepted.length,
    acceptedWrong: wrong.length,
    precision: rate(accepted.length - wrong.length, accepted.length),
    coverage: rate(covered.length, deterministic.length),
    writeAnsweredAsRead: wrong.filter((sample) => sample.item.isWrite).length,
    readRefusedAsWrite: wrong.filter((sample) => sample.decision.choice === 'write_request').length,
    wrongCases: [...new Set(wrong.map((sample) => `${sample.item.id} -> ${sample.decision.choice}`))],
    ...uniqueCaseErrors(accepted, wrong),
  };
}

/**
 * Repetitions of one question are not independent, so the precision claim counts
 * questions: a question is accepted when any repetition was, wrong when any accepted
 * repetition was. With no wrong question, the exact one-sided 95% upper bound on
 * the error rate is 1 - 0.05^(1/n); with any, it is left to the reader.
 */
export function uniqueCaseErrors(accepted, wrong) {
  const acceptedCases = new Set(accepted.map((sample) => sample.item.id)).size;
  const wrongCaseCount = new Set(wrong.map((sample) => sample.item.id)).size;
  return { acceptedCases, wrongCaseCount,
    errorUpperBound95: acceptedCases && !wrongCaseCount ? 1 - 0.05 ** (1 / acceptedCases) : null };
}

export function groupBy(samples, key) {
  const groups = {};
  for (const sample of samples) (groups[key(sample)] ??= []).push(sample);
  return groups;
}

/**
 * The lowest threshold whose dev precision meets the floor in every language,
 * with no write answered as a read. Null when no threshold qualifies.
 */
export function chooseThreshold(devSamples, { grid, floor = 0.98, guarded = false, policy = 'full' }) {
  for (const threshold of [...grid].sort((a, b) => a - b)) {
    const all = summarize(devSamples, threshold, guarded, policy);
    if (!all.accepted || all.writeAnsweredAsRead) continue;
    const languages = Object.values(groupBy(devSamples, (sample) => sample.item.language))
      .map((rows) => summarize(rows, threshold, guarded, policy));
    if (languages.every((row) => row.precision === null || row.precision >= floor)) return threshold;
  }
  return null;
}

export function latency(samples) {
  const values = samples.filter((sample) => sample.decision).map((sample) => sample.durationMs);
  return { count: values.length, p50: percentile(values, 50), p95: percentile(values, 95), max: values.length ? Math.max(...values) : null };
}

/** How often every repetition of a case returned the same choice. */
export function stability(samples) {
  const byCase = Object.values(groupBy(samples.filter((sample) => sample.decision), (sample) => sample.item.id));
  const stable = byCase.filter((rows) => new Set(rows.map((row) => row.decision.choice)).size === 1);
  return { cases: byCase.length, stable: stable.length, unstable: byCase.filter((rows) => !stable.includes(rows)).map((rows) => rows[0].item.id) };
}

/** Maps today's School template result to the same intent names, for the regex baseline. */
export function templateIntent(template) {
  if (!template) return 'needs_llm';
  if (typeof template.text === 'string') return 'write_request';
  const names = (template.calls ?? []).map((call) => call.name);
  if (names.length === 2) return 'student_and_teacher_count';
  return READ_INTENTS.find(([tool]) => tool === names[0])?.[1] ?? 'needs_llm';
}
