import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import { jevSyntheticCases } from '@sms/server/jev-cases';
import { percentile } from './chatbot-stream.mjs';

export function fullChatProtocol(continuationPath) {
  const orders = [['off', 'on', 'shadow'], ['on', 'shadow', 'off'], ['shadow', 'off', 'on'],
    ['off', 'shadow', 'on'], ['shadow', 'on', 'off'], ['on', 'off', 'shadow']];
  const protocol = { version: 2, purpose: 'synthetic-integration-comparison-with-bounded-billing-observation', assistantAuthored: true,
    independentQualification: false, cases: jevSyntheticCases,
    jobs: jevSyntheticCases.flatMap((item, index) => orders[index % orders.length].map(mode => ({ caseId: item.id, mode }))),
    maxChats: 72, maxClassifications: 48, maxCombinedEstimatedUsd: 0.25,
    generationReserveUsd: 0.003, classificationReserveUsd: 0.00015, classificationMaxUsd: 0.0072,
    retries: 0, concurrency: 1, startSpacingMs: 2000, threshold: 0.8, timeoutMs: 800,
    billingMode: 'observe', billingTimeoutMs: 5000,
    cachePolicy: 'same process, balanced mode order, caches retained and recorded',
    costPolicy: 'Opt-in synthetic billing observation lets started requests finish under a separate 5s limit without delaying fallback. SDK generation estimates and response-reported classifier costs are separate; aggregate key delta is not an isolated per-mode invoice. Await terminal billing outside reply timing; unknown costs stop dispatch.',
    stopOn: ['unknown_cost', 'request_limit', 'combined_estimate_limit', 'provider_key_delta_limit', 'request_error', 'process_change', 'accepted_wrong'],
    restoresMode: 'off', sourceHashes: sourceHashes() };
  if (!continuationPath) return protocol;
  const bytes = readFileSync(continuationPath);
  const prior = JSON.parse(bytes.toString('utf8'));
  const { sourceHashes: _oldHashes, sourceFingerprint: _oldFingerprint, ...oldProtocol } = prior.protocol;
  const { sourceHashes: _newHashes, ...expected } = protocol;
  const count = prior.chatsDispatched;
  if (!isDeepStrictEqual(oldProtocol, expected) || prior.status !== 'stopped'
    || prior.stoppedReason !== 'Scoped chat tool failed' || prior.modeRestoredOff !== true
    || !Number.isSafeInteger(count) || count <= 0 || count >= protocol.maxChats || prior.rows.length !== count
    || !isDeepStrictEqual(prior.rows.map(({ caseId, mode }) => ({ caseId, mode })), protocol.jobs.slice(0, count))
    || prior.rows.some(row => !row.done || row.errors.length || row.aborted)
    || prior.generationBudget?.requestsSettled !== count || prior.generationBudget.requestsWithUnknownCost
    || prior.generationBudget.inFlight || prior.generationBudget.reservedUsd || prior.generationBudget.stoppedReason
    || !Number.isFinite(prior.generationBudget.observedEstimatedUsd) || prior.generationBudget.observedEstimatedUsd < 0
    || !prior.attempts.length || prior.attempts.some(attempt => !Number.isFinite(attempt.costUsd) || attempt.costUsd < 0 || attempt.outcome === 'pending')
    || !Number.isFinite(prior.aggregateKeyDeltaUsd) || prior.aggregateKeyDeltaUsd < 0
    || prior.rows.some(row => row.generationEstimate?.pricingFound !== true
      || !Number.isFinite(row.generationEstimate.totalCost) || row.generationEstimate.totalCost < 0))
    throw new Error('Continuation requires a terminal known-cost prefix stopped by a fixture tool failure');
  const classificationUsd = prior.attempts.reduce((sum, attempt) => sum + attempt.costUsd, 0);
  const carriedUsd = Math.max(prior.aggregateKeyDeltaUsd, classificationUsd + prior.generationBudget.observedEstimatedUsd);
  const remaining = value => Math.floor(value * 1e9) / 1e9;
  protocol.continuation = { reportPath: continuationPath, sha256: createHash('sha256').update(bytes).digest('hex'),
    completedChats: count, completedClassifications: prior.attempts.length, carriedUsd,
    originalMaxChats: protocol.maxChats, originalMaxClassifications: protocol.maxClassifications,
    originalMaxCombinedEstimatedUsd: protocol.maxCombinedEstimatedUsd,
    note: 'Only undispatched jobs; failed reply retained. Fresh process and repaired fixture permissions change cache/permission conditions.' };
  protocol.jobs = protocol.jobs.slice(count);
  protocol.maxChats -= count;
  protocol.maxClassifications = Math.min(protocol.maxClassifications - prior.attempts.length,
    protocol.jobs.filter(job => job.mode !== 'off').length);
  protocol.classificationMaxUsd = remaining(protocol.classificationMaxUsd - classificationUsd);
  protocol.maxCombinedEstimatedUsd = remaining(protocol.maxCombinedEstimatedUsd - carriedUsd);
  if (protocol.maxClassifications !== protocol.jobs.filter(job => job.mode !== 'off').length
    || protocol.classificationMaxUsd <= 0 || protocol.maxCombinedEstimatedUsd <= protocol.classificationMaxUsd)
    throw new Error('Continuation has insufficient remaining limits');
  return protocol;
}
export function sourceHashes() {
  const dir = 'packages/server/src/modules/chat';
  const names = readdirSync(dir, { withFileTypes: true }).filter(entry => /^jev/i.test(entry.name)).flatMap(entry =>
    entry.isDirectory() ? readdirSync(`${dir}/${entry.name}`).map(name => `${dir}/${entry.name}/${name}`) : [`${dir}/${entry.name}`]);
  const files = [...names, 'package.json', 'bun.lock', 'packages/server/package.json',
    'packages/server/src/config/chatbotConfig.ts', 'packages/server/src/config/yearScope.ts',
    'packages/server/src/config/ragConfig.ts', 'packages/server/src/config/coreConfig.ts',
    'packages/server/src/modules/chat/chatYearContext.ts', 'packages/server/src/modules/chat/SchoolChatContextProvider.ts',
    'packages/server/src/modules/chat/schoolReplyTemplates.ts', 'packages/server/src/modules/chat/schoolListReplies.ts',
    'packages/server/src/modules/chat/schoolReplyLanguage.ts', 'packages/server/src/modules/chat/schoolReplyWrite.ts',
    'scripts/chatbot-jev-full-chat.mjs', 'scripts/chatbot-jev-full-chat-lib.mjs'];
  return Object.fromEntries(files.sort().map(name => [name, createHash('sha256').update(readFileSync(name)).digest('hex')]));
}
export function fingerprint(hashes) { return createHash('sha256').update(JSON.stringify(hashes)).digest('hex'); }
export function checkSource(protocol) {
  const { sourceFingerprint: _sourceFingerprint, ...declared } = protocol;
  if (!isDeepStrictEqual(declared, fullChatProtocol(protocol.continuation?.reportPath))) throw new Error('Benchmark source or protocol changed; prepare a new frozen protocol');
}
export function checkBase(value) {
  const url = new URL(value);
  if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || !['http:', 'https:'].includes(url.protocol)
    || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('Use a local app origin');
  return url;
}
export function checkReady(status, protocol) {
  if (!status?.instanceId || status.markedLocalFixture !== true || status.syntheticOnly !== true
    || status.mode !== 'off' || status.frameworkPreparationEnabled !== false
    || status.threshold !== protocol.threshold || status.timeoutMs !== protocol.timeoutMs
    || status.billingMode !== protocol.billingMode || status.billingTimeoutMs !== protocol.billingTimeoutMs
    || status.guardVersion !== 5 || status.intentWordingVersion !== 3
    || status.budget?.requests !== 0 || status.budget.unknownCosts !== 0 || status.budget.pendingRequests !== 0
    || status.budget.maxRequests !== protocol.maxClassifications
    || status.budget.maxCostUsd !== protocol.classificationMaxUsd
    || status.budget.unknownReserveUsd !== protocol.classificationReserveUsd) throw new Error('Require a fresh marked fixture with the exact declared limits');
}
export function checkScopedRead(tool, response) {
  if (response?.result?.isError || response?.error || !Array.isArray(response?.result?.content)
    || !response.result.content.some(item => item.type === 'text' && typeof item.text === 'string'))
    throw new Error(`Scoped fixture read failed: ${tool}`);
}
export function summarizeFullChat(rows) {
  const group = list => {
    const valid = list.filter(row => row.done && !row.errors?.length && !row.aborted
      && !row.diagnostics?.tools?.some(tool => tool.outcome === 'error' || tool.outcome === 'blocked')
      && Number.isFinite(row.firstTextMs) && Number.isFinite(row.completionMs) && row.text?.trim());
    const timing = key => ({ mean: valid.length ? valid.reduce((sum, row) => sum + row[key], 0) / valid.length : null,
      p50: percentile(valid.map(row => row[key]), 50), p95: percentile(valid.map(row => row[key]), 95) });
    return { attempts: list.length, valid: valid.length, firstTextMs: timing('firstTextMs'), completionMs: timing('completionMs'),
      jevTemplates: valid.filter(row => row.diagnostics?.reply?.label?.startsWith('jev:')).length,
      regexTemplates: valid.filter(row => row.diagnostics?.reply?.source === 'template' && !row.diagnostics.reply.label?.startsWith('jev:')).length,
      modelReplies: valid.filter(row => row.diagnostics?.reply?.source === 'model').length };
  };
  const complete = row => row.done && !row.errors?.length && !row.aborted && row.text?.trim()
    && !row.diagnostics?.tools?.some(tool => tool.outcome === 'error' || tool.outcome === 'blocked')
    && Number.isFinite(row.firstTextMs) && Number.isFinite(row.completionMs);
  const pairedFallbacks = rows.filter(row => complete(row) && row.mode === 'on' && row.diagnostics?.reply?.source === 'model')
    .flatMap(on => {
      const off = rows.find(row => complete(row) && row.caseId === on.caseId && row.mode === 'off' && row.diagnostics?.reply?.source === 'model');
      return off ? [{ caseId: on.caseId, firstTextDeltaMs: on.firstTextMs - off.firstTextMs,
        completionDeltaMs: on.completionMs - off.completionMs }] : [];
    });
  return { all: group(rows), modes: Object.fromEntries(['off', 'on', 'shadow'].map(mode => [mode, group(rows.filter(row => row.mode === mode))])),
    pairedFallbacks, fallbackCompletionDeltaP95Ms: percentile(pairedFallbacks.map(row => row.completionDeltaMs), 95),
    qualification: false, note: 'Small assistant-authored integration sample; no independent native accuracy or rollout qualification.' };
}
