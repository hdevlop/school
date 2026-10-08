import { expect, it } from 'bun:test';
import { INTENT_NAMES, JEV_MODEL } from '../chatbot-jev.mjs';
import { replayFixStudy } from '../chatbot-jev-fix-study.mjs';
// Keep a qualified sum outside today's closed local reply plans, so this still
// exercises the historical Jev arithmetic guard on a genuine fallback candidate.
const item = { id: 'sum', query: 'jme3 liya 3adad tlamd m3a 3adad lasatida w 3tini lmajmou3 f l9ism A.',
  language: 'ary-latn', split: 'dev', source: 'assistant', intent: 'needs_llm', isWrite: false, familyId: 'sum-family' };
const decision = { choice: 'student_and_teacher_count', confidence: 0.97, topProbability: 1,
  probabilities: Object.fromEntries(INTENT_NAMES.map(name => [name, name === 'student_and_teacher_count' ? 1 : 0])),
  writeProbability: 0, model: JEV_MODEL, inputTokens: 100, costUsd: 0.00004 };
it('replays a read-score arithmetic error without rewriting scores and preserves failed attempts', () => {
  const corpus = { cases: [item] };
  const report = { samples: [{ id: item.id, repetition: 1, durationMs: 300, decision },
    { id: item.id, repetition: 2, durationMs: 10000, error: 'Synthetic timeout fixture', reportedCostUsd: null }] };
  const before = JSON.stringify({ corpus, report });
  const result = replayFixStudy(corpus, [report]);
  expect(result).toMatchObject({ attempts: 2, valid: 1, productionAcceptance: false,
    version3OnCurrentCandidates: { before: { wrong: 1 }, after: { wrong: 0, questions: 0 }, preventedWrong: { questions: 1 } } });
  expect(result.errors).toHaveLength(1);
  expect(JSON.stringify({ corpus, report })).toBe(before);
  expect(() => replayFixStudy(corpus, [report, report])).toThrow('repeated');
  expect(() => replayFixStudy(corpus, [{ samples: [{ id: 'foreign', repetition: 1 }] }])).toThrow('Unknown');
});
