import { expect, it } from 'bun:test';
import { studyCandidates } from '../chatbot-jev-candidate-study.mjs';
import { buildDecisionRequest, INTENT_NAMES, JEV_MODEL, parseDecision } from '../chatbot-jev.mjs';

it('counts only formerly vetoed correct acceptances as restored, including repeated attempts', () => {
  const cases = [
    { id: 'plain', query: "Tu peux me dire le nombre d'enseignants ?", intent: 'teacher_count' },
    { id: 'restored', query: 'Je demande le total des enseignants, sans leurs noms.', intent: 'teacher_count' },
    { id: 'low', query: 'Je demande le total des enseignants, sans leurs noms.', intent: 'teacher_count' },
    { id: 'unsafe', query: 'Je veux les noms des enseignants, pas leur nombre.', intent: 'needs_llm' },
  ].map(row => ({ ...row, language: 'fr', split: 'dev', isWrite: false, source: 'assistant', familyId: row.id }));
  const samples = cases.map(row => ({ id: row.id, repetition: 1, decision: parseDecision({ model: JEV_MODEL,
    usage: { input_tokens: 100, cost: 0.0000042 }, answers: { is_write: { type: 'noul', noul: 0.1 },
      intent: { type: 'choice', choice: 'teacher_count', confidence: row.id === 'low' ? 0.5 : 0.9,
        probabilities: Object.fromEntries(INTENT_NAMES.map(name => [name, name === 'teacher_count' ? 1 : 0])) } } }) }));
  samples.push({ ...samples[1], repetition: 2 });
  const result = studyCandidates({ cases }, [{ requestShape: buildDecisionRequest('<query>'), samples }]);
  expect(result.restoredCorrect).toEqual(['restored']);
  expect(result.comparison).toMatchObject({ version1After: { questions: 1 }, after: { questions: 2, wrongQuestions: 0 },
    preventedWrong: { questions: 1 }, lostCorrect: { questions: 0 } });
});
