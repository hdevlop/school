import { estimateDeclaredCost } from './chatbot-budget.mjs';
import { validateCorrelation } from './chatbot-load.mjs';

/** Read-only admin diagnostic retrieval; 204 is pending, never a free request. */
export async function readRoleDiagnostics(base, adminToken, requestId, { fetchImpl = fetch, pause = Bun.sleep } = {}) {
  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      const response = await fetchImpl(new URL(`/api/chat-diagnostics/${encodeURIComponent(requestId)}`, base.origin), {
        headers: { authorization: `Bearer ${adminToken}` }, redirect: 'error', signal: AbortSignal.timeout(10000),
      });
      if (response.status === 200) {
        const json = await response.json();
        return { diagnostics: json.data ?? json };
      }
      if (response.status !== 204) return { error: `HTTP_${response.status}` };
    } catch { return { error: 'diagnostic_request_failed' }; }
    if (attempt < 9) await pause(200);
  }
  return { error: 'not_recorded' };
}

const pick = (value, fields) => Object.fromEntries(fields.filter(key => value?.[key] !== undefined).map(key => [key, value[key]]));

/** Payload-free diagnostic snapshot. Tool arguments, outputs, prompts and credentials stay out. */
function snapshot(diagnostics) {
  return { ...pick(diagnostics, ['correlationId', 'model', 'provider', 'outcome', 'embeddingsIncomplete']),
    spans: Object.fromEntries(Object.entries(diagnostics.spans ?? {}).filter(([, value]) => Number.isFinite(value))),
    tools: diagnostics.tools.map(tool => pick(tool, ['toolCallId', 'name', 'outcome', 'durationMs'])),
    embeddings: diagnostics.embeddings.map(event => ({ ...pick(event, ['correlationId', 'operation', 'cache', 'outcome', 'durationMs']),
      attempts: event.attempts.map(attempt => pick(attempt, ['outcome', 'durationMs'])) })) };
}

/** Serial dispatch; reserve before sending, retain unknown costs, preserve failures for the report. */
export async function measureRoleRequest({ requestId, sessionId, role, budget, model, prices, send, diagnostics }) {
  budget.reserve(requestId);
  const start = performance.now();
  let reply;
  try { reply = await send(); }
  catch { reply = { httpStatus: null, text: '', tools: [], errors: ['request_failed'], metadata: null, complete: false }; }
  const ms = Math.round(performance.now() - start);
  let capture;
  try { capture = await diagnostics(); } catch { capture = { error: 'diagnostic_request_failed' }; }
  const record = capture?.diagnostics;
  const shapeValid = record && Array.isArray(record.embeddings)
    && record.embeddings.every(event => event && Array.isArray(event.attempts))
    && Array.isArray(record.tools) && record.tools.every(tool => tool && (tool.toolCallId === null || typeof tool.toolCallId === 'string')
      && typeof tool.name === 'string' && ['executed', 'blocked', 'error'].includes(tool.outcome));
  const correlationError = shapeValid ? validateCorrelation(requestId, record) : null;
  const server = !correlationError && shapeValid ? snapshot(record) : null;
  const modelMatches = server?.model === model && server?.provider === prices.provider;
  const declaredCost = modelMatches ? estimateDeclaredCost(reply.metadata, model, prices, 'declared') : null;
  budget.settle(requestId, declaredCost ? { pricingFound: true, totalCost: declaredCost.totalCost } : null);
  const measurementFailures = [
    ...(reply.httpStatus === 200 ? [] : ['chat_http_failure']),
    ...(reply.complete ? [] : ['incomplete_stream']),
    ...(server ? [] : [correlationError ?? capture?.error ?? 'diagnostics_missing_or_malformed']),
    ...(server && !modelMatches ? ['diagnostic_provider_or_model_mismatch'] : []),
    ...(server?.embeddingsIncomplete === true ? ['embedding_capture_incomplete'] : []),
  ];
  const sample = { requestId, sessionId, role, ms, httpStatus: reply.httpStatus,
    complete: reply.complete, measurementFailures, correlationError,
    metadata: pick(reply.metadata, ['model', 'provider', 'promptTokens', 'completionTokens', 'totalTokens', 'pricingFound', 'totalCost']),
    declaredCost, server };
  return { ...reply, ms, measurementFailures, sample };
}
