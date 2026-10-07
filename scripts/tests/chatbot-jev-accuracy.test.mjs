import { describe, expect, it } from 'bun:test';
import { assessFreshExploration, canonicalQuestion, validateFreshCorpus,
  OPERATOR_REVIEW_WORKFLOW, operatorReviewCasesSha256, validateRegressionCorpus } from '../chatbot-jev-accuracy.mjs';

const item = (id, query) => ({ id, query, language: 'fr', split: 'test', intent: 'class_list', isWrite: false,
  familyId: 'list-1', source: 'assistant' });
const row = (id, familyId = 'list-1') => ({ item: { ...item(id, `Question ${id}`), familyId },
  decision: { choice: 'class_list', confidence: 1, writeProbability: 0 }, durationMs: 100 });

describe('fresh exploratory Jev evidence', () => {
  it('allows an approved same-corpus regression without claiming fresh evidence and rejects edited cases', () => {
    const cases = [item('reused', 'Existing approved wording')];
    const reference = { cases, acceptancePolicy: 'core' };
    const corpus = { ...reference, purpose: 'regression-recheck', reviewWorkflow: OPERATOR_REVIEW_WORKFLOW,
      nativeAuthorshipWaived: true, waiverStatement: 'Actual workflow waiver',
      reference: { casesSha256: operatorReviewCasesSha256(cases) },
      operatorLanguageReview: { status: 'approved', statement: 'Actual existing approval', casesSha256: operatorReviewCasesSha256(cases) } };
    expect(validateRegressionCorpus(corpus, reference)).toMatchObject({ freshHeldout: false, productionAcceptance: false, cases: 1 });
    expect(() => validateRegressionCorpus({ ...corpus, cases: [{ ...cases[0], query: 'Changed wording' }] }, reference)).toThrow();
    expect(() => validateRegressionCorpus({ ...corpus, acceptancePolicy: 'full' }, reference)).toThrow();
    expect(() => validateRegressionCorpus({ ...corpus, operatorLanguageReview: { status: 'pending', statement: null, casesSha256: null } }, reference)).toThrow();
  });
  it('rejects old questions even with different punctuation, casing or diacritics', () => {
    expect(canonicalQuestion('ÉLÈVES — ici ?')).toBe(canonicalQuestion('eleves ici'));
    expect(() => validateFreshCorpus({ cases: [item('new', 'ÉLÈVES — ici ?')] }, [item('old', 'eleves ici')])).toThrow();
    expect(() => validateFreshCorpus({ cases: [item('same', 'new query')] }, [item('same', 'old query')])).toThrow();
    expect(() => validateFreshCorpus({ cases: [item('a', 'New query?'), item('b', 'new query!')] }, [])).toThrow();
  });
  it('requires fresh test provenance and does not invent native review', () => {
    expect(validateFreshCorpus({ cases: [item('a', 'New query')] }, [])).toMatchObject({ cases: 1, families: 1, nativeReviewedCases: 0 });
    for (const change of [{ split: 'dev' }, { source: 'native' }, { familyId: null }]) {
      expect(() => validateFreshCorpus({ cases: [{ ...item('a', 'New query'), ...change }] }, [])).toThrow();
    }
    expect(() => validateFreshCorpus({ cases: [] }, [])).toThrow();
  });
  it('does not turn repeated multilingual variants into independent acceptance', () => {
    const rows = Array.from({ length: 150 }, (_, index) => row(`case-${index}`));
    const result = assessFreshExploration(rows, rows, { threshold: 0.8, policy: 'core', plannedRequests: 150, complete: true });
    expect(result.candidateSummary.acceptedCases).toBe(150);
    expect(result.acceptedFamilies).toBe(1);
    expect(result.productionAcceptance).toBe(false);
    expect(result.reasons).toContain('fewer_than_150_independent_question_families');
    expect(result.reasons).toContain('native_authorship_and_review_outstanding');
  });
  it('records wrong accepted answers, incomplete runs and excessive latency', () => {
    const rows = [row('a'), { ...row('b'), item: { ...row('b').item, intent: 'write_request', isWrite: true }, durationMs: 700 }];
    const result = assessFreshExploration(rows, rows, { threshold: 0.8, policy: 'core', plannedRequests: 6, complete: false });
    expect(result.reasons).toContain('accepted_wrong_question');
    expect(result.reasons).toContain('write_accepted_as_read');
    expect(result.reasons).toContain('incomplete_or_failed_run');
    expect(result.reasons).toContain('warm_classification_p95_over_500ms_or_unknown');
  });

  it('supports an explicit operator wording workflow without manufacturing native evidence', () => {
    const corpus = { cases: [item('new', 'New operator draft')], reviewWorkflow: OPERATOR_REVIEW_WORKFLOW,
      nativeAuthorshipWaived: true, waiverStatement: 'User asks for assistant drafts and will review wording',
      operatorLanguageReview: { status: 'pending', statement: null, casesSha256: null } };
    const freshness = validateFreshCorpus(corpus, []);
    expect(freshness.operatorWorkflow).toMatchObject({ nativeAuthorshipRequired: false,
      languageReviewComplete: false, labels: 'assistant-provisional', nativeReviewedCases: 0 });
    const rows = [row('new')];
    const result = assessFreshExploration(rows, rows, { threshold: 0.8, policy: 'core', plannedRequests: 1,
      complete: true, operatorWorkflow: freshness.operatorWorkflow });
    expect(result.reasons).toContain('operator_darija_review_outstanding');
    expect(result.reasons).not.toContain('native_authorship_and_review_outstanding');
    expect(result.classificationGatePassed).toBe(false);
    expect(result.productionAcceptance).toBe(false);
  });

  it('requires a waiver and review bound to the exact cases including labels', () => {
    const corpus = { cases: [item('new', 'New operator draft')], reviewWorkflow: OPERATOR_REVIEW_WORKFLOW,
      nativeAuthorshipWaived: true, waiverStatement: 'Actual waiver statement',
      operatorLanguageReview: { status: 'approved', statement: 'Actual operator wording feedback',
        casesSha256: operatorReviewCasesSha256([item('new', 'New operator draft')]) } };
    expect(validateFreshCorpus(corpus, []).operatorWorkflow.languageReviewComplete).toBe(true);
    for (const change of [{ nativeAuthorshipWaived: false }, { waiverStatement: '' },
      { reviewWorkflow: 'unknown' }, { operatorLanguageReview: { ...corpus.operatorLanguageReview, statement: '' } },
      { operatorLanguageReview: { ...corpus.operatorLanguageReview, casesSha256: 'a'.repeat(64) } },
      { cases: [{ ...corpus.cases[0], intent: 'needs_llm' }] },
      { operatorLanguageReview: { status: 'pending', statement: 'Approval cannot be pending', casesSha256: null } }]) {
      expect(() => validateFreshCorpus({ ...corpus, ...change }, [])).toThrow();
    }
  });

  it('keeps accuracy, family count and latency gates after wording approval', () => {
    const operatorWorkflow = { workflow: OPERATOR_REVIEW_WORKFLOW, languageReviewComplete: true };
    const rows = Array.from({ length: 150 }, (_, index) => row(`case-${index}`, `family-${index}`));
    const options = { threshold: 0.8, policy: 'core', plannedRequests: 150, complete: true, operatorWorkflow };
    expect(assessFreshExploration(rows, rows, options)).toMatchObject({ classificationGatePassed: true,
      nativeReviewedCases: 0, productionAcceptance: false });
    const repeated = rows.map(value => ({ ...value, item: { ...value.item, familyId: 'one-family' } }));
    expect(assessFreshExploration(repeated, repeated, options).reasons).toContain('fewer_than_150_independent_question_families');
    const unsafe = rows.map((value, index) => index === 1 ? { ...value,
      item: { ...value.item, intent: 'write_request', isWrite: true }, durationMs: 1000 } : { ...value, durationMs: 1000 });
    const result = assessFreshExploration(unsafe, unsafe, options);
    expect(result.reasons).toContain('accepted_wrong_question');
    expect(result.reasons).toContain('write_accepted_as_read');
    expect(result.reasons).toContain('warm_classification_p95_over_500ms_or_unknown');
    expect(result.classificationGatePassed).toBe(false);
  });
});
