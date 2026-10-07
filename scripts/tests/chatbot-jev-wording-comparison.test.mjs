import { expect, it } from 'bun:test';
import { compareDevelopmentProbes } from '../chatbot-jev-wording-comparison.mjs';
import { buildDecisionRequest, JEV_MODEL, INTENT_NAMES, parseDecision } from '../chatbot-jev.mjs';
import { buildDecisionRequestV4 } from '../chatbot-jev-wording-v4.mjs';

const corpus = { developmentOnly: true, cases: [{ id: 'read', familyId: 'read', source: 'assistant', split: 'dev', language: 'fr',
  query: "Tu peux me dire le nombre d'élèves ?", intent: 'student_count', isWrite: false }] };
const report = (version, choice, write) => ({ split: 'dev', repetitions: 1, model: JEV_MODEL, acceptancePolicy: 'core', gateThreshold: 0.8,
  writeWordingVersion: version, requestShape: (version === 4 ? buildDecisionRequestV4 : buildDecisionRequest)('<query>'), stoppedReason: null,
  samples: [{ id: 'read', repetition: 1, durationMs: 300, reportedCostUsd: 0.0000042,
    decision: parseDecision({ model: JEV_MODEL, usage: { input_tokens: 100, cost: 0.0000042 },
      answers: { intent: { type: 'choice', choice, confidence: 0.9,
        probabilities: Object.fromEntries(INTENT_NAMES.map(name => [name, name === choice ? 1 : 0])) },
      is_write: { type: 'noul', noul: write } } }) }] });

it('records corrected write scores and newly unsafe choices independently', () => {
  const before = report(3, 'student_count', 0.7);
  const after = report(4, 'teacher_count', 0.1);
  const original = JSON.stringify({ corpus, before, after });
  const result = compareDevelopmentProbes(corpus, before, after);
  expect(result.correctedFalseWrites).toEqual(['read']);
  expect(result.newlyWrongChoices).toEqual(['read']);
  expect(result.newlyWrongAccepted).toEqual(['read']);
  expect(result.checks).toMatchObject({ falseWriteScoresReduced: true, noWrongAcceptedChoices: false });
  expect(result.developmentCriteriaPass).toBe(false);
  expect(JSON.stringify({ corpus, before, after })).toBe(original);
});

it('refuses a swapped version and does not pass incomplete runs', () => {
  const before = report(3, 'student_count', 0.7);
  const after = report(4, 'student_count', 0.1);
  expect(() => compareDevelopmentProbes(corpus, after, before)).toThrow();
  const result = compareDevelopmentProbes(corpus, before, { ...after, stoppedReason: 'budget_stop' });
  expect(result.gainedCorrectAccepted).toEqual(['read']);
  expect(result.checks.completeValidRuns).toBe(false);
  expect(result.developmentCriteriaPass).toBe(false);
});

it('preserves partial-prefix evidence when an unattempted case was language-skipped in the baseline', () => {
  const expanded = { ...corpus, cases: [...corpus.cases, { ...corpus.cases[0], id: 'unknown', familyId: 'unknown', query: 'zzqvx', intent: 'needs_llm' }] };
  const before = report(3, 'student_count', 0.7);
  before.samples.push({ ...before.samples[0], id: 'unknown' });
  const after = { ...report(4, 'student_count', 0.1), stoppedReason: 'unknown_request_cost' };
  const result = compareDevelopmentProbes(expanded, before, after);
  expect(result.pairedQuestions).toBe(1);
  expect(result.developmentCriteriaPass).toBe(false);
  expect(result.before.languageSkipped).toEqual(['unknown']);
  expect(result.after.attempts).toBe(1);
});
