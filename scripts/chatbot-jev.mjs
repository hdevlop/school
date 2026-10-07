/** Jev Stage A helpers: the closed intent list, request shape, labels and scoring. No network. */
import { percentile } from './chatbot-stream.mjs';

export const JEV_MODEL = 'typesafe/jev-1.13';
export const JEV_DECISIONS_URL = 'https://openrouter.ai/api/alpha/decisions';
export const LANGUAGES = ['en', 'fr', 'es', 'ar', 'ary', 'ary-latn'];
export const SPLITS = ['dev', 'test'];

// Every intent except needs_llm names a reply School could give without the model.
// Tuned on the dev split only (B0). Version 1 is in the Stage A report's
// requestShape; version 2 added a Darija glossary that pushed a write towards
// today's attendance, so version 3 drops it (jev-b0-dev2-20261005.json).
export const INTENT_WORDING_VERSION = 3;
export const INTENTS = {
  small_talk: 'Only a greeting, thanks, goodbye, or a question about what the assistant can do. No request for school data.',
  student_count: 'Asks only how many students are enrolled in the whole school this year: one number, not a list of students, with no filter by class, section, gender, status, date or anything else.',
  teacher_count: 'Asks only how many teachers the whole school has: one number, not a list or names of teachers, with no filter by subject, class or anything else.',
  student_and_teacher_count: 'Asks for both the total number of students and the total number of teachers, with no filter.',
  class_list: "Asks to list or name the school's classes, with no filter and no question about their students, teachers or timetable.",
  attendance_today: "Asks to see today's attendance for the whole school (who is present or absent today), with no class, student or other date, and not a number to compute.",
  upcoming_exams: 'Asks which exams are coming up or when the next exam is, for the whole school, with no class, subject or student filter.',
  write_request: 'Asks the assistant to create, add, record, mark, change, publish, send or delete something now, for example to record a student as absent or present today, including short Darija commands. Asking how to do it oneself is not this.',
  needs_llm: 'Anything else: a question with a filter or qualifier (a class, a student, a name, a gender, a past or other date, last year, a number to compute), a list of teachers or students, '
    + 'grades, fees, payments, timetables, how-to questions, a short follow-up that starts with "and" (et, y, و, w) or needs an earlier message, unclear requests and topics unrelated to the school.',
};
export const INTENT_NAMES = Object.keys(INTENTS);

export const ACCEPTANCE_POLICIES = Object.freeze({
  full: Object.freeze(INTENT_NAMES.filter(name => name !== 'needs_llm')),
  core: Object.freeze(INTENT_NAMES.filter(name => !['needs_llm', 'upcoming_exams'].includes(name))),
});

export function validateAcceptancePolicy(policy) {
  if (!Object.hasOwn(ACCEPTANCE_POLICIES, policy)) throw new Error('Use acceptance-policy=full or core');
  return policy;
}

const INSTRUCTIONS = 'The message was typed by a school administrator in the chat of a Moroccan school management dashboard. '
  + 'It can be English, French, Spanish, Modern Standard Arabic or Moroccan Darija in Arabic or Latin script, or a mix. ';

export function buildDecisionRequest(query) {
  if (typeof query !== 'string' || !query.trim()) throw new Error('Query must be non-empty text');
  return {
    model: JEV_MODEL,
    state: query,
    questions: {
      intent: { type: 'choice', instructions: `${INSTRUCTIONS}Which kind of request is it?`, criteria: INTENTS },
      is_write: { type: 'noul', instructions: `${INSTRUCTIONS}Does it ask the assistant itself to create, add, record, mark, change, publish or delete data?`,
        criteria: { true: 'The user wants the assistant to make a change now.',
          false: 'The user only asks to see information, asks how to do something themselves, or makes small talk.' } },
    },
  };
}

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

const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const probability = value => Number.isFinite(value) && value >= 0 && value <= 1;
const tokenCount = value => Number.isSafeInteger(value) && value >= 0;
// API probabilities are rounded to two decimals in the retained probe. Nine
// individually rounded values can differ from one by at most 9 * 0.005.
const probabilitySumTolerance = INTENT_NAMES.length * 0.005 + 1e-12;
const modelMatches = model => typeof model === 'string' && (model === JEV_MODEL
  || model.startsWith(`${JEV_MODEL}-`) && /^\d{8}$/.test(model.slice(JEV_MODEL.length + 1)));

/** Reads one decisions response; anything malformed is an error sample, never a guess. */
export function parseDecision(body) {
  const intent = body?.answers?.intent;
  const write = body?.answers?.is_write;
  const probabilities = intent?.probabilities;
  const usage = body?.usage;
  if (!isRecord(intent) || intent.type !== 'choice' || !INTENT_NAMES.includes(intent.choice)
    || !probability(intent.confidence) || !isRecord(write) || write.type !== 'noul' || !probability(write.noul)
    || !isRecord(probabilities) || Object.keys(probabilities).length !== INTENT_NAMES.length
    || !INTENT_NAMES.every(name => Object.hasOwn(probabilities, name) && probability(probabilities[name]))
    || !modelMatches(body?.model) || !isRecord(usage) || !tokenCount(usage.input_tokens)
    || !Number.isFinite(usage.cost) || usage.cost < 0
    || (Object.hasOwn(usage, 'output_tokens') && !tokenCount(usage.output_tokens))) {
    throw new Error('Malformed Jev decision');
  }
  const values = Object.values(probabilities);
  const topProbability = Math.max(...values);
  if (Math.abs(values.reduce((sum, value) => sum + value, 0) - 1) > probabilitySumTolerance
    || probabilities[intent.choice] + 1e-12 < topProbability) throw new Error('Malformed Jev decision');
  return {
    choice: intent.choice,
    confidence: intent.confidence,
    topProbability,
    probabilities: { ...probabilities },
    writeProbability: write.noul,
    model: body.model,
    inputTokens: usage.input_tokens,
    costUsd: usage.cost,
  };
}

/**
 * Accepted means a deterministic reply would run instead of the model.
 * Guarded acceptance also requires the yes/no write answer to agree with the choice.
 */
export function accepts(decision, threshold, guarded = false, policy = 'full') {
  if (!probability(threshold) || !decision || !INTENT_NAMES.includes(decision.choice)
    || decision.choice === 'needs_llm' || !probability(decision.confidence)
    || !probability(decision.writeProbability) || decision.confidence < threshold
    || !Object.hasOwn(ACCEPTANCE_POLICIES, policy) || !ACCEPTANCE_POLICIES[policy].includes(decision.choice)) return false;
  return !guarded || (decision.choice === 'write_request') === (decision.writeProbability >= 0.5);
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
