import { expect, test } from 'bun:test';
import { fullChatProtocol, checkSource, checkBase, checkReady, checkScopedRead, summarizeFullChat, fingerprint } from '../chatbot-jev-full-chat-lib.mjs';

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
test.each(['https://example.com', 'http://user:password@localhost:3103', 'http://localhost:3103/api',
  'http://localhost:3103/?url=https://example.com'])('refuses an unsafe/non-origin app URL: %s', value => {
  expect(() => checkBase(value)).toThrow();
});
test('requires fresh marked-fixture limits before spending', () => {
  const protocol = fullChatProtocol();
  const ready = { instanceId: 'isolated', markedLocalFixture: true, syntheticOnly: true, mode: 'off',
    frameworkPreparationEnabled: false, threshold: 0.8, timeoutMs: 800, guardVersion: 5, intentWordingVersion: 3,
    budget: { requests: 0, unknownCosts: 0, maxRequests: 48, maxCostUsd: 0.0072, unknownReserveUsd: 0.00015 } };
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
});
