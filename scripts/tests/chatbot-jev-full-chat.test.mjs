import { expect, test } from 'bun:test';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fullChatProtocol, modelComparisonProtocol, firstComparisonProtocol, darijaComparisonProtocol, checkSource, checkBase, checkReady, checkScopedRead, summarizeFullChat, fingerprint } from '../chatbot-jev-full-chat-lib.mjs';

test('Darija comparison freezes three same-model paths and both scripts without French', () => {
  const protocol = darijaComparisonProtocol();
  expect(protocol.cases).toHaveLength(100);
  expect(protocol.jobs).toHaveLength(300);
  expect(new Set(protocol.cases.map(item => item.language))).toEqual(new Set(['ary', 'ary-latn']));
  expect(new Set(protocol.cases.map(item => item.familyId)).size).toBe(50);
  expect(protocol.models).toEqual(['openai/gpt-oss-20b']);
  expect(protocol.arms.map(arm => arm.strategy)).toEqual(['parallel', 'candidate-first', 'router-first']);
  expect(protocol.maxChats * protocol.generationReserveUsd + protocol.classificationMaxUsd).toBeLessThanOrEqual(0.25);
  expect(() => checkSource(protocol)).not.toThrow();
  expect(() => checkSource({ ...protocol, averageResponseLimitSeconds: 5 })).toThrow();
});

test('120B tool check freezes zero Jev allowance and records time without a time gate', () => {
  const p = darijaComparisonProtocol(undefined, undefined, '120b');
  expect(p.jobs).toHaveLength(100);
  expect(p.jobs.every(job => job.model === 'openai/gpt-oss-120b' && job.mode === 'off' && job.experimentArm === '120b-baseline')).toBe(true);
  expect(p.maxClassifications).toBe(0); expect(p.averageResponseLimitSeconds).toBeNull();
  expect(p.captureToolNames).toBe(true);
  expect(p.maxChats * p.generationReserveUsd).toBeLessThan(p.maxCombinedEstimatedUsd);
  expect(() => checkSource(p)).not.toThrow();
  expect(() => checkSource({ ...p, averageResponseLimitSeconds: 2 })).toThrow();
});

test('router-only repeat freezes 100 existing-router 20B chats with no classifier allowance', () => {
  const protocol = darijaComparisonProtocol(undefined, undefined, true);
  expect(protocol.purpose).toBe('darija-router-20b-repeat');
  expect(protocol.jobs).toHaveLength(100);
  expect(protocol.maxClassifications).toBe(0);
  expect(protocol.classificationMaxUsd).toBe(0);
  expect(protocol.maxCombinedEstimatedUsd).toBe(0.10);
  expect(protocol.jobs.every(job => job.mode === 'off' && job.experimentArm === '20b-coreweave-off')).toBe(true);
  expect(() => checkSource(protocol)).not.toThrow();
  expect(() => checkSource({ ...protocol, jobs: protocol.jobs.slice(1) })).toThrow();
});

test('Darija continuation does not replay the completed prefix and deducts unknown capture reserves', () => {
  const runPath = 'docs/evidence/chatbot-latency/darija-selection-run-20261008.json';
  const usagePath = 'docs/evidence/chatbot-latency/darija-selection-generation-prefix-20261008.jsonl';
  const protocol = darijaComparisonProtocol(runPath, usagePath);
  const prefix = JSON.parse(readFileSync(runPath, 'utf8'));
  expect(protocol.jobs).toHaveLength(300 - prefix.chatsDispatched);
  expect(protocol.jobs[0]).toEqual(darijaComparisonProtocol().jobs[prefix.chatsDispatched]);
  expect(protocol.continuation.retainedUnknownReserveUsd).toBe(0.0014);
  expect(protocol.maxCombinedEstimatedUsd + protocol.continuation.carriedUsd).toBeLessThanOrEqual(0.25);
  const dir = mkdtempSync(join(tmpdir(), 'school-darija-continuation-'));
  try {
    const altered = join(dir, 'altered.json');
    prefix.attempts[0].costUsd = null;
    writeFileSync(altered, JSON.stringify(prefix));
    expect(() => darijaComparisonProtocol(altered, usagePath)).toThrow();
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('frozen comparison is bounded, balanced and explicitly not native qualification', () => {
  const protocol = fullChatProtocol();
  expect(protocol.jobs).toHaveLength(72);
  expect(new Set(protocol.cases.map(item => item.id)).size).toBe(24);
  for (const mode of ['off', 'on', 'shadow']) expect(protocol.jobs.filter(job => job.mode === mode)).toHaveLength(24);
  expect(protocol.jobs.filter(job => job.mode !== 'off')).toHaveLength(protocol.maxClassifications);
  expect(protocol.maxChats * protocol.generationReserveUsd + protocol.classificationMaxUsd).toBeLessThan(protocol.maxCombinedEstimatedUsd);
  expect(protocol.retries).toBe(0); expect(protocol.independentQualification).toBe(false);
  expect(fingerprint(protocol.sourceHashes)).toMatch(/^[a-f0-9]{64}$/u);
});
test('changing a frozen spending limit or job is rejected even with unchanged source hashes', () => {
  const protocol = fullChatProtocol();
  expect(() => checkSource(protocol)).not.toThrow();
  expect(() => checkSource({ ...protocol, maxChats: 1000 })).toThrow();
  expect(() => checkSource({ ...protocol, jobs: protocol.jobs.slice(1) })).toThrow();
});
test('two-model comparison balances all four arms and refuses changed models or limits', () => {
  const protocol = modelComparisonProtocol();
  expect(protocol.jobs).toHaveLength(96); expect(protocol.maxClassifications).toBe(48);
  for (const model of protocol.models) for (const mode of ['off', 'on'])
    expect(protocol.jobs.filter(job => job.model === model && job.mode === mode)).toHaveLength(24);
  expect(protocol.jobs.slice(0, 4).map(job => job.model + job.mode))
    .not.toEqual(protocol.jobs.slice(4, 8).map(job => job.model + job.mode));
  expect(protocol.maxChats * protocol.generationReserveUsd + protocol.classificationMaxUsd).toBeLessThanOrEqual(0.25);
  expect(() => checkSource(protocol)).not.toThrow();
  expect(() => checkSource({ ...protocol, models: ['openai/gpt-oss-120b'] })).toThrow();
  expect(() => checkSource({ ...protocol, maxCombinedEstimatedUsd: 1 })).toThrow();
});
test('CoreWeave-first protocol distinguishes scheduling arms and freezes host, order and costs', () => {
  const protocol = firstComparisonProtocol();
  expect(protocol.jobs).toHaveLength(96);
  for (const arm of protocol.arms) expect(protocol.jobs.filter(job => job.experimentArm === arm.experimentArm)).toHaveLength(24);
  expect(protocol.jobs.filter(job => job.mode === 'on')).toHaveLength(protocol.maxClassifications);
  expect(() => checkSource(protocol)).not.toThrow();
  const changed = structuredClone(protocol); changed.arms[3].strategy = 'parallel';
  expect(() => checkSource(changed)).toThrow();
  expect(() => checkSource({ ...protocol, maxCombinedEstimatedUsd: 1 })).toThrow();
});
test('terminal 529 continuation requires an explicit retained reservation and never retries the prefix', () => {
  const run = 'docs/evidence/chatbot-latency/jev-coreweave-first-run-20261008.json';
  const usage = 'docs/evidence/chatbot-latency/jev-coreweave-first-generation-prefix-20261008.jsonl';
  expect(() => firstComparisonProtocol(run, usage)).toThrow();
  const protocol = firstComparisonProtocol(run, usage, true);
  expect(protocol.maxChats).toBe(92); expect(protocol.maxClassifications).toBe(46);
  expect(protocol.jobs).toEqual(firstComparisonProtocol().jobs.slice(4));
  expect(protocol.continuation.retainedUnknownReserveUsd).toBe(0.00015);
  expect(protocol.maxCombinedEstimatedUsd + protocol.continuation.carriedUsd).toBeLessThanOrEqual(0.25);
  expect(protocol.classificationMaxUsd + 0.00015 + 0.000038934).toBeLessThanOrEqual(0.0072);
  expect(() => checkSource(protocol)).not.toThrow();
});
test('model continuation skips the failed request and carries response-reported generation charges', () => {
  const protocol = modelComparisonProtocol('docs/evidence/chatbot-latency/jev-model-comparison-run-20261007.json',
    'docs/evidence/chatbot-latency/jev-model-comparison-generation-first-20261007.jsonl');
  expect(protocol.maxChats).toBe(67); expect(protocol.maxClassifications).toBe(33);
  expect(protocol.jobs).toEqual(modelComparisonProtocol().jobs.slice(29));
  expect(protocol.jobs[0]).not.toEqual(modelComparisonProtocol().jobs[28]);
  expect(protocol.continuation.carriedUsd).toBeGreaterThan(0.00321434);
  expect(protocol.maxCombinedEstimatedUsd + protocol.continuation.carriedUsd).toBeLessThanOrEqual(0.25);
  expect(() => checkSource(protocol)).not.toThrow();
  expect(() => modelComparisonProtocol('docs/evidence/chatbot-latency/jev-model-comparison-run-20261007.json')).toThrow();
});
test('continuation preserves spent limits, skips every dispatched job and rejects unknown costs', () => {
  const path = 'docs/evidence/chatbot-latency/jev-billing-observer-run-20261007.json';
  const prior = JSON.parse(readFileSync(path, 'utf8'));
  const protocol = fullChatProtocol(path);
  expect(protocol.jobs).toEqual(fullChatProtocol().jobs.slice(58));
  expect(protocol.maxChats).toBe(14); expect(protocol.maxClassifications).toBe(9);
  expect(protocol.maxCombinedEstimatedUsd + protocol.continuation.carriedUsd).toBeLessThanOrEqual(0.25);
  expect(() => checkSource(protocol)).not.toThrow();
  expect(() => checkSource({ ...protocol, maxChats: 72 })).toThrow();
  const dir = mkdtempSync(join(tmpdir(), 'jev-continuation-'));
  try {
    const invalid = join(dir, 'invalid.json');
    prior.generationBudget.observedEstimatedUsd = null;
    writeFileSync(invalid, JSON.stringify(prior));
    expect(() => fullChatProtocol(invalid)).toThrow();
    prior.generationBudget.observedEstimatedUsd = 0.008949216;
    prior.attempts[0].costUsd = null;
    const unknown = join(dir, 'unknown.json'); writeFileSync(unknown, JSON.stringify(prior));
    expect(() => fullChatProtocol(unknown)).toThrow();
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
test.each(['https://example.com', 'http://user:password@localhost:3103', 'http://localhost:3103/api',
  'http://localhost:3103/?url=https://example.com'])('refuses an unsafe/non-origin app URL: %s', value => {
  expect(() => checkBase(value)).toThrow();
});
test('requires fresh marked-fixture limits before spending', () => {
  const protocol = fullChatProtocol();
  const ready = { instanceId: 'isolated', markedLocalFixture: true, syntheticOnly: true, mode: 'off',
    frameworkPreparationEnabled: false, threshold: 0.8, timeoutMs: 800, guardVersion: 5, intentWordingVersion: 3,
    billingMode: 'observe', billingTimeoutMs: 5000,
    budget: { requests: 0, pendingRequests: 0, unknownCosts: 0, maxRequests: 48, maxCostUsd: 0.0072, unknownReserveUsd: 0.00015 } };
  expect(() => checkReady(ready, protocol)).not.toThrow();
  for (const patch of [{ markedLocalFixture: false }, { syntheticOnly: false }, { mode: 'on' },
    { frameworkPreparationEnabled: true }, { budget: { ...ready.budget, requests: 1 } },
    { budget: { ...ready.budget, unknownCosts: 1 } }, { budget: { ...ready.budget, maxRequests: 100 } }])
    expect(() => checkReady({ ...ready, ...patch }, protocol)).toThrow();
});
test('fixture MCP failures or missing results cannot pass the unpaid read preflight', () => {
  expect(() => checkScopedRead('students_get_student_count', { result: { content: [{ type: 'text', text: '{"count":9}' }] } })).not.toThrow();
  for (const result of [null, {}, { error: { code: 403 } }, { result: { content: [] } },
    { result: { isError: true, content: [{ type: 'text', text: 'Access denied' }] } }])
    expect(() => checkScopedRead('students_get_student_count', result)).toThrow();
});
test('fallback deltas compare the same cases; unfinished/empty replies do not become zero latency', () => {
  const row = (caseId, mode, source, completionMs) => ({ caseId, mode, done: true, errors: [], aborted: false,
    text: 'reply', firstTextMs: completionMs - 10, completionMs, diagnostics: { reply: { source } } });
  const summary = summarizeFullChat([row('a', 'off', 'model', 200), row('a', 'on', 'model', 210),
    row('b', 'off', 'model', 500), { ...row('b', 'on', 'template', 30), diagnostics: { reply: { source: 'template', label: 'jev:student_count' } } },
    { ...row('c', 'on', 'model', 100), firstTextMs: null, text: '' }]);
  expect(summary.pairedFallbacks).toEqual([{ caseId: 'a', firstTextDeltaMs: 10, completionDeltaMs: 10 }]);
  expect(summary.all.valid).toBe(4); expect(summary.qualification).toBe(false);
  expect(summarizeFullChat([{ ...row('a', 'off', 'model', 200), model: '120b' },
    { ...row('a', 'on', 'model', 210), model: '20b' }]).pairedFallbacks).toHaveLength(0);
  expect(summarizeFullChat([{ ...row('denied', 'on', 'model', 100),
    diagnostics: { reply: { source: 'model' }, tools: [{ outcome: 'blocked' }] } }]).all.valid).toBe(0);
});
