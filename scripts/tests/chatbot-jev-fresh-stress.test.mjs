import { expect, test } from 'bun:test';
import { buildFreshStressCorpus } from '../../datasets/chatbot-latency/jev-fresh-stress-authoring.mjs';
import { validateFreshCorpus } from '../chatbot-jev-accuracy.mjs';

test('new corpus preserves pending wording review and clusters read paraphrases across all languages', () => {
  const corpus = buildFreshStressCorpus();
  const validation = validateFreshCorpus(corpus, []);
  expect(validation.cases).toBe(304);
  expect(validation.families).toBe(61);
  expect(validation.operatorWorkflow.languageReviewComplete).toBe(false);
  const studentCounts = corpus.cases.filter(row => row.intent === 'student_count');
  expect(studentCounts).toHaveLength(12);
  expect(new Set(studentCounts.map(row => row.familyId)).size).toBe(1);
  for (const language of ['fr', 'ar', 'ary', 'ary-latn']) {
    const writes = corpus.cases.filter(row => row.language === language && row.isWrite);
    expect(new Set(writes.map(row => row.familyId)).size).toBe(30);
  }
  const altered = structuredClone(corpus);
  altered.operatorLanguageReview = { status: 'approved', statement: 'done', casesSha256: 'old-batch-hash' };
  expect(() => validateFreshCorpus(altered, [])).toThrow();
  expect(() => validateFreshCorpus(corpus, [corpus.cases[0]])).toThrow();
});
