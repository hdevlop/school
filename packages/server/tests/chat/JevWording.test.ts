import { expect, test } from 'bun:test';
import { buildJevDecisionRequest } from '../../src/modules/chat/jev/jevWording';
import { INTENTS, INTENT_NAMES, JEV_MODEL } from '../../src/modules/chat/jev/jevIntents';
import { hasOrdinaryJevReply, ORDINARY_JEV_READS } from '../../src/modules/chat/jev/jevReplyPlan';
import { jevSyntheticCases } from './fixtures/jevSyntheticCases';
import { jevDarijaCases } from './fixtures/jevDarijaCases';

test.each(jevSyntheticCases.filter(item => ORDINARY_JEV_READS.some(intent => intent === item.intent)))
  ('builds the provider questions with the original supported query: $id', ({ query }) => {
    const request = buildJevDecisionRequest(query);
    expect(request.model).toBe(JEV_MODEL);
    expect(request.state).toBe(query);
    expect(Object.keys(request)).toEqual(['model', 'state', 'questions']);
    expect(Object.keys(request.questions.intent.criteria)).toEqual(INTENT_NAMES);
    expect(request.questions.intent.type).toBe('choice');
    expect(request.questions.is_write.type).toBe('noul');
    expect(request.questions.is_write.instructions).toContain('not by command tone');
  });

test('request criteria cannot alter another request or the shared intent definitions', () => {
  const first = buildJevDecisionRequest('Combien de professeurs ?');
  first.questions.intent.criteria.student_count = 'changed';
  first.questions.is_write.criteria.true = 'changed';
  const second = buildJevDecisionRequest('Combien de professeurs ?');
  expect(second.questions.intent.criteria.student_count).toBe(INTENTS.student_count);
  expect(second.questions.is_write.criteria.true).not.toBe('changed');
});

test.each(['', '   '])('rejects empty provider input: %j', query => {
  expect(() => buildJevDecisionRequest(query)).toThrow('Query must be non-empty text');
});

test('reviewed writes and ambiguous or filtered requests remain outside Jev eligibility', () => {
  const controls = jevDarijaCases.filter(item => ['write_request', 'needs_llm'].includes(item.intent));
  expect(controls.length).toBeGreaterThan(0);
  for (const item of controls) expect(hasOrdinaryJevReply(item.query)).toBe(false);
});

test.each(['packages/server/tests/chat/fixtures/jev-fresh-stress304-20261007.json',
  'packages/server/tests/chat/fixtures/jev-moroccan-development.json',
  'packages/server/tests/chat/fixtures/jev-core-exploration.json'])
  ('keeps the retained write controls outside Jev eligibility: %s', async path => {
    const corpus = await Bun.file(path).json();
    const writes = corpus.cases.filter((item: { intent: string }) => item.intent === 'write_request');
    expect(writes.length).toBeGreaterThan(0);
    for (const item of writes) expect(hasOrdinaryJevReply(item.query)).toBe(false);
  });
