import { describe, expect, it } from 'bun:test';
import { summarizeEmbeddingDiagnostics } from '../chatbot-embedding-diagnostics.mjs';

const call = (cache, outcome, attempts, operation = 'tool-routing') => ({
  cache, outcome, operation, durationMs: 20,
  attempts: attempts.map(outcome => ({ outcome, durationMs: 10 })),
});

describe('embedding benchmark summary', () => {
  it('includes failures and separates logical calls from actual network attempts', () => {
    const summary = summarizeEmbeddingDiagnostics([
      { outcome: 'completed', server: { embeddings: [call('miss', 'completed', ['completed']), call('hit', 'completed', [], 'knowledge-search')] } },
      { outcome: 'setup_error', server: { embeddings: [call('miss', 'timeout', ['timeout']), call('miss', 'cooldown', [])] } },
    ]);
    expect(summary).toMatchObject({ requestsWithCapture: 2, requestsWithoutCapture: 0,
      logicalCalls: 4, providerAttempts: 2, byCache: { miss: 3, hit: 1 },
      byOutcome: { completed: 2, timeout: 1, cooldown: 1 },
      attemptOutcomes: { completed: 1, timeout: 1 },
      byOperation: { 'tool-routing': 3, 'knowledge-search': 1 },
      logicalCallMs: { p50: 20, p95: 20 }, providerAttemptMs: { p50: 10, p95: 10 } });
  });

  it('distinguishes an empty index/no call from unavailable or historical diagnostics', () => {
    expect(summarizeEmbeddingDiagnostics([
      { server: { embeddings: [] } }, { server: {} }, { server: null }, {},
    ])).toMatchObject({ requestsWithCapture: 1, requestsWithoutCapture: 3,
      requestsWithNoCalls: 1, logicalCalls: 0, providerAttempts: 0,
      logicalCallMs: { p50: null, p95: null }, providerAttemptMs: { p50: null, p95: null } });
  });

  it('counts batch requests and health retries as attempts without inflating logical calls', () => {
    expect(summarizeEmbeddingDiagnostics([{ server: { embeddings: [
      call('bypass', 'completed', ['timeout', 'completed']),
    ] } }])).toMatchObject({ logicalCalls: 1, providerAttempts: 2,
      byCache: { bypass: 1 }, byOutcome: { completed: 1 }, attemptOutcomes: { timeout: 1, completed: 1 } });
  });

  it('does not claim zero calls when an aborted request has incomplete capture', () => {
    expect(summarizeEmbeddingDiagnostics([{ server: { embeddings: [], embeddingsIncomplete: true } }]))
      .toMatchObject({ requestsWithCapture: 1, requestsWithIncompleteCapture: 1, requestsWithNoCalls: 0 });
  });
});
