export function validateCacheMode(mode, concurrency, transportProbe) {
  if (!['uncontrolled', 'fresh'].includes(mode)) throw new Error('Use --cache-mode=uncontrolled or fresh');
  if (mode === 'fresh' && (concurrency !== 1 || transportProbe)) {
    throw new Error('Fresh-cache runs require concurrency 1 without transport probe');
  }
}

export function validateCacheControl(control) {
  if (control?.enabled !== true || typeof control.instanceId !== 'string' || !control.instanceId
    || !Number.isInteger(control.resetCount) || control.resetCount < 0
    || !Array.isArray(control.caches) || !control.caches.includes('query-embedding') || !control.caches.includes('knowledge-context')) {
    throw new Error('Fresh-cache controls unavailable; enable CHATBOT_BENCHMARK_CONTROLS=true on an isolated dev app');
  }
  return control;
}

/** A successful reset alone does not prove a new embedding provider call. */
export function verifyFreshCache(reset, server) {
  const failures = [];
  if (!server) failures.push('missing_diagnostics');
  if (server?.benchmark?.instanceId !== reset.instanceId) failures.push('instance_mismatch');
  if (server?.benchmark?.resetCount !== reset.resetCount) failures.push('reset_changed');
  if (!Array.isArray(server?.embeddings) || server.embeddingsIncomplete) failures.push('incomplete_embedding_capture');
  const routing = server?.embeddings?.filter((call) => call.operation === 'tool-routing' && call.purpose === 'query') ?? [];
  if (routing.length === 0) failures.push('no_routing_embedding');
  if (routing.some((call) => call.cache !== 'miss' || call.outcome !== 'completed'
    || !call.attempts?.some((attempt) => attempt.outcome === 'completed'))) failures.push('routing_embedding_not_fresh');
  return { mode: 'fresh', reset, verified: failures.length === 0, failures };
}

export function summarizeCacheConditions(samples, mode) {
  return { mode, verifiedFresh: samples.filter((sample) => sample.cacheCondition?.verified).length,
    failedVerification: samples.filter((sample) => sample.cacheCondition && !sample.cacheCondition.verified).length,
    note: 'Fresh verifies supported query-embedding/knowledge-context resets and a completed routing miss with a provider attempt on the same app instance. Model residency, settings caches and provider prompt caching remain uncontrolled.' };
}
