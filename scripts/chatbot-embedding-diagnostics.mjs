import { percentile } from './chatbot-stream.mjs';

/** Includes failed requests; missing capture is unknown, distinct from zero calls. */
export function summarizeEmbeddingDiagnostics(samples) {
  const captured = samples.filter(sample => Array.isArray(sample.server?.embeddings));
  const events = captured.flatMap(sample => sample.server.embeddings);
  const attempts = events.flatMap(event => event.attempts);
  const counts = (rows, key) => {
    const result = {};
    for (const row of rows) result[row[key]] = (result[row[key]] ?? 0) + 1;
    return result;
  };
  const timing = rows => ({
    p50: percentile(rows.map(row => row.durationMs), 50),
    p95: percentile(rows.map(row => row.durationMs), 95),
  });
  return {
    requestsWithCapture: captured.length,
    requestsWithoutCapture: samples.length - captured.length,
    requestsWithIncompleteCapture: captured.filter(sample => sample.server.embeddingsIncomplete === true).length,
    requestsWithNoCalls: captured.filter(sample => sample.server.embeddingsIncomplete !== true && sample.server.embeddings.length === 0).length,
    logicalCalls: events.length,
    providerAttempts: attempts.length,
    byCache: counts(events, 'cache'),
    byOperation: counts(events, 'operation'),
    byOutcome: counts(events, 'outcome'),
    attemptOutcomes: counts(attempts, 'outcome'),
    logicalCallMs: timing(events),
    providerAttemptMs: timing(attempts),
    note: 'All outcomes included; incomplete capture contains partial counts. Attempts nest inside logical calls, which overlap routing/context/preparation/tool execution; do not add durations. Missing capture is unknown.',
  };
}
