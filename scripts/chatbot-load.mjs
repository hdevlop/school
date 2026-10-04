import { percentile } from './chatbot-stream.mjs';

/** Reject unsafe combinations before login or any model-setting change. */
export function validateLoadOptions({ concurrency, compareModel, transportProbe }) {
  if (![1, 2, 4].includes(concurrency)) throw new Error('Use --concurrency=1, 2 or 4');
  if (concurrency !== 1 && (compareModel || transportProbe)) {
    throw new Error('Model comparisons and transport probes require --concurrency=1');
  }
}

/** Bounded workers; stop scheduling on failure and drain already-started work. */
export async function runLoad(jobs, concurrency, work) {
  let next = 0;
  let failed = false;
  let failure;
  const queuedAt = performance.now();
  async function worker() {
    while (!failed && next < jobs.length) {
      const index = next++;
      try {
        await work(jobs[index], { scheduleIndex: index, clientQueueMs: Math.round(performance.now() - queuedAt) });
      } catch (error) {
        if (!failed) failure = error;
        failed = true;
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, jobs.length) }, worker));
  if (failed) throw failure;
}

/** Discard untrusted diagnostics before scoring or counting embeddings. */
export function validateCorrelation(requestId, diagnostics) {
  if (diagnostics.correlationId !== requestId) return 'request_id_mismatch';
  if (Array.isArray(diagnostics.embeddings)
    && diagnostics.embeddings.some((span) => span.correlationId !== requestId)) return 'embedding_id_mismatch';
  return null;
}

export function summarizeLoad(samples, concurrency) {
  const ids = samples.map((sample) => sample.requestId);
  return {
    concurrency,
    duplicateRequestIds: ids.length - new Set(ids).size,
    requestsWithVerifiedDiagnostics: samples.filter((sample) => sample.server).length,
    requestsWithoutDiagnostics: samples.filter((sample) => !sample.server).length,
    correlationErrors: samples.filter((sample) => sample.correlationError).length,
    http429: samples.filter((sample) => sample.httpStatus === 429).length,
    clientQueueMs: {
      p50: percentile(samples.map((sample) => sample.clientQueueMs), 50),
      p95: percentile(samples.map((sample) => sample.clientQueueMs), 95),
    },
    note: 'Client queue time is the wait for a worker, separate from request latency; server/provider queueing is not directly measured. Each worker includes diagnostic retrieval. Run each concurrency level separately.',
  };
}
