import { isDeepStrictEqual } from 'node:util';

// Transport/pacing code may change between legs; classification and eligibility
// must stay frozen. Historical reports keep the hashes of every source they used.
export const CONTINUATION_SOURCES = Object.freeze([
  'scripts/chatbot-budget.mjs', 'scripts/chatbot-jev.mjs', 'scripts/chatbot-jev-accuracy.mjs',
  'packages/server/src/modules/chat/schoolReplyTemplates.ts',
  'packages/server/src/modules/chat/schoolListReplies.ts',
  'packages/server/src/modules/chat/schoolReplyLanguage.ts',
  'packages/server/src/modules/chat/schoolReplyWrite.ts',
]);

const units = (usd) => Math.ceil(usd * 1e9);
const validCost = (usd) => Number.isFinite(usd) && usd >= 0 && Number.isSafeInteger(units(usd));
const fail = (message) => { throw new Error(`Invalid Jev continuation: ${message}`); };

/** Reconstruct attempts/costs from raw rows, never from a known-cost-only sum. */
export function prepareContinuation({ previous, expected, runCases, repetitions,
  maxRequests, budgetUsd, requestReserveUsd, retainUnknownCosts = false }) {
  const totalPlannedRequests = runCases.length * repetitions;
  let priorAttempts = 0;
  let reportedCostUsd = 0;
  let observedUnits = 0;
  let reservedUnits = 0;
  let unknownAttempts = 0;
  const priorReports = [];
  const transportChanges = [];
  for (const entry of previous) {
    const { report, path, sha256 } = entry;
    if (!report || !Array.isArray(report.samples) || !report.samples.length
      || !/^[a-f0-9]{64}$/.test(sha256)) fail('missing samples or report hash');
    for (const key of ['model', 'endpoint', 'corpusSha256', 'requestShape', 'intentWordingVersion',
      'split', 'gateThreshold', 'acceptancePolicy', 'repetitions']) {
      if (!isDeepStrictEqual(report[key], expected[key])) fail(`${key} changed`);
    }
    if ((report.queryGuardVersion ?? 0) !== (expected.queryGuardVersion ?? 0)) fail('query guard version changed');
    if ((report.unreviewedDevelopment ?? false) !== (expected.unreviewedDevelopment ?? false)) fail('development review mode changed');
    const frozenSources = [...CONTINUATION_SOURCES, ...(expected.nativeCollection ? ['scripts/chatbot-jev-native.mjs'] : [])];
    if ([3, 4].includes(expected.queryGuardVersion)) frozenSources.push('scripts/chatbot-jev-query-guard-v3.mjs',
      'scripts/chatbot-jev-count-guard-v2.mjs', 'scripts/chatbot-jev-count-guard.mjs');
    if (expected.queryGuardVersion === 4) frozenSources.push('scripts/chatbot-jev-query-guard-v4.mjs');
    for (const source of frozenSources) {
      if (!expected.sourceSha256[source] || report.sourceSha256?.[source] !== expected.sourceSha256[source]) {
        fail(`frozen source changed: ${source}`);
      }
    }
    if (expected.nativeCollection && !isDeepStrictEqual(report.nativeCollection, expected.nativeCollection)) {
      fail('native collection changed');
    }
    if (report.sourceSha256?.['scripts/chatbot-jev-probe.mjs'] !== expected.sourceSha256['scripts/chatbot-jev-probe.mjs']) {
      transportChanges.push(path);
    }
    // The first pre-pacing report omitted skippedRequests/totalPlannedRequests.
    if ((report.skippedRequests ?? 0) !== priorAttempts
      || (report.totalPlannedRequests ?? totalPlannedRequests) !== totalPlannedRequests
      || report.plannedRequests !== totalPlannedRequests - priorAttempts) fail('reports are not a contiguous schedule');
    if (report.continuation && !isDeepStrictEqual(report.continuation.priorReports?.map(row => row.sha256),
      priorReports.map(row => row.sha256))) fail('earlier report chain is missing or changed');

    const reserve = report.requestReserveUsd;
    if (!validCost(reserve) || reserve <= 0 || reserve !== requestReserveUsd) fail('request reservation changed or invalid');
    let legObservedUnits = 0;
    let legUnknown = 0;
    for (const sample of report.samples) {
      const item = runCases[priorAttempts % runCases.length];
      const repetition = Math.floor(priorAttempts / runCases.length) + 1;
      if (priorAttempts >= totalPlannedRequests || sample.id !== item.id || sample.repetition !== repetition) {
        fail('attempts were duplicated, reordered or omitted');
      }
      if (sample.reportedCostUsd === null) legUnknown++;
      else {
        if (!validCost(sample.reportedCostUsd)) fail('invalid reported cost');
        legObservedUnits += units(sample.reportedCostUsd);
        reportedCostUsd += sample.reportedCostUsd;
      }
      priorAttempts++;
    }
    const snapshot = report.estimatedBudget;
    if (snapshot?.inFlight !== 0 || snapshot.requestsSettled !== report.samples.length
      || snapshot.requestsWithUnknownCost !== legUnknown
      || snapshot.requestReserveUsd !== reserve
      || Math.round(snapshot.observedEstimatedUsd * 1e9) !== legObservedUnits
      || Math.round(snapshot.reservedUsd * 1e9) !== legUnknown * units(reserve)) {
      fail('raw attempts do not match their settled budget snapshot');
    }
    observedUnits += legObservedUnits;
    reservedUnits += legUnknown * units(reserve);
    unknownAttempts += legUnknown;
    priorReports.push({ path, sha256, attempts: report.samples.length });
  }
  if (previous.length && (budgetUsd > previous[0].report.budgetUsd || maxRequests > previous[0].report.maxRequests)) {
    fail('cumulative allowance exceeds the original run');
  }
  const remainingUnits = Math.floor(budgetUsd * 1e9) - observedUnits - reservedUnits;
  const remainingRequestAllowance = maxRequests - priorAttempts;
  const blockReasons = [];
  if (unknownAttempts && !retainUnknownCosts) blockReasons.push('retain_unknown_costs_not_acknowledged');
  if (remainingUnits < units(requestReserveUsd)) blockReasons.push('insufficient_remaining_estimated_budget');
  if (remainingRequestAllowance <= 0) blockReasons.push('max_requests_reached');
  if (priorAttempts >= totalPlannedRequests) blockReasons.push('schedule_complete');
  return {
    priorReports, transportChanges, priorAttempts,
    priorReportedCostUsd: reportedCostUsd,
    priorObservedEstimatedUsd: observedUnits / 1e9,
    retainedUnknownReservationUsd: reservedUnits / 1e9,
    priorUnknownAttempts: unknownAttempts,
    retainUnknownCosts,
    remainingRequestAllowance: Math.max(0, remainingRequestAllowance),
    remainingEstimatedBudgetUsd: Math.max(0, remainingUnits) / 1e9,
    remainingPlannedRequests: Math.max(0, totalPlannedRequests - priorAttempts),
    nextAttempt: priorAttempts < totalPlannedRequests ? {
      id: runCases[priorAttempts % runCases.length].id,
      repetition: Math.floor(priorAttempts / runCases.length) + 1,
    } : null,
    readyToDispatch: blockReasons.length === 0,
    blockReasons,
    note: 'Earlier unknown costs remain reserved, not settled as zero. Explicit continuation does not retry earlier failures or prove provider availability. Allowances are cumulative client stops, not billing caps.',
  };
}

export function cumulativeAccounting(continuation, samples, snapshot) {
  return {
    attempts: continuation.priorAttempts + samples.length,
    reportedCostUsd: continuation.priorReportedCostUsd
      + samples.reduce((total, row) => total + (row.reportedCostUsd ?? 0), 0),
    observedEstimatedUsd: (Math.round(continuation.priorObservedEstimatedUsd * 1e9)
      + Math.round(snapshot.observedEstimatedUsd * 1e9)) / 1e9,
    retainedUnknownReservationUsd: (Math.round(continuation.retainedUnknownReservationUsd * 1e9)
      + Math.round(snapshot.reservedUsd * 1e9)) / 1e9,
    unknownAttempts: continuation.priorUnknownAttempts + snapshot.requestsWithUnknownCost,
    costComplete: continuation.priorUnknownAttempts + snapshot.requestsWithUnknownCost === 0,
  };
}
