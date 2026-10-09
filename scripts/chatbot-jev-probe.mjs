/**
 * Jev Stage A: classification only. Sends synthetic corpus text to OpenRouter's
 * Decisions API and never calls the school app, a school tool or a chat model.
 * Live runs require --max-requests and --request-reserve-usd. Validate offline
 * with: bun scripts/chatbot-jev-probe.mjs --validate
 */
import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createEstimatedBudget } from './chatbot-budget.mjs';
import { assessFreshExploration, validateFreshCorpus, validateRegressionCorpus } from './chatbot-jev-accuracy.mjs';
import { compareQueryGuardV3 } from './chatbot-jev-query-guard-v3.mjs';
import { compareQueryGuardV4 } from './chatbot-jev-query-guard-v4.mjs';
import { CONTINUATION_SOURCES, cumulativeAccounting, prepareContinuation } from './chatbot-jev-resume.mjs';
import { NATIVE_PREVIOUS_CORPORA, assessNativeStudy, validateNativeHeldout } from './chatbot-jev-native.mjs';
import { buildDecisionRequestV4 } from './chatbot-jev-wording-v4.mjs';
import {
  INTENT_WORDING_VERSION, JEV_DECISIONS_URL, JEV_MODEL, buildDecisionRequest, chooseThreshold, groupBy, labelBaseCase, latency,
  parseDecision, stability, summarize, templateIntent, validateAcceptancePolicy, validateCases,
} from './chatbot-jev.mjs';

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const entry = args.find((value) => value.startsWith(`--${name}=`));
  return entry ? entry.slice(name.length + 3) : fallback;
};
const writeWordingVersion = Number(option('write-wording-version', '3'));
if (![3, 4].includes(writeWordingVersion)) throw new Error('Use write-wording-version=3 or 4');
const connectionReuse = option('connection-reuse', 'default');
if (!['default', 'off'].includes(connectionReuse)) throw new Error('Use connection-reuse=default or off');
const queryGuardVersion = Number(option('query-guard-version', '0'));
if (![0, 3, 4].includes(queryGuardVersion)) throw new Error('Use query-guard-version=0, 3 or 4');
const buildProbeRequest = writeWordingVersion === 4 ? buildDecisionRequestV4 : buildDecisionRequest;
const casesPath = resolve(option('cases', 'datasets/chatbot-latency/jev-intents.json'));
const corpusText = await Bun.file(casesPath).text();
const corpus = JSON.parse(corpusText);
if (corpus.purpose !== undefined && !['fresh-exploratory', 'native-heldout', 'regression-recheck'].includes(corpus.purpose)) {
  throw new Error('Unsupported corpus purpose; native intake/review worksheets use the offline native-intake CLI');
}
if (corpus.purpose !== 'native-heldout' && Array.isArray(corpus.cases) && corpus.cases.some(item =>
  ['real_user', 'native_author'].includes(item?.source) || item && ['reviewStatus', 'reviewBlind', 'authorId', 'reviewerId']
    .some(field => Object.hasOwn(item, field)))) {
  throw new Error('Human intake fields require a validated native-heldout export; removing its purpose does not bypass review');
}
const baseText = corpus.baseCorpus ? await Bun.file(resolve(corpus.baseCorpus)).text() : '';
const cases = validateCases([...(baseText ? JSON.parse(baseText).cases.map(labelBaseCase) : []), ...corpus.cases]);
const acceptancePolicy = validateAcceptancePolicy(option('acceptance-policy', 'full'));
let freshness = null;
let nativeCollection = null;
let regressionCollection = null;
if (corpus.purpose === 'regression-recheck') {
  const referenceText = await Bun.file(resolve(corpus.reference?.corpus ?? '')).text();
  if (createHash('sha256').update(referenceText).digest('hex') !== corpus.reference?.corpusSha256) throw new Error('Regression reference changed');
  regressionCollection = validateRegressionCorpus(corpus, JSON.parse(referenceText));
  if (corpus.acceptancePolicy !== acceptancePolicy) throw new Error('Use the acceptance policy frozen in the regression corpus');
}
if (corpus.purpose === 'native-heldout') {
  if (corpus.acceptancePolicy !== acceptancePolicy) throw new Error('Use the acceptance policy frozen in the native export');
  const previousCases = [];
  const previousCorpusSha256 = {};
  for (const path of NATIVE_PREVIOUS_CORPORA) {
    const text = await Bun.file(resolve(path)).text();
    previousCases.push(...JSON.parse(text).cases);
    previousCorpusSha256[path] = createHash('sha256').update(text).digest('hex');
  }
  nativeCollection = validateNativeHeldout(corpus, previousCases, { previousCorpusSha256 });
}
if (corpus.purpose === 'fresh-exploratory') {
  const previousCases = [];
  for (const path of corpus.previousCorpora ?? []) previousCases.push(...(await Bun.file(resolve(path)).json()).cases);
  if (!previousCases.length) throw new Error('Fresh exploration requires previous corpora for duplicate checks');
  freshness = validateFreshCorpus(corpus, previousCases);
  if (freshness.operatorWorkflow && corpus.acceptancePolicy !== acceptancePolicy) {
    throw new Error('Use the acceptance policy frozen in the operator-reviewed draft');
  }
}
// Dev-only runs tune the intent wording without looking at the held-out questions.
const splitOption = option('split', 'all');
if (!['all', 'dev', 'test'].includes(splitOption)) throw new Error('Use split=all, dev or test');
const runCases = splitOption === 'all' ? cases : cases.filter((item) => item.split === splitOption);
if (!runCases.length) throw new Error('No cases selected');
if (writeWordingVersion === 4 && (nativeCollection || runCases.some(item => item.split !== 'dev' || item.source !== 'assistant'))) {
  throw new Error('Candidate write wording v4 requires assistant-authored dev-only cases');
}
// Jev acts only where School's renderers reply: French, Arabic and Darija (both scripts).
const TEMPLATE_LANGUAGES = ['fr', 'ar', 'ary', 'ary-latn'];
const gateThreshold = Number(option('gate-threshold', '0.8'));
if (!(gateThreshold > 0 && gateThreshold <= 1)) throw new Error('Use gate-threshold in (0, 1]');
const sourceSha256 = {};
for (const path of ['scripts/chatbot-jev-probe.mjs', 'scripts/chatbot-budget.mjs',
  'scripts/chatbot-jev.mjs', 'scripts/chatbot-jev-accuracy.mjs', 'scripts/chatbot-jev-resume.mjs', 'scripts/chatbot-jev-native.mjs', 'packages/server/src/modules/chat/replies/schoolReplyTemplates.ts',
  'packages/server/src/modules/chat/replies/schoolListReplies.ts', 'packages/server/src/modules/chat/replies/schoolReplyLanguage.ts',
  'packages/server/src/modules/chat/replies/schoolReplyWrite.ts', ...CONTINUATION_SOURCES]) {
  sourceSha256[path] = createHash('sha256').update(await Bun.file(resolve(path)).text()).digest('hex');
}
if ([3, 4].includes(queryGuardVersion)) for (const path of ['scripts/chatbot-jev-query-guard-v3.mjs',
  'scripts/chatbot-jev-count-guard-v2.mjs', 'scripts/chatbot-jev-count-guard.mjs']) {
  sourceSha256[path] = createHash('sha256').update(await Bun.file(path).text()).digest('hex');
}
if (queryGuardVersion === 4) sourceSha256['scripts/chatbot-jev-query-guard-v4.mjs'] = createHash('sha256')
  .update(await Bun.file('scripts/chatbot-jev-query-guard-v4.mjs').text()).digest('hex');
if (writeWordingVersion === 4) sourceSha256['scripts/chatbot-jev-wording-v4.mjs'] = createHash('sha256')
  .update(await Bun.file(resolve('scripts/chatbot-jev-wording-v4.mjs')).text()).digest('hex');

// Today's deterministic matcher, read from source, is the baseline Jev has to beat.
const { schoolReplyTemplate } = await import('../packages/server/src/modules/chat/replies/schoolReplyTemplates.ts');
const { schoolReplyLanguage } = await import('../packages/server/src/modules/chat/replies/schoolReplyLanguage.ts');
const baseline = cases.map((item) => {
  const detectedLanguage = schoolReplyLanguage(item.query);
  const intent = templateIntent(schoolReplyTemplate({ userText: item.query, language: detectedLanguage, channel: 'web' }, '2026-2027'));
  return { id: item.id, language: item.language, detectedLanguage, split: item.split, label: item.intent, intent };
});
const unreviewedDevelopment = args.includes('--unreviewed-development');
if (unreviewedDevelopment && (corpus.purpose !== 'fresh-exploratory'
  || freshness?.operatorWorkflow?.languageReviewComplete !== false
  || runCases.some(item => item.source !== 'assistant'))) {
  throw new Error('Unreviewed development requires an explicitly waived, pending assistant draft corpus');
}
if (args.includes('--validate')) {
  console.log(JSON.stringify({ valid: true, cases: cases.length, runCases: runCases.length,
    acceptancePolicy,
    writeWordingVersion,
    freshness,
    nativeCollection,
    regressionCollection,
    queryGuardVersion,
    unreviewedDevelopment,
    uniqueQueries: new Set(cases.map((item) => item.query.trim())).size, baselineMatches: baseline.filter((row) => row.intent !== 'needs_llm').length }));
  process.exit(0);
}

const repetitions = Number(option('repetitions', '3'));
if (freshness?.operatorWorkflow && !freshness.operatorWorkflow.languageReviewComplete && !unreviewedDevelopment) {
  throw new Error('Confirm the drafted Darija wording before paid classification; offline --validate remains available');
}
const budgetUsd = Number(option('budget-usd', '0.05'));
const timeoutMs = Number(option('timeout-ms', '10000'));
const maxRequests = Number(option('max-requests', '0'));
const requestReserveUsd = Number(option('request-reserve-usd', '0'));
const intervalMs = Number(option('interval-ms', '0'));
if (Number(option('skip-requests', '0')) !== 0) {
  throw new Error('Use --resume-report for verified continuation instead of --skip-requests');
}
if (!Number.isInteger(repetitions) || repetitions < 1 || repetitions > 5
  || !(budgetUsd > 0 && budgetUsd <= 0.25) || !Number.isInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 30000) {
  throw new Error('Use repetitions=1..5, budget-usd up to 0.25 and timeout-ms=1000..30000');
}
if (!Number.isSafeInteger(maxRequests) || maxRequests < 1 || maxRequests > 5000) {
  throw new Error('Declare --max-requests=1..5000 for live Jev calls');
}
if (!Number.isFinite(requestReserveUsd) || requestReserveUsd <= 0 || requestReserveUsd > budgetUsd) {
  throw new Error('Declare a positive --request-reserve-usd no greater than --budget-usd');
}
const totalPlannedRequests = runCases.length * repetitions;
if (!Number.isSafeInteger(intervalMs) || intervalMs < 0 || intervalMs > 10000) {
  throw new Error('Use interval-ms=0..10000');
}
const experiment = {
  model: JEV_MODEL, endpoint: JEV_DECISIONS_URL,
  corpusSha256: createHash('sha256').update(corpusText).update(baseText).digest('hex'),
  requestShape: buildProbeRequest('<query>'), intentWordingVersion: INTENT_WORDING_VERSION, writeWordingVersion,
  sourceSha256, split: splitOption, gateThreshold, acceptancePolicy, repetitions, nativeCollection,
  queryGuardVersion,
  unreviewedDevelopment,
};
const previous = [];
for (const argument of args.filter(value => value.startsWith('--resume-report='))) {
  const path = resolve(argument.slice('--resume-report='.length));
  const reportText = await Bun.file(path).text();
  previous.push({ path, sha256: createHash('sha256').update(reportText).digest('hex'), report: JSON.parse(reportText) });
}
const continuation = prepareContinuation({ previous, expected: experiment, runCases, repetitions,
  maxRequests, budgetUsd, requestReserveUsd, retainUnknownCosts: args.includes('--retain-unknown-costs') });
if (args.includes('--preflight')) {
  console.log(JSON.stringify({ offline: true, ...experiment, totalPlannedRequests,
    maxRequests, budgetUsd, requestReserveUsd, intervalMs, connectionReuse, continuation }, null, 2));
  process.exit(continuation.readyToDispatch ? 0 : 1);
}
if (!continuation.readyToDispatch) throw new Error(`Continuation blocked: ${continuation.blockReasons.join(', ')}`);
const skipRequests = continuation.priorAttempts;
const localMaxRequests = continuation.remainingRequestAllowance;
const budget = createEstimatedBudget(continuation.remainingEstimatedBudgetUsd, requestReserveUsd);
const key = process.env.OPENROUTER_API_KEY;
if (!key) throw new Error('OPENROUTER_API_KEY is not set; pass --env-file=apps/dashboard/.env.local');
const outputPath = resolve(option('output', `docs/evidence/chatbot-latency/jev-probe-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}.json`));
if (await Bun.file(outputPath).exists()) throw new Error('Output already exists; choose a fresh --output path');

async function keyUsage() {
  // A failed ledger read must not discard the attempt/budget evidence.
  try {
    const response = await fetch('https://openrouter.ai/api/v1/key', {
      headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(timeoutMs),
      ...(connectionReuse === 'off' ? { keepalive: false } : {}),
    });
    if (!response.ok) return { status: response.status };
    const { data } = await response.json();
    return { capturedAt: new Date().toISOString(), usage: data?.usage ?? null,
      limit: data?.limit ?? null, limitRemaining: data?.limit_remaining ?? null };
  } catch (error) {
    return { error: String(error?.message ?? error).slice(0, 200) };
  }
}

// Metadata only, through the same established endpoint/key path as live runs.
// This mode sends no question and refuses an absent/exhausted provider limit.
if (args.includes('--key-precheck')) {
  const ledger = await keyUsage();
  const ready = Number.isFinite(ledger.limit) && ledger.limit > 0
    && Number.isFinite(ledger.limitRemaining) && ledger.limitRemaining >= budgetUsd;
  await writeFile(outputPath, `${JSON.stringify({ mode: 'key-precheck', classifierRequests: 0,
    readyForBudget: ready, budgetUsd, connectionReuse, ledger }, null, 2)}\n`, { flag: 'wx' });
  console.log(JSON.stringify({ mode: 'key-precheck', classifierRequests: 0, readyForBudget: ready, budgetUsd, ledger }));
  process.exit(ready ? 0 : 1);
}

async function classify(item) {
  const body = JSON.stringify(buildProbeRequest(item.query));
  const start = performance.now();
  let reportedCostUsd = null;
  let httpStatus = null;
  let retryAfter = null;
  let rateLimitHeaders = null;
  let providerError = null;
  try {
    const response = await fetch(JEV_DECISIONS_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body,
      signal: AbortSignal.timeout(timeoutMs),
      ...(connectionReuse === 'off' ? { keepalive: false } : {}),
    });
    httpStatus = response.status;
    retryAfter = response.headers.get('retry-after');
    rateLimitHeaders = Object.fromEntries(['x-ratelimit-limit', 'x-ratelimit-remaining', 'x-ratelimit-reset']
      .map(name => [name, response.headers.get(name)?.slice(0, 200) ?? null]));
    const text = await response.text();
    const durationMs = performance.now() - start;
    let data;
    try { data = JSON.parse(text); } catch (error) { if (response.ok) throw error; }
    if (!response.ok) {
      const metadata = data?.error?.metadata;
      providerError = Object.fromEntries(['error_type', 'provider_code', 'limit_source', 'reason']
        .map(name => [name, typeof metadata?.[name] === 'string' ? metadata[name].slice(0, 200)
          : Number.isFinite(metadata?.[name]) ? metadata[name] : null]));
    }
    // Preserve valid reported cost even when the decision or HTTP result fails.
    if (Number.isFinite(data?.usage?.cost) && data.usage.cost >= 0) reportedCostUsd = data.usage.cost;
    if (!response.ok) return { durationMs, reportedCostUsd, httpStatus, retryAfter, rateLimitHeaders, providerError,
      error: `HTTP ${response.status}: ${text.slice(0, 200)}` };
    return { durationMs, reportedCostUsd, httpStatus, retryAfter, rateLimitHeaders, providerError, decision: parseDecision(data) };
  } catch (error) {
    return { durationMs: performance.now() - start, reportedCostUsd, httpStatus, retryAfter, rateLimitHeaders, providerError,
      error: String(error?.message ?? error).slice(0, 200) };
  }
}

const report = {
  capturedAt: new Date().toISOString(),
  ...experiment,
  languageGateSource: 'School reply profile applied to query text, not fixture language labels',
  freshness,
  nativeCollection,
  regressionCollection,
  productionAcceptance: false,
  budgetUsd,
  maxRequests,
  requestReserveUsd,
  allowanceScope: 'cumulative',
  continuation,
  intervalMs,
  connectionReuse,
  skippedRequests: skipRequests,
  totalPlannedRequests,
  plannedRequests: totalPlannedRequests - skipRequests,
  limitations: [
    'Latency is measured from this machine through OpenRouter, including TLS and network time.',
    'Cases and intent wording were written by the same author; the dev/test split is not an independent evaluation.',
    'Synthetic single-turn questions only: no follow-ups, conversation history or real school traffic.',
    'Classification only: no reply, tool or template ran, so answer correctness is not measured.',
    'Language/regex gate summaries project synthetic first-turn eligibility only; role/history, readiness selection and tool execution are not exercised.',
  ],
  keyUsageBefore: await keyUsage(),
  samples: [],
  stoppedReason: null,
};
let spentUsd = 0;
let ordinal = 0;
let previousStart = null;
outer: for (let repetition = 1; repetition <= repetitions; repetition++) {
  for (const item of runCases) {
    if (ordinal++ < skipRequests) continue;
    if (report.samples.length >= localMaxRequests) {
      report.stoppedReason = 'max_requests_reached';
      break outer;
    }
    const reservationId = `${repetition}:${item.id}`;
    try { budget.reserve(reservationId); } catch (error) {
      if (!budget.stopped) throw error;
      report.stoppedReason = budget.snapshot().stoppedReason;
      break outer;
    }
    if (previousStart !== null && intervalMs > 0) {
      const remaining = intervalMs - (performance.now() - previousStart);
      if (remaining > 0) await new Promise(resolve => setTimeout(resolve, remaining));
    }
    previousStart = performance.now();
    const result = await classify(item);
    const knownCost = result.reportedCostUsd !== null;
    budget.settle(reservationId, { pricingFound: knownCost, totalCost: result.reportedCostUsd });
    if (knownCost) spentUsd += result.reportedCostUsd;
    report.samples.push({ id: item.id, repetition, ...result });
    if (budget.stopped) {
      report.stoppedReason = budget.snapshot().stoppedReason;
      break outer;
    }
    if (result.httpStatus === 429) {
      report.stoppedReason = 'provider_rate_limited';
      break outer;
    }
  }
  console.error(`repetition ${repetition}: ${report.samples.length} samples, $${spentUsd.toFixed(6)}`);
}
report.estimatedBudget = {
  ...budget.snapshot(),
  settlementSource: 'Valid provider-reported usage.cost, including failed decisions; missing/invalid cost retains its reservation and stops dispatch.',
};
report.cumulativeAccounting = cumulativeAccounting(continuation, report.samples, budget.snapshot());
report.keyUsageAfter = await keyUsage();

const byId = new Map(cases.map((item) => [item.id, item]));
const rows = report.samples.map((sample) => ({ ...sample, item: byId.get(sample.id) }));
// The first request pays connection setup; it stays in the raw samples and the all-requests latency.
const warm = rows.slice(1);
const grid = [0.5, 0.6, 0.7, 0.8, 0.85, 0.9, 0.95, 0.97, 0.99];
const split = groupBy(rows, (row) => row.item.split);
const thresholds = {
  raw: chooseThreshold(split.dev ?? [], { grid, policy: acceptancePolicy }),
  guarded: chooseThreshold(split.dev ?? [], { grid, guarded: true, policy: acceptancePolicy }),
};
const scored = (samples, threshold, guarded) => threshold === null ? null : {
  all: summarize(samples, threshold, guarded, acceptancePolicy),
  byLanguage: Object.fromEntries(Object.entries(groupBy(samples, (row) => row.item.language))
    .map(([language, group]) => [language, summarize(group, threshold, guarded, acceptancePolicy)])),
};
const baselineScore = (subset) => {
  const deterministic = subset.filter((row) => row.label !== 'needs_llm');
  const matched = subset.filter((row) => row.intent !== 'needs_llm');
  return {
    cases: subset.length,
    matched: matched.length,
    wrong: matched.filter((row) => row.intent !== row.label).map((row) => `${row.id} -> ${row.intent}`),
    coverage: deterministic.length ? deterministic.filter((row) => row.intent === row.label).length / deterministic.length : null,
  };
};
const testRows = split.test ?? [];
const baselineById = new Map(baseline.map(item => [item.id, item]));
const testLanguageEligible = testRows.filter(row => baselineById.get(row.item.id)?.detectedLanguage != null);
const testJevCandidates = testLanguageEligible.filter(row => baselineById.get(row.item.id)?.intent === 'needs_llm');
report.summary = {
  evaluationUse: unreviewedDevelopment ? 'unreviewed-assistant-development' : 'declared-corpus-evaluation',
  semanticQueryGuard: queryGuardVersion === 4 ? compareQueryGuardV4(testJevCandidates, { threshold: gateThreshold, policy: acceptancePolicy })
    : queryGuardVersion === 3 ? compareQueryGuardV3(testJevCandidates, { threshold: gateThreshold, policy: acceptancePolicy }) : null,
  nativeStudy: nativeCollection ? assessNativeStudy(rows, testJevCandidates, { threshold: gateThreshold,
    policy: acceptancePolicy, plannedRequests: report.plannedRequests, complete: !report.stoppedReason }) : null,
  exploration: freshness ? assessFreshExploration(rows, testJevCandidates, { threshold: gateThreshold,
    policy: acceptancePolicy, plannedRequests: report.plannedRequests, complete: !report.stoppedReason,
    operatorWorkflow: freshness.operatorWorkflow }) : null,
  gate: {
    threshold: gateThreshold,
    guarded: true,
    test: scored(testRows, gateThreshold, true),
    testTemplateLanguages: scored(testRows.filter((row) => TEMPLATE_LANGUAGES.includes(row.item.language)), gateThreshold, true)?.all ?? null,
    testAfterLanguageGate: scored(testLanguageEligible, gateThreshold, true)?.all ?? null,
    testAfterLanguageAndRegexGate: scored(testJevCandidates, gateThreshold, true)?.all ?? null,
    languageSkippedCases: baseline.filter(item => item.split === 'test' && TEMPLATE_LANGUAGES.includes(item.language)
      && item.detectedLanguage === null).map(item => item.id),
    dev: scored(split.dev ?? [], gateThreshold, true),
  },
  reportedCostUsd: spentUsd,
  requestsWithKnownCost: rows.filter((row) => row.reportedCostUsd !== null).length,
  requestsWithUnknownCost: rows.filter((row) => row.reportedCostUsd === null).length,
  costComplete: rows.length > 0 && rows.every((row) => row.reportedCostUsd !== null),
  costNote: 'reportedCostUsd sums known usage.cost only, including failed decisions. Unknown cost is not zero; reservations are estimates, not a provider billing cap. Key ledger reads are separate observations.',
  inputTokens: rows.reduce((total, row) => total + (row.decision?.inputTokens ?? 0), 0),
  errors: rows.filter((row) => row.error).map((row) => `${row.id}#${row.repetition}: ${row.error}`),
  latencyAllMs: latency(rows),
  latencyWarmMs: latency(warm),
  latencyByLanguageMs: Object.fromEntries(Object.entries(groupBy(warm, (row) => row.item.language)).map(([language, group]) => [language, latency(group)])),
  stability: stability(rows),
  thresholds,
  curve: grid.map((threshold) => ({ threshold, dev: summarize(split.dev ?? [], threshold, false, acceptancePolicy),
    test: summarize(split.test ?? [], threshold, false, acceptancePolicy) })),
  test: { raw: scored(split.test ?? [], thresholds.raw, false), guarded: scored(split.test ?? [], thresholds.guarded, true) },
  regexBaseline: {
    all: baselineScore(baseline),
    test: baselineScore(baseline.filter((row) => row.split === 'test')),
    byLanguage: Object.fromEntries(Object.entries(groupBy(baseline, (row) => row.language)).map(([language, group]) => [language, baselineScore(group)])),
  },
};
if (unreviewedDevelopment && report.summary.exploration) {
  report.summary.exploration.mode = 'unreviewed-assistant-development';
  report.summary.exploration.classificationGatePassed = false;
  report.summary.exploration.reasons.push('unreviewed_development_run_not_qualification');
  report.limitations.push('Explicitly authorized assistant development run; operator wording review remains pending. Not untouched held-out or runtime acceptance.');
}
await Bun.write(outputPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ output: outputPath, samples: rows.length, reportedCostUsd: spentUsd, thresholds,
  costComplete: report.summary.costComplete, requestsWithUnknownCost: report.summary.requestsWithUnknownCost,
  latencyWarmMs: report.summary.latencyWarmMs, errors: report.summary.errors.length, stoppedReason: report.stoppedReason }, null, 2));
if (report.stoppedReason || report.summary.errors.length) process.exitCode = 1;
