import { createHash } from 'node:crypto';
import { accepts, latency, summarize, validateCases } from './chatbot-jev.mjs';

export const OPERATOR_REVIEW_WORKFLOW = 'assistant-draft-operator-review';
export const operatorReviewCasesSha256 = cases => createHash('sha256').update(JSON.stringify(cases)).digest('hex');

/** Previously evaluated questions, explicitly reused to test a changed profile. */
export function validateRegressionCorpus(corpus, reference) {
  const cases = validateCases(corpus.cases);
  if (corpus.purpose !== 'regression-recheck' || !reference || !Array.isArray(reference.cases)
    || !cases.length || cases.some(item => item.source !== 'assistant')
    || corpus.reference?.casesSha256 !== operatorReviewCasesSha256(reference.cases)
    || operatorReviewCasesSha256(cases) !== corpus.reference.casesSha256
    || corpus.acceptancePolicy !== reference.acceptancePolicy) {
    throw new Error('Regression corpus must preserve the exact previously reviewed cases and policy');
  }
  const operatorWorkflow = validateOperatorWorkflow(corpus, cases);
  if (!operatorWorkflow?.languageReviewComplete) throw new Error('Regression recheck needs the existing wording approval');
  return { mode: 'same-corpus-regression', cases: cases.length,
    families: new Set(cases.map(item => item.familyId)).size, operatorWorkflow,
    freshHeldout: false, productionAcceptance: false };
}

/** Explicit alternative to native collection: assistant labels plus operator wording review. */
function validateOperatorWorkflow(corpus, cases) {
  if (corpus.reviewWorkflow === undefined && corpus.operatorLanguageReview === undefined) return null;
  const review = corpus.operatorLanguageReview;
  if (corpus.reviewWorkflow !== OPERATOR_REVIEW_WORKFLOW || corpus.nativeAuthorshipWaived !== true
    || typeof corpus.waiverStatement !== 'string' || !corpus.waiverStatement.trim()
    || !review || !['pending', 'approved'].includes(review.status)) {
    throw new Error('Operator review requires an explicit authorship waiver and pending/approved wording review');
  }
  if (review.status === 'pending' && (review.statement !== null || review.casesSha256 !== null)
    || review.status === 'approved' && (typeof review.statement !== 'string' || !review.statement.trim()
      || review.casesSha256 !== operatorReviewCasesSha256(cases))) {
    throw new Error('Operator wording review is incomplete or bound to different cases');
  }
  return { workflow: OPERATOR_REVIEW_WORKFLOW, nativeAuthorshipRequired: false,
    languageReviewComplete: review.status === 'approved', labels: 'assistant-provisional',
    nativeReviewedCases: 0 };
}

/** Conservative freshness check: punctuation, casing and diacritics are not new questions. */
export function canonicalQuestion(query) {
  return query.normalize('NFKD').toLowerCase().replace(/\p{M}/gu, '')
    .replace(/[\p{P}\p{S}\u0640]+/gu, ' ').replace(/\s+/gu, ' ').trim();
}

export function validateFreshCorpus(corpus, previousCases) {
  const cases = validateCases(corpus.cases);
  const oldIds = new Set(previousCases.map(item => item.id));
  const oldQueries = new Set(previousCases.map(item => canonicalQuestion(item.query)));
  const seen = new Set();
  for (const item of cases) {
    const query = canonicalQuestion(item.query);
    if (item.split !== 'test' || !item.familyId || item.source !== 'assistant'
      || oldIds.has(item.id) || oldQueries.has(query) || seen.has(query)) {
      throw new Error(`Fresh corpus reuses a question or lacks declared exploratory provenance: ${item.id}`);
    }
    seen.add(query);
  }
  if (!cases.length) throw new Error('Fresh corpus is empty');
  const operatorWorkflow = validateOperatorWorkflow(corpus, cases);
  return { cases: cases.length, families: new Set(cases.map(item => item.familyId)).size,
    nativeReviewedCases: 0,
    ...(operatorWorkflow ? { operatorWorkflow } : {}),
    provenance: operatorWorkflow ? 'Assistant-authored synthetic cases; explicit native-authorship waiver; operator reviews wording, labels remain assistant-provisional'
      : 'Assistant-authored exploratory cases; native review is outstanding' };
}

/** Classification projections only. This synthetic study cannot authorize runtime enablement. */
export function assessFreshExploration(allRows, candidates, { threshold, policy, plannedRequests, complete, operatorWorkflow = null }) {
  const stats = summarize(candidates, threshold, true, policy);
  const accepted = candidates.filter(row => accepts(row.decision, threshold, true, policy));
  const acceptedFamilies = new Set(accepted.map(row => row.item.familyId ?? row.item.id)).size;
  const warm = latency(allRows.slice(1));
  const reasons = [];
  if (!complete || allRows.length !== plannedRequests || allRows.some(row => row.error)) reasons.push('incomplete_or_failed_run');
  if (stats.wrongCaseCount) reasons.push('accepted_wrong_question');
  if (stats.writeAnsweredAsRead) reasons.push('write_accepted_as_read');
  if (stats.acceptedCases < 150) reasons.push('fewer_than_150_unique_accepted_questions');
  if (acceptedFamilies < 150) reasons.push('fewer_than_150_independent_question_families');
  if (warm.p95 == null || warm.p95 > 500) reasons.push('warm_classification_p95_over_500ms_or_unknown');
  const operatorMode = operatorWorkflow?.workflow === OPERATOR_REVIEW_WORKFLOW;
  if (operatorMode) {
    if (operatorWorkflow.languageReviewComplete !== true) reasons.push('operator_darija_review_outstanding');
  } else reasons.push('native_authorship_and_review_outstanding');
  return { mode: operatorMode ? 'operator-reviewed-synthetic' : 'synthetic-exploratory', productionAcceptance: false, reasons,
    ...(operatorMode ? { classificationGatePassed: reasons.length === 0, operatorWorkflow } : {}),
    threshold, acceptancePolicy: policy, candidateSummary: stats, acceptedFamilies,
    nativeReviewedCases: 0, latencyWarmMs: warm,
    note: operatorMode
      ? 'Native authorship was explicitly waived. Wording review does not independently verify assistant labels. Linked variants remain clustered; no native precision bound or runtime acceptance is claimed. Original B0 remains failed.'
      : 'Repetitions and language variants in one family are not independent. Original B0 remains failed; this is not rendered-answer or readiness-race validation.' };
}
