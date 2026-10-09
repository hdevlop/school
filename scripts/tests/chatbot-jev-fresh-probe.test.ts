import { expect, test } from 'bun:test';
import { validateFreshDarija, runFreshProbe } from '../chatbot-jev-fresh-probe';
import { INTENT_NAMES } from '../../packages/server/src/modules/chat/jevIntents';
const corpus = await Bun.file('datasets/chatbot-latency/jev-fresh-darija-20261009.json').json();
test('fresh paired exploration refuses reused text, other languages and fabricated native acceptance', () => {
  expect(validateFreshDarija(corpus, [])).toHaveLength(24);
  expect(() => validateFreshDarija(corpus, [corpus.cases[0]])).toThrow();
  for (const change of [{ independentNativeAcceptance: true }, { source: 'real_user' }, { cases: [{ ...corpus.cases[0], language: 'fr' }] }]) expect(() => validateFreshDarija({ ...corpus, ...change }, [])).toThrow();
});
test('unknown decision cost stops before another request and retains its reservation', async () => {
  let calls = 0;
  const result = await runFreshProbe(corpus.cases, { key: 'unused', maxUsd: 0.015, reserveUsd: 0.00015,
    fetchImpl: (async () => { calls++; return Response.json({ error: 'missing usage' }); }) as typeof fetch });
  expect(calls).toBe(1); expect(result.rows).toHaveLength(1); expect(result.budget.requestsWithUnknownCost).toBe(1);
  expect(result.budget.reservedUsd).toBe(0.00015); expect(result.rows[0].accepted).toBe(false);
});
test('a high-confidence school-count guess for a parent-specific question is vetoed', async () => {
  const sample = corpus.cases.find((x: any) => x.family === 'parent-own');
  const result = await runFreshProbe([sample], { key: 'unused', maxUsd: 0.015, reserveUsd: 0.00015,
    fetchImpl: (async () => Response.json({ model: 'typesafe/jev-1.13', usage: { input_tokens: 1, cost: 0.00001 }, answers: {
      intent: { type: 'choice', choice: 'student_count', confidence: 1, probabilities: Object.fromEntries(INTENT_NAMES.map(n => [n, n === 'student_count' ? 1 : 0])) },
      is_write: { type: 'noul', noul: 0 } } })) as typeof fetch });
  expect(result.rows[0].correctClassification).toBe(false); expect(result.rows[0].accepted).toBe(false);
  expect(result.rows[0].plannedTools).toEqual([]);
});
