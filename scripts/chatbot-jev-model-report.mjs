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
if (segments.some(run => run.protocol.purpose !== 'two-model-jev-parallel-comparison')) throw Error('Require the frozen two-model comparison');
const run = { ...segments.at(-1), protocol: segments[0].protocol,
  rows: segments.flatMap(segment => segment.rows), attempts: segments.flatMap(segment => segment.attempts),
  chatsDispatched: segments.reduce((sum, segment) => sum + segment.chatsDispatched, 0) };
if (new Set(run.rows.map(row => `${row.caseId}/${row.model}/${row.mode}`)).size !== run.rows.length)
  throw Error('Duplicate arm/case dispatch; do not hide retries');
const calls = usageInputs.flatMap(input => input.bytes.toString('utf8').trim().split(/\r?\n/u).filter(Boolean).map(line => JSON.parse(line)));
const byId = new Set();
if (calls.some(call => !call.generationId || byId.has(call.generationId) || !byId.add(call.generationId)))
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
    generationReportedCostUsd: known.reduce((sum, call) => sum + call.usage.cost, 0),
    classifierReportedCostUsd: classifier?.costUsd ?? null, classifierAttempted: Boolean(classifier),
    totalReportedCostUsd: callsComplete && (!classifier || Number.isFinite(classifier.costUsd))
      ? known.reduce((sum, call) => sum + call.usage.cost, 0) + (classifier?.costUsd ?? 0) : null };
});
const accountedIds = new Set(rows.flatMap(row => row.generationCalls.map(call => call.generationId)));
const arms = run.protocol.models.flatMap(model => ['off', 'on'].map(mode => {
  const list = rows.filter(row => row.model === model && row.mode === mode);
  const summary = summarizeFullChat(list).all;
  const allKnown = list.length > 0 && list.every(row => row.totalReportedCostUsd !== null);
  const total = allKnown ? list.reduce((sum, row) => sum + row.totalReportedCostUsd, 0) : null;
  return { model, mode, ...summary, generationCalls: list.reduce((sum, row) => sum + row.generationCalls.length, 0),
    reportedCostComplete: allKnown, totalReportedCostUsd: total,
    observedAverageCostUsd: total === null ? null : total / list.length,
    projectedCostPer1000SimilarChatsUsd: total === null ? null : total / list.length * 1000,
    providers: [...new Set(list.flatMap(row => row.generationCalls.map(call => call.provider)))],
    classifierAttempts: list.filter(row => row.classifierAttempted).length };
}));
const models = Object.fromEntries(run.protocol.models.map(model => {
  const summary = summarizeFullChat(rows.filter(row => row.model === model));
  return [model, summary];
}));
const classifications = run.attempts.map(attempt => ({ ...attempt,
  expected: rows.find(row => row.correlationId === attempt.correlationId)?.expectedIntent }));
const report = { status: run.status, stoppedReason: run.stoppedReason ?? null, qualification: false,
  source: { runs: runInputs.map(({ path, bytes }) => ({ path, sha256: createHash('sha256').update(bytes).digest('hex') })),
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
    'Parallel Jev policy; this does not test the proposed Jev-first scheduling tradeoff.'] };
writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ output: outPath, status: report.status, totalChats: report.totalChats,
  arms, unaccountedGenerationIds: report.unaccountedGenerationIds.length }));
