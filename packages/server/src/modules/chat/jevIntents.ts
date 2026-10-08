/** Shared Decisions protocol. No network, settings, authorization or tool execution. */
export interface JevDecision {
  choice: JevIntent; confidence: number; topProbability: number;
  probabilities: Record<JevIntent, number>; writeProbability: number;
  model: string; inputTokens: number; costUsd: number;
}
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
export type JevIntent = keyof typeof INTENTS;
export const INTENT_NAMES = Object.keys(INTENTS) as JevIntent[];

export const ACCEPTANCE_POLICIES = Object.freeze({
  full: Object.freeze(INTENT_NAMES.filter(name => name !== 'needs_llm')),
  core: Object.freeze(INTENT_NAMES.filter(name => !['needs_llm', 'upcoming_exams'].includes(name))),
});

export function validateAcceptancePolicy(policy: string) {
  if (!Object.hasOwn(ACCEPTANCE_POLICIES, policy)) throw new Error('Use acceptance-policy=full or core');
  return policy;
}

const INSTRUCTIONS = 'The message was typed by a school administrator in the chat of a Moroccan school management dashboard. '
  + 'It can be English, French, Spanish, Modern Standard Arabic or Moroccan Darija in Arabic or Latin script, or a mix. ';

export function buildDecisionRequest(query: string) {
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

/** Development candidate only. The runtime and historical builder still use wording 3. */
export const JEV_WORDING_CANDIDATE_VERSION = 5;
export function buildDecisionRequestV5(query: string) {
  const request = buildDecisionRequest(query);
  request.questions.intent.criteria = {
    ...request.questions.intent.criteria,
    upcoming_exams: INTENTS.upcoming_exams + ' In Moroccan Darija, "imta lfard jay?" and "إمتى الفرض الجاي؟" ask when the next exam is; '
      + '"lforod jayin" and "الفروض الجايين" mean upcoming exams. A named subject or class still needs needs_llm.',
    student_and_teacher_count: INTENTS.student_and_teacher_count + ' "bo7do" / "بوحدو" means separately. '
      + 'Give two counts; adding them into one total or doing arithmetic needs needs_llm.',
  };
  request.questions.is_write.instructions = 'Does the message ask the assistant to CHANGE stored school data now? '
    + 'Decide by the requested action on records, not by command tone. Read, show, list, count and ask when are not changes.';
  request.questions.is_write.criteria = {
    true: 'Change records: add a student/teacher, edit a phone/class, record attendance, delete a payment/exam, or send/publish an announcement. '
      + 'Darija examples: zid tilmid jdid; beddel nmra; sejjel tilmid ghayeb; mse7 lfard; sifet i3lan. '
      + 'It is still a change when the target details are incomplete.',
    false: 'Only read existing information or ask how: show exam dates, ask when the next exam is, list classes, count students/teachers, '
      + 'or show attendance. Darija examples: 3tini 3adad tlamd; gouli ch7al mn tilmid; werini tawarikh dyal lforod; imta lfard jay. '
      + '3tini/gouli/werini alone do not change a record. Negated or quoted changes are not requests to execute them.',
  };
  return request;
}

const isRecord = (value: unknown): value is Record<string, any> => value !== null && typeof value === 'object' && !Array.isArray(value);
const probability = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
const tokenCount = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
// API probabilities are rounded to two decimals in the retained probe. Nine
// individually rounded values can differ from one by at most 9 * 0.005.
const probabilitySumTolerance = INTENT_NAMES.length * 0.005 + 1e-12;
const modelMatches = (model: unknown) => typeof model === 'string' && (model === JEV_MODEL
  || model.startsWith(`${JEV_MODEL}-`) && /^\d{8}$/.test(model.slice(JEV_MODEL.length + 1)));

/** Reads one decisions response; anything malformed is an error sample, never a guess. */
export function parseDecision(body: any): JevDecision {
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
  const values = Object.values(probabilities) as number[];
  const topProbability = Math.max(...values);
  if (Math.abs(values.reduce((sum, value) => sum + value, 0) - 1) > probabilitySumTolerance
    || probabilities[intent.choice] + 1e-12 < topProbability) throw new Error('Malformed Jev decision');
  return {
    choice: intent.choice,
    confidence: intent.confidence,
    topProbability,
    probabilities: { ...probabilities } as Record<JevIntent, number>,
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
export function accepts(decision: any, threshold: number, guarded = false, policy: string = 'full') {
  if (!probability(threshold) || !decision || !INTENT_NAMES.includes(decision.choice)
    || decision.choice === 'needs_llm' || !probability(decision.confidence)
    || !probability(decision.writeProbability) || decision.confidence < threshold
    || !Object.hasOwn(ACCEPTANCE_POLICIES, policy) || !ACCEPTANCE_POLICIES[policy as keyof typeof ACCEPTANCE_POLICIES].includes(decision.choice)) return false;
  return !guarded || (decision.choice === 'write_request') === (decision.writeProbability >= 0.5);
}
