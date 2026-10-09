import { expect, test } from 'bun:test';
import type { ChatDiagnostics, ChatToolSpan } from 'najm-chatbot';
import { ChatDiagnosticsLog } from '../../src/modules/chat/diagnostics/ChatDiagnosticsLog';
import { schoolToolFailures } from '../../src/modules/chat/diagnostics/schoolToolFailures';

const span = (name: string, outcome: ChatToolSpan['outcome'], startMs = 1): ChatToolSpan => ({ name, outcome, startMs, durationMs: 2, toolCallId: 'private-call-id', inputChars: 40, resultChars: 10 });
const diag = (steps: string[][], tools: ChatToolSpan[]): ChatDiagnostics => ({
  version: 1, correlationId: 'request', channel: 'web', provider: 'openrouter', model: 'openai/gpt-oss-20b',
  outcome: 'completed', error: null, routingStatus: 'routed', routedToolCount: 2, messages: { stored: 0, prompt: 1 },
  spans: { settingsMs: 0, historyMs: 0, routingMs: 0, contextMs: 0, prepareMs: 0, persistenceMs: 0 },
  marks: { firstTextMs: 30, finishMs: 40 }, usage: null, cost: null,
  steps: steps.map((toolCalls, i) => ({ toolCalls, endMs: 10 * (i + 1), finishReason: 'tool-calls', inputTokens: 1, outputTokens: 1 })), tools,
});
test('unknown/invalid calls without execution stay failures even after model recovery', () => {
  const event = diag([['parents_search<|channel|>private question'], ['students_read']], [span('students_read', 'executed', 11)]);
  expect(schoolToolFailures(event)).toEqual([{ step: 0, code: 'not_dispatched', count: 1 }]);
  const log = new ChatDiagnosticsLog(); log.record(event);
  expect(log.find('request')?.outcome).toBe('completed');
  expect(log.find('request')?.toolFailures).toEqual([{ step: 0, code: 'not_dispatched', count: 1 }]);
  expect(JSON.stringify(log.find('request')?.toolFailures)).not.toContain('private');
  expect(log.find('request')?.steps[0].toolCalls).toEqual(['[not-dispatched]']);
  event.steps[0].toolCalls.length = 0;
  expect(log.find('request')?.toolFailures?.[0].count).toBe(1);
});
test('a later valid same-name call cannot erase an earlier rejected call', () => {
  expect(schoolToolFailures(diag([['students_read'], ['students_read']], [span('students_read', 'executed', 11)])))
    .toEqual([{ step: 0, code: 'not_dispatched', count: 1 }]);
  expect(schoolToolFailures(diag([['students_read', 'students_read']], [span('students_read', 'executed')])))
    .toEqual([{ step: 0, code: 'not_dispatched', count: 1 }]);
});
test('all original tool errors and write blocks survive later successes', () => {
  expect(schoolToolFailures(diag([['read', 'read', 'write'], ['read']], [span('read', 'error'), span('read', 'error'), span('write', 'blocked'), span('read', 'executed', 11)])))
    .toEqual([{ step: 0, code: 'tool_error', count: 2 }, { step: 0, code: 'write_blocked', count: 1 }]);
});
test('template and interrupted-call failures are recorded without inventing a model step', () => {
  expect(schoolToolFailures(diag([], [span('read', 'error'), span('write', 'blocked')])))
    .toEqual([{ step: null, code: 'tool_error', count: 1 }, { step: null, code: 'write_blocked', count: 1 }]);
});
test('successful empty reads, rounded tool timings and model-only replies have no false failures', () => {
  expect(schoolToolFailures(diag([['read'], []], [span('read', 'executed')]))).toEqual([]);
  expect(schoolToolFailures(diag([['read']], [span('read', 'executed', 8.1)]))).toEqual([]);
  const log = new ChatDiagnosticsLog(); log.record(diag([[]], []));
  expect(log.find('request')?.toolFailures).toBeUndefined();
});
