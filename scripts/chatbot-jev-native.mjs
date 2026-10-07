import { createHash } from 'node:crypto';
import { canonicalQuestion } from './chatbot-jev-accuracy.mjs';
import { ACCEPTANCE_POLICIES, INTENT_NAMES, accepts, latency, summarize, validateAcceptancePolicy, validateCases } from './chatbot-jev.mjs';

export const NATIVE_LANGUAGES = Object.freeze(['fr', 'ar', 'ary', 'ary-latn']);
export const NATIVE_PREVIOUS_CORPORA = Object.freeze([
  'datasets/chatbot-latency/questions.json', 'datasets/chatbot-latency/jev-intents.json',
  'datasets/chatbot-latency/jev-core-exploration.json',
  'datasets/chatbot-latency/jev-count-guard-dev.json',
  'datasets/chatbot-latency/jev-moroccan-development.json',
]);
const identifier = value => typeof value === 'string' && /^[a-zA-Z0-9._-]{1,100}$/.test(value);
const optionalId = value => value == null || identifier(value);
const optionalBoolean = value => value == null || typeof value === 'boolean';
const hashCases = cases => createHash('sha256').update(JSON.stringify(cases)).digest('hex');
const fail = (id, reason) => { throw new Error(`Invalid native intake ${id}: ${reason}`); };
const REVIEW_FIELDS = ['intent', 'isWrite', 'reviewerId', 'reviewedAt', 'reviewStatus', 'reviewBlind', 'reviewQuestionSha256'];
const WORKSHEET_VIEW_FIELDS = ['id', 'query', 'language', 'familyId'];

/** Binds the reviewed question/context, excluding labels, predictions and reviewer declarations. */
export function nativeReviewQuestionSha256(item) {
  const question = [item.id, item.query, item.language, item.familyId, item.split, item.source,
    item.authorId ?? null, item.authoredAt ?? null, item.authorNativeDarijaSpeaker ?? null,
    item.anonymization?.confirmed, item.anonymization?.notes];
  return createHash('sha256').update(JSON.stringify(question)).digest('hex');
}

const questionsSha256 = cases => createHash('sha256')
  .update(JSON.stringify(cases.map(item => [item.id, nativeReviewQuestionSha256(item)]))).digest('hex');

function timestamp(value, id) {
  if (value == null) return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)
    || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 19) !== value.slice(0, 19)) {
    fail(id, 'use a real UTC timestamp or null');
  }
  return Date.parse(value);
}

/** Offline collection checks. Human provenance fields are declarations, not identity verification. */
export function inspectNativeIntake(corpus, previousCases, { now = Date.now() } = {}) {
  if (corpus?.version !== 1 || corpus.purpose !== 'native-intake' || !Array.isArray(corpus.cases)
    || !Array.isArray(previousCases) || !previousCases.length || !Number.isFinite(now)) fail('(corpus)', 'missing collection or previous cases');
  const policy = validateAcceptancePolicy(corpus.acceptancePolicy);
  const oldIds = new Set(previousCases.map(item => item.id));
  const oldQueries = new Set(previousCases.map(item => canonicalQuestion(item.query)));
  const oldFamilies = new Set(previousCases.map(item => item.familyId).filter(Boolean));
  const ids = new Set();
  const queries = new Set();
  const familySplits = new Map();
  const familyLabels = new Map();
  const blockedCases = [];
  for (const item of corpus.cases) {
    if (!item || !identifier(item.id) || ids.has(item.id) || !identifier(item.familyId)
      || typeof item.query !== 'string' || !item.query.trim() || item.query.length > 4000
      || !NATIVE_LANGUAGES.includes(item.language) || !['dev', 'test'].includes(item.split)
      || !['real_user', 'native_author', 'assistant'].includes(item.source)
      || !['pending', 'agreed', 'disputed'].includes(item.reviewStatus)
      || !optionalId(item.authorId) || !optionalId(item.reviewerId)
      || !optionalBoolean(item.authorNativeDarijaSpeaker) || !optionalBoolean(item.reviewBlind)
      || item.reviewQuestionSha256 != null && (typeof item.reviewQuestionSha256 !== 'string' || !/^[a-f0-9]{64}$/.test(item.reviewQuestionSha256))
      || !item.anonymization || typeof item.anonymization.confirmed !== 'boolean'
      || typeof item.anonymization.notes !== 'string' || item.anonymization.notes.length > 1000) {
      fail(item?.id ?? '(case)', 'invalid fields or duplicate ID');
    }
    const query = canonicalQuestion(item.query);
    if (!query || queries.has(query)) fail(item.id, 'empty or duplicate canonical query');
    if (item.split === 'test' && (oldIds.has(item.id) || oldQueries.has(query) || oldFamilies.has(item.familyId))) {
      fail(item.id, 'held-out case reuses a spent ID, query or family');
    }
    if (familySplits.has(item.familyId) && familySplits.get(item.familyId) !== item.split) fail(item.id, 'family crosses dev/test');
    if (item.source === 'assistant' && item.authorNativeDarijaSpeaker === true) fail(item.id, 'assistant authorship cannot be native');
    ids.add(item.id);
    queries.add(query);
    familySplits.set(item.familyId, item.split);
    if (item.intent != null || item.isWrite != null) validateCases([item]);
    if (item.reviewStatus === 'agreed') {
      validateCases([item]);
      if (familyLabels.has(item.familyId) && familyLabels.get(item.familyId) !== item.intent) fail(item.id, 'linked family labels disagree');
      familyLabels.set(item.familyId, item.intent);
    }
    const authored = timestamp(item.authoredAt, item.id);
    const reviewed = timestamp(item.reviewedAt, item.id);
    if (authored > now || reviewed > now || authored !== null && reviewed !== null && reviewed < authored) {
      fail(item.id, 'review/collection timestamps are out of order or in the future');
    }
    if (item.split === 'test') {
      const reasons = [];
      if (item.source === 'assistant') reasons.push('test_not_human_authored');
      if (!item.authorId || authored === null) reasons.push('author_record_missing');
      if (item.reviewStatus !== 'agreed') reasons.push('review_not_agreed');
      if (!item.reviewerId || reviewed === null) reasons.push('review_record_missing');
      if (item.authorId && item.authorId === item.reviewerId) reasons.push('reviewer_is_author');
      if (item.reviewBlind !== true) reasons.push('blind_review_not_declared');
      if (item.reviewQuestionSha256 !== nativeReviewQuestionSha256(item)) reasons.push('review_not_bound_to_current_question');
      if (!item.anonymization.confirmed) reasons.push('anonymization_not_confirmed');
      if (reasons.length) blockedCases.push({ id: item.id, reasons });
    }
  }
  const test = corpus.cases.filter(item => item.split === 'test');
  const blockedIds = new Set(blockedCases.map(item => item.id));
  const reviewed = test.filter(item => !blockedIds.has(item.id));
  const supportedFamilies = new Set(reviewed.filter(item => ACCEPTANCE_POLICIES[policy].includes(item.intent)).map(item => item.familyId)).size;
  const native = reviewed.filter(item => ['ary', 'ary-latn'].includes(item.language) && item.authorNativeDarijaSpeaker === true);
  const writesByLanguage = Object.fromEntries(NATIVE_LANGUAGES.map(language => [language,
    new Set(reviewed.filter(item => item.language === language && item.isWrite).map(item => item.familyId)).size]));
  const byIntent = Object.fromEntries(INTENT_NAMES.map(intent => [intent, reviewed.filter(item => item.intent === intent).length]));
  const blockers = [];
  if (!test.length) blockers.push('no_held_out_cases');
  if (blockedCases.length) blockers.push('held_out_provenance_or_review_incomplete');
  if (supportedFamilies < 150) blockers.push('fewer_than_150_reviewed_supported_families');
  if (native.length < 40) blockers.push('fewer_than_40_declared_native_darija_arabizi_cases');
  for (const language of NATIVE_LANGUAGES) {
    if (writesByLanguage[language] < 30) blockers.push(`fewer_than_30_reviewed_write_families:${language}`);
  }
  for (const intent of [...ACCEPTANCE_POLICIES[policy], 'needs_llm']) {
    if (!byIntent[intent]) blockers.push(`missing_reviewed_intent:${intent}`);
  }
  return { purpose: 'native-intake', acceptancePolicy: policy, cases: corpus.cases.length,
    heldOutCases: test.length, reviewedHeldOutCases: reviewed.length,
    reviewedSupportedFamilies: supportedFamilies, declaredNativeAuthoredReviewedCases: native.length,
    reviewedWriteFamiliesByLanguage: writesByLanguage, reviewedCasesByIntent: byIntent,
    blockedCaseCount: blockedCases.length, blockedCases: blockedCases.slice(0, 100),
    blockedCasesTruncated: blockedCases.length > 100,
    readyForExport: blockers.length === 0, blockers,
    provenance: 'Declared human intake records; author/reviewer identities and truth of attestations are not verified by this tool',
    productionAcceptance: false,
  };
}

export function buildNativeReviewWorksheet(corpus) {
  if (!corpus.cases.length || corpus.cases.some(item => !item.anonymization.confirmed)) {
    throw new Error('Collect and anonymize actual questions before exporting a review worksheet');
  }
  const binding = questionsSha256(corpus.cases);
  const opaque = (kind, value) => `${kind}-${createHash('sha256').update(JSON.stringify([kind, binding, value])).digest('hex').slice(0, 24)}`;
  const cases = corpus.cases.map(item => ({ id: opaque('q', nativeReviewQuestionSha256(item)), query: item.query, language: item.language,
    familyId: opaque('f', item.familyId), reviewQuestionSha256: nativeReviewQuestionSha256(item),
    intent: null, isWrite: null, reviewerId: null, reviewedAt: null, reviewStatus: 'pending', reviewBlind: null }))
    .sort((a, b) => a.id.localeCompare(b.id));
  if (new Set(cases.map(item => item.id)).size !== cases.length) throw new Error('Review identifier collision; do not export');
  if (new Set(cases.map(item => item.familyId)).size !== new Set(corpus.cases.map(item => item.familyId)).size) {
    throw new Error('Review family identifier collision; do not export');
  }
  return { version: 3, purpose: 'native-review-worksheet', acceptancePolicy: corpus.acceptancePolicy,
    questionsSha256: binding,
    note: 'Opaque question/family identifiers and hashed ordering; original IDs, author/split metadata, labels and model results omitted. Import against the original intake; IDs are mapped from its bound context.',
    intentChoices: INTENT_NAMES,
    cases };
}

/** Imports only declared review fields from an unchanged worksheet; never manufactures a review. */
export function importNativeReviews(corpus, worksheet, previousCases, { now = Date.now() } = {}) {
  inspectNativeIntake(corpus, previousCases, { now });
  if (worksheet?.version !== 3 || worksheet.purpose !== 'native-review-worksheet'
    || worksheet.acceptancePolicy !== corpus.acceptancePolicy
    || worksheet.questionsSha256 !== questionsSha256(corpus.cases)
    || !Array.isArray(worksheet.intentChoices) || JSON.stringify(worksheet.intentChoices) !== JSON.stringify(INTENT_NAMES)
    || !Array.isArray(worksheet.cases) || worksheet.cases.length !== corpus.cases.length || !worksheet.cases.length) {
    throw new Error('Review worksheet is unbound, stale or from a different collection; export a new worksheet');
  }
  const expected = buildNativeReviewWorksheet(corpus);
  const originalsByHash = new Map(corpus.cases.map(item => [nativeReviewQuestionSha256(item), item]));
  const original = new Map(expected.cases.map(row => [row.id, originalsByHash.get(row.reviewQuestionSha256)]));
  const views = new Map(expected.cases.map(row => [row.id, row]));
  const imported = new Map();
  for (const row of worksheet.cases) {
    const item = original.get(row?.id);
    if (!item || imported.has(item.id) || Object.keys(row).some(field => ![...WORKSHEET_VIEW_FIELDS, ...REVIEW_FIELDS].includes(field))
      || WORKSHEET_VIEW_FIELDS.some(field => row[field] !== views.get(row.id)[field])
      || row.reviewQuestionSha256 !== nativeReviewQuestionSha256(item)
      || !['pending', 'agreed', 'disputed'].includes(row.reviewStatus)) {
      throw new Error('Review worksheet has edited questions, unexpected fields or duplicate/missing IDs');
    }
    const review = Object.fromEntries(REVIEW_FIELDS.map(field => [field, row[field] ?? null]));
    if (row.reviewStatus === 'pending') {
      imported.set(item.id, structuredClone(item));
      continue;
    }
    if (row.reviewStatus === 'agreed' && (!identifier(row.reviewerId) || row.reviewerId === item.authorId
      || timestamp(row.reviewedAt, row.id) === null || row.reviewBlind !== true)) {
      throw new Error('An agreed imported review requires a different reviewer, timestamp and declared blind review');
    }
    if (item.reviewStatus !== 'pending' && REVIEW_FIELDS.some(field => (item[field] ?? null) !== review[field])) {
      throw new Error('Review import would replace an existing completed review; resolve it explicitly without overwriting its history');
    }
    imported.set(item.id, { ...structuredClone(item), ...review });
  }
  const result = { ...structuredClone(corpus), cases: corpus.cases.map(item => imported.get(item.id)) };
  inspectNativeIntake(result, previousCases, { now });
  return result;
}

export function exportNativeHeldout(corpus, previousCases, { intakeSha256, previousCorpusSha256, now = Date.now() }) {
  const collection = inspectNativeIntake(corpus, previousCases, { now });
  if (!collection.readyForExport) throw new Error(`Native collection is not ready: ${collection.blockers.join(', ')}`);
  if (!/^[a-f0-9]{64}$/.test(intakeSha256) || NATIVE_PREVIOUS_CORPORA.some(path => !/^[a-f0-9]{64}$/.test(previousCorpusSha256?.[path]))) {
    throw new Error('Native export requires intake and previous-corpus hashes');
  }
  const cases = structuredClone(corpus.cases.filter(item => item.split === 'test'));
  return { version: 1, purpose: 'native-heldout', acceptancePolicy: corpus.acceptancePolicy,
    exportedAt: new Date(now).toISOString(), previousCorpora: [...NATIVE_PREVIOUS_CORPORA],
    intakeSha256, previousCorpusSha256: { ...previousCorpusSha256 }, casesSha256: hashCases(cases),
    collection, cases, productionAcceptance: false };
}

export function validateNativeHeldout(corpus, previousCases, { now = Date.now(), previousCorpusSha256 } = {}) {
  if (corpus?.purpose !== 'native-heldout' || corpus.baseCorpus || !Array.isArray(corpus.cases)
    || !corpus.cases.length || corpus.cases.some(item => item.split !== 'test')
    || corpus.casesSha256 !== hashCases(corpus.cases) || !/^[a-f0-9]{64}$/.test(corpus.intakeSha256)
    || !Array.isArray(corpus.previousCorpora) || corpus.previousCorpora.length !== NATIVE_PREVIOUS_CORPORA.length
    || NATIVE_PREVIOUS_CORPORA.some((path, index) => corpus.previousCorpora[index] !== path
      || !/^[a-f0-9]{64}$/.test(corpus.previousCorpusSha256?.[path])
      || corpus.previousCorpusSha256[path] !== previousCorpusSha256?.[path])
    || timestamp(corpus.exportedAt, '(export)') === null || Date.parse(corpus.exportedAt) > now) {
    throw new Error('Native held-out export is incomplete, changed or based on different previous corpora');
  }
  const collection = inspectNativeIntake({ ...corpus, purpose: 'native-intake' }, previousCases, { now });
  if (!collection.readyForExport) throw new Error(`Native held-out collection is not ready: ${collection.blockers.join(', ')}`);
  return collection;
}

/** Numerical classification gate only; intake declarations do not authorize runtime enablement. */
export function assessNativeStudy(rows, candidates, { threshold, policy, plannedRequests, complete }) {
  const stats = summarize(candidates, threshold, true, policy);
  const families = new Set(candidates.filter(row => accepts(row.decision, threshold, true, policy)).map(row => row.item.familyId)).size;
  const warm = latency(rows.slice(1));
  const reasons = [];
  if (!complete || rows.length !== plannedRequests || rows.some(row => row.error)) reasons.push('incomplete_or_failed_run');
  if (stats.wrongCaseCount) reasons.push('accepted_wrong_question');
  if (stats.writeAnsweredAsRead) reasons.push('write_accepted_as_read');
  if (stats.acceptedCases < 150) reasons.push('fewer_than_150_unique_accepted_questions');
  if (families < 150) reasons.push('fewer_than_150_accepted_families');
  if (warm.p95 == null || warm.p95 > 500) reasons.push('warm_classification_p95_over_500ms_or_unknown');
  return { mode: 'native-heldout', candidateSummary: stats, acceptedFamilies: families,
    latencyWarmMs: warm, classificationGatePassed: reasons.length === 0, reasons, productionAcceptance: false,
    note: 'Human provenance remains declared and needs audit. Classification checks do not validate complete replies, runtime readiness, roles, tools or data-handling acceptance.' };
}
