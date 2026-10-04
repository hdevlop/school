import { describe, expect, it } from 'bun:test';
import { validateCacheControl, validateCacheMode, verifyFreshCache, summarizeCacheConditions } from '../chatbot-cache.mjs';

const reset = { enabled: true, instanceId: 'instance-a', resetCount: 1,
  caches: ['query-embedding', 'knowledge-context'] };
const server = { benchmark: { instanceId: 'instance-a', resetCount: 1 },
  embeddings: [{ operation: 'tool-routing', purpose: 'query', cache: 'miss', outcome: 'completed',
    attempts: [{ outcome: 'completed' }] }] };

describe('fresh-cache verification', () => {
  it('requires both supported caches and serial mode', () => {
    expect(validateCacheControl(reset)).toEqual(reset);
    for (const control of [null, { ...reset, enabled: false }, { ...reset, resetCount: NaN },
      { ...reset, caches: ['query-embedding'] }]) expect(() => validateCacheControl(control)).toThrow();
    expect(() => validateCacheMode('fresh', 2, false)).toThrow();
    expect(() => validateCacheMode('fresh', 1, true)).toThrow();
    expect(() => validateCacheMode('cold', 1, false)).toThrow();
  });

  it('accepts a completed routing miss, allowing within-request knowledge embedding reuse', () => {
    expect(verifyFreshCache(reset, { ...server, embeddings: [...server.embeddings,
      { operation: 'knowledge-search', purpose: 'query', cache: 'hit', outcome: 'completed', attempts: [] }] }).verified).toBe(true);
    expect(summarizeCacheConditions([{ cacheCondition: verifyFreshCache(reset, server) }], 'fresh').verifiedFresh).toBe(1);
  });

  it('rejects missing/partial capture, cache hits, bypass, cooldown and failed provider attempts', () => {
    for (const diagnostic of [null, { ...server, embeddings: [] }, { ...server, embeddingsIncomplete: true },
      ...[{ cache: 'hit' }, { cache: 'bypass' }, { outcome: 'cooldown' }, { outcome: 'timeout' }, { attempts: [] },
        { attempts: [{ outcome: 'error' }] }].map((change) => ({ ...server, embeddings: [{ ...server.embeddings[0], ...change }] }))]) {
      expect(verifyFreshCache(reset, diagnostic).verified).toBe(false);
    }
  });

  it('rejects different app processes and resets that changed during the request', () => {
    expect(verifyFreshCache(reset, { ...server, benchmark: { instanceId: 'instance-b', resetCount: 1 } }).failures)
      .toContain('instance_mismatch');
    expect(verifyFreshCache(reset, { ...server, benchmark: { instanceId: 'instance-a', resetCount: 2 } }).failures)
      .toContain('reset_changed');
  });
});
