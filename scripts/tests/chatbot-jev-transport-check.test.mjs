import { expect, test } from 'bun:test';
import { summarizeTransport } from '../chatbot-jev-transport-check.mjs';

test('transport report retains failed attempts without counting them as successful latency', () => {
  const result = summarizeTransport([
    { method: 'bun-default', status: 200, totalMs: 100, error: null },
    { method: 'bun-default', status: 200, totalMs: 200, error: null },
    { method: 'bun-default', status: null, totalMs: 10000, error: 'timeout' },
    { method: 'bun-default', status: 429, totalMs: 50, error: null },
  ]);
  expect(result['bun-default']).toEqual({ attempts: 4, successful: 2, failures: 2,
    meanMs: 150, p50Ms: 100, p95Ms: 200, maximumMs: 200 });
  expect(result['curl-new-process'].meanMs).toBeNull();
});
