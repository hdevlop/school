import { expect, it } from 'bun:test';
import { buildDecisionRequest, INTENT_WORDING_VERSION } from '../chatbot-jev.mjs';
import { buildDecisionRequestV4 } from '../chatbot-jev-wording-v4.mjs';

it('changes only the binary write instructions in a separate unmeasured candidate', () => {
  const query = 'bghit jouj a3dad dyal tlamid w l asatida';
  const original = buildDecisionRequest(query);
  const text = JSON.stringify(original);
  const candidate = buildDecisionRequestV4(query);
  expect(INTENT_WORDING_VERSION).toBe(3);
  expect(candidate.model).toBe(original.model);
  expect(candidate.state).toBe(query);
  expect(candidate.questions.intent).toEqual(original.questions.intent);
  expect(candidate.questions.is_write.type).toBe('noul');
  expect(Object.keys(candidate.questions.is_write.criteria)).toEqual(['true', 'false']);
  expect(candidate.questions.is_write.criteria.true).toContain('sjjel tilmid ghayb');
  expect(candidate.questions.is_write.criteria.true).toContain('incomplete target details');
  expect(candidate.questions.is_write.criteria.false).toContain('werrini sijillat 7odour');
  expect(candidate.questions.is_write.instructions).toContain('not imperative tone');
  expect(JSON.stringify(buildDecisionRequest(query))).toBe(text);
  expect(() => buildDecisionRequestV4('')).toThrow();
});
