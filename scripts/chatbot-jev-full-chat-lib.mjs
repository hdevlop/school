import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import { jevSyntheticCases, jevDarijaCases } from '@sms/server/jev-cases';
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
  return continuationPath ? continueProtocol(protocol, continuationPath) : protocol;
}
function continueProtocol(protocol, continuationPath, generationUsagePath) {
  const bytes = readFileSync(continuationPath);
  const prior = JSON.parse(bytes.toString('utf8'));
  const { sourceHashes: _oldHashes, sourceFingerprint: _oldFingerprint, retainModelToolErrors: _oldToolPolicy, ...oldProtocol } = prior.protocol;
  const { sourceHashes: _newHashes, retainModelToolErrors: _newToolPolicy, ...expected } = protocol;
  const count = prior.chatsDispatched;
  if (!isDeepStrictEqual(oldProtocol, expected) || prior.status !== 'stopped'
    || prior.stoppedReason !== 'Scoped chat tool failed' || prior.modeRestoredOff !== true
    || !Number.isSafeInteger(count) || count <= 0 || count >= protocol.maxChats || prior.rows.length !== count
    || !isDeepStrictEqual(prior.rows.map(({ caseId, mode, model }) => model ? { caseId, model, mode } : { caseId, mode }), protocol.jobs.slice(0, count))
    || prior.rows.some(row => !row.done || row.errors.length || row.aborted)
    || prior.generationBudget?.requestsSettled !== count || prior.generationBudget.requestsWithUnknownCost
    || prior.generationBudget.inFlight || prior.generationBudget.reservedUsd || prior.generationBudget.stoppedReason
    || !Number.isFinite(prior.generationBudget.observedEstimatedUsd) || prior.generationBudget.observedEstimatedUsd < 0
    || !prior.attempts.length || prior.attempts.some(attempt => !Number.isFinite(attempt.costUsd) || attempt.costUsd < 0 || attempt.outcome === 'pending')
    || !Number.isFinite(prior.aggregateKeyDeltaUsd) || prior.aggregateKeyDeltaUsd < 0
    || prior.rows.some(row => row.generationEstimate?.pricingFound !== true
      || !Number.isFinite(row.generationEstimate.totalCost) || row.generationEstimate.totalCost < 0))
    throw new Error('Continuation requires a terminal known-cost prefix stopped by a tool failure');
  const classificationUsd = prior.attempts.reduce((sum, attempt) => sum + attempt.costUsd, 0);
  let generationCost = prior.generationBudget.observedEstimatedUsd, generationEvidence;
  if (protocol.models) {
    if (!generationUsagePath || prior.modelRestored !== true) throw Error('Require terminal generation billing and restored fixture model');
    const usageBytes = readFileSync(generationUsagePath);
    const calls = usageBytes.toString('utf8').trim().split(/\r?\n/u).filter(Boolean).map(line => JSON.parse(line));
    if (calls.length !== prior.rows.reduce((sum, row) => sum + row.diagnostics.steps.length, 0)
      || new Set(calls.map(call => call.generationId)).size !== calls.length
      || calls.some(call => !call.generationId || call.incomplete || !Number.isFinite(call.usage?.cost) || call.usage.cost < 0))
      throw Error('Prior generation billing is incomplete');
    generationCost = Math.max(generationCost, calls.reduce((sum, call) => sum + call.usage.cost, 0));
    generationEvidence = { generationUsagePath, generationUsageSha256: createHash('sha256').update(usageBytes).digest('hex') };
  }
  const carriedUsd = Math.max(prior.aggregateKeyDeltaUsd, classificationUsd + generationCost);
  const remaining = value => Math.floor(value * 1e9) / 1e9;
  protocol.continuation = { reportPath: continuationPath, sha256: createHash('sha256').update(bytes).digest('hex'),
    completedChats: count, completedClassifications: prior.attempts.length, carriedUsd,
    originalMaxChats: protocol.maxChats, originalMaxClassifications: protocol.maxClassifications,
    originalMaxCombinedEstimatedUsd: protocol.maxCombinedEstimatedUsd,
    ...generationEvidence,
    note: protocol.models
      ? 'Only undispatched jobs; original model tool failure retained. Fresh process resets routing caches. Subsequent model tool failures are quality outcomes, not permission repairs.'
      : 'Only undispatched jobs; failed reply retained. Fresh process and repaired fixture permissions change cache/permission conditions.' };
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
    'scripts/chatbot-jev-full-chat.mjs', 'scripts/chatbot-jev-full-chat-lib.mjs',
    'scripts/chatbot-provider-observer.mjs'];
  return Object.fromEntries(files.sort().map(name => [name, createHash('sha256').update(readFileSync(name)).digest('hex')]));
}
export function modelComparisonProtocol(continuationPath, generationUsagePath) {
  const protocol = fullChatProtocol();
  const arms = [{ model: 'openai/gpt-oss-120b', mode: 'off' }, { model: 'openai/gpt-oss-120b', mode: 'on' },
    { model: 'openai/gpt-oss-20b', mode: 'off' }, { model: 'openai/gpt-oss-20b', mode: 'on' }];
  const comparison = { ...protocol, purpose: 'two-model-jev-parallel-comparison', models: [...new Set(arms.map(arm => arm.model))],
    jobs: protocol.cases.flatMap((item, index) => [...arms.slice(index % 4), ...arms.slice(0, index % 4)]
      .map(arm => ({ caseId: item.id, ...arm }))), maxChats: 96, generationReserveUsd: 0.0025,
    restoresModel: 'openai/gpt-oss-120b', retainModelToolErrors: true,
    providerPolicy: 'Unchanged School Cerebras preference, fallbacks enabled, Groq excluded. 20B has no listed Cerebras host; this compares operational configurations, not identical-host model speed.',
    comparisonPolicy: 'Current parallel Jev policy, not Jev-first. Shared routing caches retained; rotated model/mode order. Capture actual model/provider/usage.cost through benchmark-only response observer; SDK prices remain estimates.' };
  return continuationPath ? continueProtocol(comparison, continuationPath, generationUsagePath) : comparison;
}
export function firstComparisonProtocol(continuationPath, generationUsagePath, retainRejectedReservation = false) {
  const protocol = fullChatProtocol();
  const arms = [
    { experimentArm: '120b-baseline', model: 'openai/gpt-oss-120b', mode: 'off', strategy: 'parallel', provider: 'cerebras-preferred' },
    { experimentArm: '20b-coreweave-off', model: 'openai/gpt-oss-20b', mode: 'off', strategy: 'parallel', provider: 'coreweave-only' },
    { experimentArm: '20b-coreweave-parallel', model: 'openai/gpt-oss-20b', mode: 'on', strategy: 'parallel', provider: 'coreweave-only' },
    { experimentArm: '20b-coreweave-first', model: 'openai/gpt-oss-20b', mode: 'on', strategy: 'candidate-first', provider: 'coreweave-only' },
  ];
  const comparison = { ...protocol, purpose: 'coreweave-jev-first-comparison', arms,
    models: ['openai/gpt-oss-120b', 'openai/gpt-oss-20b'], experimentEnabled: true,
    jobs: protocol.cases.flatMap((item, index) => [...arms.slice(index % 4), ...arms.slice(0, index % 4)]
      .map(arm => ({ caseId: item.id, ...arm }))), maxChats: 96, generationReserveUsd: 0.0025,
    restoresModel: 'openai/gpt-oss-120b', retainModelToolErrors: true,
    providerPolicy: '120B keeps Cerebras preference/fallbacks/Groq exclusion. Granted 20B arms require CoreWeave only, no fallback and parameter support. Real chats retain the normal policy.',
    comparisonPolicy: 'Rotated four-arm same-process synthetic experiment. Compare 20B off/parallel/candidate-first on the same fixed host against current 120B baseline. Candidate-first may wait 800ms; full stream timings include that wait. Actual response cost capture; no retries.' };
  if (!continuationPath) return comparison;
  if (!retainRejectedReservation || !generationUsagePath) throw Error('Require explicit retained rejection reservation and generation evidence');
  const priorBytes = readFileSync(continuationPath), usageBytes = readFileSync(generationUsagePath);
  const prior = JSON.parse(priorBytes.toString('utf8'));
  const { sourceHashes: _oldHashes, sourceFingerprint: _fingerprint, ...declared } = prior.protocol;
  const { sourceHashes: _newHashes, ...expected } = comparison;
  const count = prior.chatsDispatched;
  const unknown = prior.attempts?.filter(a => a.costUsd === null) ?? [];
  const calls = usageBytes.toString('utf8').trim().split(/\r?\n/u).filter(Boolean).map(line => JSON.parse(line));
  if (!isDeepStrictEqual(declared, expected) || prior.status !== 'stopped'
    || prior.stoppedReason !== 'Classifier terminal cost remains unknown' || prior.modeRestoredOff !== true || prior.modelRestored !== true
    || !Number.isSafeInteger(count) || count <= 0 || count >= comparison.maxChats || prior.rows.length !== count
    || !isDeepStrictEqual(prior.rows.map(({ caseId, experimentArm, model, mode, strategy, provider }) =>
      ({ caseId, experimentArm, model, mode, strategy, provider })), comparison.jobs.slice(0, count))
    || prior.rows.some(row => !row.done || row.errors.length || row.aborted || !row.diagnostics)
    || unknown.length !== 1 || unknown[0].httpStatus !== 529 || unknown[0].outcome !== 'error'
    || unknown[0].transportCompleted !== true || unknown[0].reservedUsd !== comparison.classificationReserveUsd
    || prior.attempts.some(a => a.outcome === 'pending' || a.costUsd !== null && (!Number.isFinite(a.costUsd) || a.costUsd < 0))
    || prior.generationBudget?.requestsSettled !== count || prior.generationBudget.requestsWithUnknownCost || prior.generationBudget.inFlight
    || !Number.isFinite(prior.generationBudget.observedEstimatedUsd) || prior.generationBudget.observedEstimatedUsd < 0
    || prior.attempts.some(a => a.selected === 'template' && a.choice !== prior.rows.find(row => row.correlationId === a.correlationId)?.expectedIntent)
    || calls.length !== prior.rows.reduce((n, row) => n + row.diagnostics.steps.length, 0)
    || new Set(calls.map(c => c.generationId)).size !== calls.length
    || calls.some(c => !c.generationId || c.incomplete || !Number.isFinite(c.usage?.cost) || c.usage.cost < 0)
    || !Number.isFinite(prior.aggregateKeyDeltaUsd) || prior.aggregateKeyDeltaUsd < 0)
    throw Error('Require a completed prefix stopped by exactly one terminal 529; all other costs must be known');
  const classificationCarriedUsd = prior.attempts.reduce((sum, a) => sum + (a.costUsd ?? a.reservedUsd), 0);
  const generationCarriedUsd = Math.max(prior.generationBudget.observedEstimatedUsd, calls.reduce((sum, c) => sum + c.usage.cost, 0));
  const carriedUsd = Math.max(prior.aggregateKeyDeltaUsd, classificationCarriedUsd + generationCarriedUsd);
  const remaining = value => Math.floor(value * 1e9) / 1e9;
  comparison.continuation = { reportPath: continuationPath, sha256: createHash('sha256').update(priorBytes).digest('hex'),
    generationUsagePath, generationUsageSha256: createHash('sha256').update(usageBytes).digest('hex'),
    completedChats: count, completedClassifications: prior.attempts.length, retainedUnknownCosts: 1,
    retainedUnknownReserveUsd: unknown[0].reservedUsd, carriedUsd,
    originalMaxCombinedEstimatedUsd: comparison.maxCombinedEstimatedUsd,
    note: 'Fresh reduced allowance for only undispatched cases after a terminal provider rejection. Original ledger is preserved, not reset or reconciled. Unknown cost stays null and its reservation is deducted from both caps. Another unknown cost stops this continuation; no retries or repeated cases.' };
  comparison.jobs = comparison.jobs.slice(count); comparison.maxChats -= count;
  comparison.maxClassifications -= prior.attempts.length;
  comparison.classificationMaxUsd = remaining(comparison.classificationMaxUsd - classificationCarriedUsd);
  comparison.maxCombinedEstimatedUsd = remaining(comparison.maxCombinedEstimatedUsd - carriedUsd);
  if (comparison.maxClassifications !== comparison.jobs.filter(job => job.mode !== 'off').length
    || comparison.classificationMaxUsd <= 0 || comparison.maxCombinedEstimatedUsd <= comparison.classificationMaxUsd)
    throw Error('Insufficient remaining allowance');
  return comparison;
}
export function fingerprint(hashes) { return createHash('sha256').update(JSON.stringify(hashes)).digest('hex'); }
export function darijaComparisonProtocol(continuationPath, generationUsagePath, routerOnly = false) {
  const protocol = fullChatProtocol();
  const casesPath = 'datasets/chatbot-latency/darija-tool-selection-20261008.json';
  const corpus = JSON.parse(readFileSync(casesPath, 'utf8'));
  if (!isDeepStrictEqual(corpus.cases.map(({ id, query, language, intent, familyId }) =>
    ({ id, query, language, intent, familyId })), jevDarijaCases))
    throw Error('Darija server catalog differs from the frozen reviewed wording');
  const availableArms = [
    { experimentArm: '20b-coreweave-off', model: 'openai/gpt-oss-20b', mode: 'off', strategy: 'parallel', provider: 'coreweave-only' },
    { experimentArm: '20b-coreweave-first', model: 'openai/gpt-oss-20b', mode: 'on', strategy: 'candidate-first', provider: 'coreweave-only' },
    { experimentArm: '20b-coreweave-router-first', model: 'openai/gpt-oss-20b', mode: 'on', strategy: 'router-first', provider: 'coreweave-only' },
  ];
  const arms = routerOnly ? availableArms.slice(0, 1) : availableArms;
  const comparison = { ...protocol, purpose: routerOnly ? 'darija-router-20b-repeat' : 'darija-tool-selection-comparison', cases: corpus.cases, casesPath, arms,
    models: ['openai/gpt-oss-20b'], experimentEnabled: true,
    jobs: corpus.cases.flatMap((item, index) => [...arms.slice(index % arms.length), ...arms.slice(0, index % arms.length)]
      .map(arm => ({ caseId: item.id, ...arm }))),
    maxChats: routerOnly ? 100 : 300, maxClassifications: routerOnly ? 0 : 200, classificationMaxUsd: routerOnly ? 0 : 0.03,
    maxCombinedEstimatedUsd: routerOnly ? 0.10 : protocol.maxCombinedEstimatedUsd,
    startSpacingMs: 1000, generationReserveUsd: 0.0007, restoresModel: 'openai/gpt-oss-120b', retainModelToolErrors: true,
    averageResponseLimitSeconds: 2, primaryMetric: 'correct tools and arguments, by script and family',
    aggregateUsageRequired: false,
    sourceHashes: { ...sourceHashes(), [casesPath]: createHash('sha256').update(readFileSync(casesPath)).digest('hex') },
    providerPolicy: 'Same CoreWeave-only 20B fallback on all three fixed synthetic arms; no provider fallback.',
    comparisonPolicy: routerOnly
      ? 'Fresh repeat of existing router with CoreWeave-only GPT-OSS 20B and Jev off: 100 unchanged reviewed Darija/Arabizi questions, 50 families, no French. Compare with saved runs; separate processes and sequential case order do not establish a controlled Jev effect. No benchmark retries; accuracy first; average below two seconds sufficient.'
      : '100 reused owner-reviewed Darija/Arabizi questions, 50 paired families, three rotated paths; no French. Router-first completes ordinary preparation including context before classification and reuses it on decline. No paid-call retries; accuracy before cost; average full response below two seconds is sufficient.' };
  if (!continuationPath) return comparison;
  if (!generationUsagePath) throw Error('Require preserved generation usage for continuation');
  const runInputs = continuationPath.split(',').map(path => ({ path, bytes: readFileSync(path) }));
  const usageInputs = generationUsagePath.split(',').map(path => ({ path, bytes: readFileSync(path) }));
  if (runInputs.length !== usageInputs.length || runInputs.length > 10) throw Error('Require matching bounded run/usage segments');
  const segments = runInputs.map(input => JSON.parse(input.bytes));
  let offset = 0;
  for (const segment of segments) {
    const count = segment.chatsDispatched;
    const jobs = comparison.jobs.slice(offset, offset + count);
    const unknown = segment.attempts.filter(a => a.costUsd === null);
    if (segment.protocol.purpose !== comparison.purpose
      || !isDeepStrictEqual(segment.protocol.cases, comparison.cases) || !isDeepStrictEqual(segment.protocol.arms, comparison.arms)
      || segment.protocol.maxChats !== comparison.maxChats - offset || (segment.protocol.continuation?.completedChats ?? 0) !== offset
      || !Number.isSafeInteger(count) || count <= 0 || segment.rows.length !== count
      || !isDeepStrictEqual(segment.rows.map(({ caseId, experimentArm, model, mode, strategy, provider }) =>
        ({ caseId, experimentArm, model, mode, strategy, provider })), jobs)
      || segment.status !== 'stopped' || segment.modeRestoredOff !== true || segment.modelRestored !== true
      || !['Benchmark control /chat-benchmark/provider-usage: HTTP 502', 'Classifier terminal cost remains unknown', 'The operation timed out.'].includes(segment.stoppedReason)
      || (segment.stoppedReason === 'Classifier terminal cost remains unknown' ? unknown.length !== 1 : unknown.length !== 0)
      || segment.rows.some(row => !row.done || row.aborted || row.errors.length || !row.diagnostics)
      || segment.attempts.some(a => a.outcome === 'pending' || (a.costUsd === null
        ? !['aborted', 'error'].includes(a.outcome) || a.selected !== 'ordinary' || a.reservedUsd !== comparison.classificationReserveUsd
        : !Number.isFinite(a.costUsd) || a.costUsd < 0))
      || segment.generationBudget.requestsSettled !== count || segment.generationBudget.requestsWithUnknownCost
      || segment.generationBudget.inFlight || segment.generationBudget.stoppedReason
      || segment.aggregateKeyDeltaUsd != null && (!Number.isFinite(segment.aggregateKeyDeltaUsd) || segment.aggregateKeyDeltaUsd < 0))
      throw Error('Require restored complete contiguous segments; unknown classifier costs must stay reserved and unselected');
    offset += count;
  }
  const prior = { rows: segments.flatMap(segment => segment.rows), attempts: segments.flatMap(segment => segment.attempts),
    generationEstimate: segments.reduce((sum, segment) => sum + segment.generationBudget.observedEstimatedUsd, 0),
    aggregateKeyDeltaUsd: segments.reduce((sum, segment) => sum + (segment.aggregateKeyDeltaUsd ?? 0), 0) };
  const count = offset;
  const calls = usageInputs.flatMap(input => input.bytes.toString('utf8').trim().split(/\r?\n/u).filter(Boolean).map(line => JSON.parse(line)));
  const knownCalls = calls.filter(call => call.generationId && !call.incomplete && Number.isFinite(call.usage?.cost) && call.usage.cost >= 0);
  const unknownCalls = calls.filter(call => !knownCalls.includes(call));
  if (count >= comparison.maxChats
    || knownCalls.length !== prior.rows.reduce((sum, row) => sum + row.diagnostics.steps.length, 0)
    || new Set(knownCalls.map(call => call.generationId)).size !== knownCalls.length
    || unknownCalls.length > 10 || unknownCalls.some(call => call.status !== 200 || call.incomplete !== true
      || !prior.rows.some(row => Date.parse(call.startedAt) >= Date.parse(row.startedAt) && Date.parse(call.startedAt) <= Date.parse(row.completedAt))))
    throw Error('Require known final-call costs and bounded attributable incomplete captures');
  const classifierCost = prior.attempts.reduce((sum, a) => sum + (a.costUsd ?? a.reservedUsd), 0);
  const unknownReserve = unknownCalls.length * comparison.generationReserveUsd;
  const generationCost = Math.max(prior.generationEstimate, knownCalls.reduce((sum, call) => sum + call.usage.cost, 0)) + unknownReserve;
  const carried = Math.max(prior.aggregateKeyDeltaUsd, classifierCost + generationCost);
  const remaining = value => Math.floor(value * 1e9) / 1e9;
  comparison.continuation = { reportPath: continuationPath, generationUsagePath,
    runs: runInputs.map(({ path, bytes }) => ({ path, sha256: createHash('sha256').update(bytes).digest('hex') })),
    usage: usageInputs.map(({ path, bytes }) => ({ path, sha256: createHash('sha256').update(bytes).digest('hex') })),
    completedChats: count, completedClassifications: prior.attempts.length, carriedUsd: carried,
    retainedUnknownGenerationCalls: unknownCalls.length, retainedUnknownReserveUsd: unknownReserve,
    retainedUnknownClassifications: prior.attempts.filter(a => a.costUsd === null).length,
    originalMaxCombinedEstimatedUsd: comparison.maxCombinedEstimatedUsd,
    note: 'Only undispatched jobs, no HTTP benchmark retries; fresh process resets caches. Unknown started calls retain their full declared reserves and null costs in the original stopped ledgers. A new reduced allowance does not reconcile or reset those ledgers. Read-only usage GET retries transient failures twice; classifier calls never retry.' };
  comparison.jobs = comparison.jobs.slice(count);
  comparison.maxChats -= count;
  comparison.maxClassifications = comparison.jobs.filter(job => job.mode === 'on').length;
  comparison.classificationMaxUsd = remaining(comparison.classificationMaxUsd - classifierCost);
  comparison.maxCombinedEstimatedUsd = remaining(comparison.maxCombinedEstimatedUsd - carried);
  return comparison;
}
export function checkSource(protocol) {
  const { sourceFingerprint: _sourceFingerprint, ...declared } = protocol;
  const expected = ['darija-tool-selection-comparison', 'darija-router-20b-repeat'].includes(protocol.purpose) ? darijaComparisonProtocol(protocol.continuation?.reportPath, protocol.continuation?.generationUsagePath, protocol.purpose === 'darija-router-20b-repeat')
    : protocol.purpose === 'coreweave-jev-first-comparison'
    ? firstComparisonProtocol(protocol.continuation?.reportPath, protocol.continuation?.generationUsagePath, protocol.continuation?.retainedUnknownCosts === 1)
    : protocol.purpose === 'two-model-jev-parallel-comparison'
    ? modelComparisonProtocol(protocol.continuation?.reportPath, protocol.continuation?.generationUsagePath)
    : fullChatProtocol(protocol.continuation?.reportPath);
  if (!isDeepStrictEqual(declared, expected)) throw new Error('Benchmark source or protocol changed; prepare a new frozen protocol');
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
  if (protocol.experimentEnabled === true && status.experimentEnabled !== true) throw new Error('Require the fixed experiment capability');
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
      const off = rows.find(row => complete(row) && row.caseId === on.caseId && row.model === on.model
        && row.mode === 'off' && row.diagnostics?.reply?.source === 'model');
      return off ? [{ caseId: on.caseId, ...(on.experimentArm ? { experimentArm: on.experimentArm } : {}), firstTextDeltaMs: on.firstTextMs - off.firstTextMs,
        completionDeltaMs: on.completionMs - off.completionMs }] : [];
    });
  return { all: group(rows), modes: Object.fromEntries(['off', 'on', 'shadow'].map(mode => [mode, group(rows.filter(row => row.mode === mode))])),
    pairedFallbacks, fallbackCompletionDeltaP95Ms: percentile(pairedFallbacks.map(row => row.completionDeltaMs), 95),
    qualification: false, note: 'Small assistant-authored integration sample; no independent native accuracy or rollout qualification.' };
}
