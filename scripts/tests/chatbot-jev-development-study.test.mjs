import { describe, expect, it } from 'bun:test';
import { analyzeDevelopmentProbe } from '../chatbot-jev-development-study.mjs';
import { buildDecisionRequest, JEV_MODEL, INTENT_NAMES, parseDecision } from '../chatbot-jev.mjs';
import { buildDecisionRequestV4 } from '../chatbot-jev-wording-v4.mjs';

const decision = choice => parseDecision({ model: JEV_MODEL, usage: { input_tokens: 100, cost: 0.0000042 },
  answers: { intent: { type: 'choice', choice, confidence: 0.9,
    probabilities: Object.fromEntries(INTENT_NAMES.map(name => [name, name === choice ? 1 : 0])) },
  is_write: { type: 'noul', noul: 0.1 } } });
const item = (id, query, intent) => ({ id, query, intent, isWrite: false, language: 'fr', familyId: id, source: 'assistant', split: 'dev' });
const corpus = { developmentOnly: true, cases: [item('count', "Tu peux me dire le nombre d'élèves ?", 'student_count'),
  item('names', 'Je veux les noms des professeurs.', 'needs_llm')] };
const report = { model: JEV_MODEL, requestShape: buildDecisionRequest('<query>'), split: 'dev', repetitions: 1,
  acceptancePolicy: 'core', gateThreshold: 0.8, stoppedReason: null,
  keyUsageBefore: { usage: 1 }, keyUsageAfter: { usage: 1.02 }, estimatedBudget: { reservedUsd: 0 },
  samples: corpus.cases.map((row, index) => ({ id: row.id, repetition: 1, durationMs: 200 + index * 100,
    reportedCostUsd: 0.0000042, decision: decision(index ? 'teacher_count' : 'student_count') })) };

describe('offline development classification analysis', () => {
  it('checks the declared v4 request shape and preserves legacy v3 analysis', () => {
    expect(analyzeDevelopmentProbe(corpus, report).writeWordingVersion).toBe(3);
    expect(analyzeDevelopmentProbe(corpus, { ...report, writeWordingVersion: 4,
      requestShape: buildDecisionRequestV4('<query>') }).writeWordingVersion).toBe(4);
    expect(() => analyzeDevelopmentProbe(corpus, { ...report, writeWordingVersion: 4 })).toThrow();
    expect(() => analyzeDevelopmentProbe(corpus, { ...report, writeWordingVersion: 5 })).toThrow();
  });
  it('separates actual errors, prototype veto, classifier time and shared key delta without rewriting evidence', () => {
    const original = JSON.stringify({ corpus, report });
    const analysis = analyzeDevelopmentProbe(corpus, report);
    expect(analysis).toMatchObject({ attempts: 2, validDecisions: 2, complete: true, productionAcceptance: false,
      all: { accepted: 2, acceptedWrong: 1, errorUpperBound95: null }, prototypeCountGuard: { after: { questions: 1, wrongQuestions: 0 } },
      classifierLatencyMs: { all: { mean: 250 }, warm: { mean: 300 } } });
    expect(analysis.accounting.knownRequestCostsUsd).toBeCloseTo(0.0000084, 12);
    expect(analysis.accounting.observedKeyDeltaUsd).toBeCloseTo(0.02, 12);
    expect(analysis.wrongChoices[0]).toMatchObject({ id: 'names', provisionalLabel: 'needs_llm', choice: 'teacher_count' });
    expect(JSON.stringify({ corpus, report })).toBe(original);
  });
  it('refuses changed evidence or evaluation policy and retains incomplete/unknown-cost failures', () => {
    expect(() => analyzeDevelopmentProbe(corpus, { ...report, gateThreshold: 0.5 })).toThrow();
    expect(() => analyzeDevelopmentProbe(corpus, { ...report, samples: [report.samples[1], report.samples[0]] })).toThrow();
    expect(() => analyzeDevelopmentProbe(corpus, { ...report, samples: [{ ...report.samples[0], reportedCostUsd: 0 }] })).toThrow();
    const failed = analyzeDevelopmentProbe(corpus, { ...report, stoppedReason: 'unknown_request_cost',
      estimatedBudget: { reservedUsd: 0.00015 }, samples: [{ id: 'count', repetition: 1, durationMs: 10000,
        reportedCostUsd: null, error: 'timeout' }] });
    expect(failed).toMatchObject({ complete: false, validDecisions: 0, accounting: { requestsWithUnknownCost: 1, retainedReservationUsd: 0.00015 } });
  });
  it('keeps a false write score distinct from an intent error and shows guarded abstention', () => {
    const wrongWrite = { ...report.samples[0].decision, writeProbability: 0.7 };
    const analysis = analyzeDevelopmentProbe({ ...corpus, cases: [corpus.cases[0]] }, { ...report,
      samples: [{ ...report.samples[0], decision: wrongWrite }] });
    expect(analysis.wrongChoices).toEqual([]);
    expect(analysis.writeDisagreements).toMatchObject([{ id: 'count', isWrite: false, highConfidenceAcceptanceBlocked: true }]);
    expect(analysis.all).toMatchObject({ accepted: 0, acceptedWrong: 0, writeAccuracy: 0 });
  });
});
