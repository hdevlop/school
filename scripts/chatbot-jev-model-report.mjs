/** Recompute the four-arm comparison using response-reported generation costs. No network requests. */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { summarizeFullChat } from './chatbot-jev-full-chat-lib.mjs';
import { percentile } from './chatbot-stream.mjs';

const [runPath, usagePath, outPath] = process.argv.slice(2);
if (!runPath || !usagePath || !outPath || existsSync(outPath)) throw Error('Supply run, captured usage and a new output file');
const inputs = paths => paths.split(',').map(path => ({ path, bytes: readFileSync(path) }));
const runInputs = inputs(runPath), usageInputs = inputs(usagePath);
const segments = runInputs.map(input => JSON.parse(input.bytes.toString('utf8')));
if (segments.some(run => !['two-model-jev-parallel-comparison', 'coreweave-jev-first-comparison', 'darija-tool-selection-comparison', 'darija-router-20b-repeat', 'darija-router-120b-check', 'darija-router-20b-fix', 'darija-jev-first-router-fix', 'darija-jev-coverage-v6'].includes(run.protocol.purpose))) throw Error('Require the frozen model comparison');
const run = { ...segments.at(-1), protocol: segments[0].protocol,
  rows: segments.flatMap(segment => segment.rows), attempts: segments.flatMap(segment => segment.attempts),
  chatsDispatched: segments.reduce((sum, segment) => sum + segment.chatsDispatched, 0) };
if (new Set(run.rows.map(row => `${row.caseId}/${row.experimentArm ?? `${row.model}/${row.mode}`}`)).size !== run.rows.length)
  throw Error('Duplicate arm/case dispatch; do not hide retries');
const calls = usageInputs.flatMap(input => input.bytes.toString('utf8').trim().split(/\r?\n/u).filter(Boolean).map(line => JSON.parse(line)));
const byId = new Set();
const allowIncompleteCaptures = ['darija-tool-selection-comparison', 'darija-router-20b-repeat', 'darija-router-120b-check'].includes(run.protocol.purpose);
if (calls.some(call => !call.generationId ? !(allowIncompleteCaptures && call.incomplete === true)
  : byId.has(call.generationId) || !byId.add(call.generationId)))
  throw Error('Missing or duplicate generation identifiers; do not double-count billing');
const rows = run.rows.map(row => {
  const start = Date.parse(row.startedAt), end = Date.parse(row.completedAt);
  const generationCalls = calls.filter(call => Date.parse(call.startedAt) >= start && Date.parse(call.startedAt) <= end);
  const classifier = run.attempts.find(attempt => attempt.correlationId === row.correlationId);
  const known = generationCalls.filter(call => Number.isFinite(call.usage?.cost) && call.usage.cost >= 0 && !call.incomplete);
  const expectedCalls = row.diagnostics?.steps?.length;
  const callsComplete = Number.isSafeInteger(expectedCalls) && generationCalls.length === expectedCalls
    && known.length === generationCalls.length && generationCalls.every(call => call.model === row.model);
  return { ...row, generationCalls, providerCostComplete: callsComplete,
    providerMatchesPolicy: row.provider !== 'coreweave-only' || generationCalls.filter(call => call.provider).every(call => call.provider === 'CoreWeave'),
    providerIdentityUnknown: generationCalls.some(call => !call.provider),
    generationReportedCostUsd: known.reduce((sum, call) => sum + call.usage.cost, 0),
    classifierReportedCostUsd: classifier?.costUsd ?? null, classifierAttempted: Boolean(classifier),
    classifierFailed: Boolean(classifier && (classifier.outcome === 'error' || classifier.httpStatus >= 400)),
    totalReportedCostUsd: callsComplete && (!classifier || Number.isFinite(classifier.costUsd))
      ? known.reduce((sum, call) => sum + call.usage.cost, 0) + (classifier?.costUsd ?? 0) : null };
});
const accountedIds = new Set(rows.flatMap(row => row.generationCalls.map(call => call.generationId)));
const declaredArms = run.protocol.arms ?? run.protocol.models.flatMap(model => ['off', 'on'].map(mode => ({ model, mode })));
const arms = declaredArms.map(arm => {
  const { model, mode } = arm;
  const list = rows.filter(row => row.model === model && row.mode === mode && (!arm.experimentArm || row.experimentArm === arm.experimentArm));
  const summary = summarizeFullChat(list).all;
  const completed = list.filter(row => row.done && !row.aborted && !row.errors?.length && Number.isFinite(row.completionMs));
  const streamCompletionMs = { mean: completed.length ? completed.reduce((sum, row) => sum + row.completionMs, 0) / completed.length : null,
    p50: percentile(completed.map(row => row.completionMs), 50), p95: percentile(completed.map(row => row.completionMs), 95) };
  const allKnown = list.length > 0 && list.every(row => row.totalReportedCostUsd !== null);
  const total = allKnown ? list.reduce((sum, row) => sum + row.totalReportedCostUsd, 0) : null;
  return { ...arm, ...summary, completedStreams: completed.length, streamCompletionMs,
    generationCalls: list.reduce((sum, row) => sum + row.generationCalls.length, 0),
    providerPolicyViolations: list.filter(row => !row.providerMatchesPolicy).length,
    providerIdentityUnknownChats: list.filter(row => row.providerIdentityUnknown).length,
    toolFailures: list.filter(row => row.diagnostics?.tools?.some(tool => tool.outcome === 'error' || tool.outcome === 'blocked')).length,
    classifierFailures: list.filter(row => row.classifierFailed).length,
    reportedCostComplete: allKnown, totalReportedCostUsd: total,
    knownReportedCostUsd: list.reduce((sum, row) => sum + row.generationReportedCostUsd, 0)
      + list.filter(row => Number.isFinite(row.classifierReportedCostUsd)).reduce((sum, row) => sum + row.classifierReportedCostUsd, 0),
    costUnknownChats: list.filter(row => row.totalReportedCostUsd === null).length,
    observedAverageCostUsd: total === null ? null : total / list.length,
    projectedCostPer1000SimilarChatsUsd: total === null ? null : total / list.length * 1000,
    providers: [...new Set(list.flatMap(row => row.generationCalls.map(call => call.provider)))],
    classifierAttempts: list.filter(row => row.classifierAttempted).length };
});
const models = Object.fromEntries(run.protocol.models.map(model => {
  const summary = summarizeFullChat(rows.filter(row => row.model === model));
  return [model, summary];
}));
const classifications = run.attempts.map(attempt => ({ ...attempt,
  expected: rows.find(row => row.correlationId === attempt.correlationId)?.expectedIntent }));
const report = { status: run.status, stoppedReason: run.stoppedReason ?? null, qualification: false,
  source: { runs: runInputs.map(({ path, bytes }) => ({ path, sha256: createHash('sha256').update(bytes).digest('hex') })),
    analyzerSha256: createHash('sha256').update(readFileSync('scripts/chatbot-jev-model-report.mjs')).digest('hex'),
    usage: usageInputs.map(({ path, bytes }) => ({ path, sha256: createHash('sha256').update(bytes).digest('hex') })) },
  segments: segments.map(segment => ({ status: segment.status, chats: segment.chatsDispatched,
    stoppedReason: segment.stoppedReason ?? null, sourceFingerprint: segment.protocol.sourceFingerprint,
    continuation: segment.protocol.continuation ?? null })),
  policy: run.protocol.comparisonPolicy, providerPolicy: run.protocol.providerPolicy,
  totalChats: run.chatsDispatched, completedStreams: rows.filter(row => row.done).length,
  capturedGenerationCalls: calls.length, unaccountedGenerationIds: calls.filter(call => !accountedIds.has(call.generationId)).map(call => call.generationId),
  arms, models,
  classifier: { attempts: classifications.length, provisionalMatches: classifications.filter(a => a.choice === a.expected).length,
    selectedTemplates: classifications.filter(a => a.selected === 'template').length,
    acceptedWrong: classifications.filter(a => a.selected === 'template' && a.choice !== a.expected).length,
    knownCostUsd: classifications.filter(a => Number.isFinite(a.costUsd)).reduce((sum, a) => sum + a.costUsd, 0),
    unknownCosts: classifications.filter(a => !Number.isFinite(a.costUsd)).length,
    elapsedP95Ms: percentile(classifications.map(a => a.elapsedMs).filter(Number.isFinite), 95) },
  rows,
  limitations: ['Assistant-authored same-corpus sample; no independent quality qualification.',
    'Provider response usage.cost includes started model calls, including failed answers. No missing costs counted as zero.',
    'Per-1000 figures project this observed mix; they are not a price guarantee.',
    'Different hosts and retained routing caches; these are operational configurations, not a controlled same-host model comparison.',
    ['darija-router-20b-repeat', 'darija-router-120b-check'].includes(run.protocol.purpose) ? 'Existing-router run with Jev off; comparisons with earlier runs have different processes, caches, provider policies and request order. Not a controlled model-only or Jev causal comparison.'
      : run.protocol.arms ? 'Bounded candidate-first is experimental; fallback includes classification wait. One observation per case/arm; repeat under concurrent traffic before rollout.'
      : 'Parallel Jev policy; this does not test the proposed Jev-first scheduling tradeoff.'] };
writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ output: outPath, status: report.status, totalChats: report.totalChats,
  arms, unaccountedGenerationIds: report.unaccountedGenerationIds.length }));
