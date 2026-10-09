import { AsyncLocalStorage } from 'node:async_hooks';
import type { ChatSpendRepository, ChatSpendReservation, ChatSpendKind } from './ChatSpendRepository';
import { JEV_DECISIONS_URL } from './jevIntents';

export interface SchoolPaidChatFrame {
  repository: Pick<ChatSpendRepository, 'reserve' | 'settle'>;
  limit: number; embeddingUrl?: string; freeEmbeddingUrl?: string;
  calls: number; failedGeneration?: boolean;
  stopped?: 'allowance' | 'transport_policy';
  costs: { kind: ChatSpendKind; costUsd: number | null }[];
}
// Shared across Next module graphs/hot reload. Install one wrapper; every
// request supplies its repository, so no actor/session state is captured globally.
const shared = globalThis as typeof globalThis & { __schoolPaidChatTransport?: {
  context: AsyncLocalStorage<SchoolPaidChatFrame>; installed: boolean;
  dispatch?: AsyncLocalStorage<boolean>; fetch?: typeof fetch;
} };
const state = shared.__schoolPaidChatTransport ??= { context: new AsyncLocalStorage<SchoolPaidChatFrame>(), installed: false };
const dispatch = state.dispatch ??= new AsyncLocalStorage<boolean>();
export const schoolPaidChatContext = state.context;

function responseCost(value: unknown): number | null {
  const cost = (value as { usage?: { cost?: unknown } } | null)?.usage?.cost;
  return typeof cost === 'number' && Number.isFinite(cost) && cost >= 0 ? cost : null;
}

/** Pass provider bytes through unchanged. Inspect bounded usage frames only;
 * cancellation/error/absent usage keeps the durable debit. No tee/background
 * full-response buffer, generation retry or billing lookup is introduced. */
function meteredResponse(response: Response, frame: SchoolPaidChatFrame, kind: ChatSpendKind,
  reservation: ChatSpendReservation): Response {
  if (!response.body) return response;
  const reader = response.body.getReader(), decoder = new TextDecoder();
  const sse = response.headers.get('content-type')?.includes('text/event-stream');
  let buffer = '', oversized = false, cost: number | null = null;
  const observe = (text: string) => { try { const found = responseCost(JSON.parse(text)); if (found !== null) cost = found; } catch { /* not usage */ } };
  const body = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const chunk = await reader.read();
        if (chunk.done) {
          if (!sse && !oversized) observe(buffer + decoder.decode());
          frame.costs.push({ kind, costUsd: cost });
          try { await frame.repository.settle(reservation, cost); } catch { /* keep durable reservation */ }
          controller.close(); return;
        }
        if (!oversized) {
          buffer += decoder.decode(chunk.value, { stream: true });
          if (sse) {
            let boundary: RegExpExecArray | null;
            while ((boundary = /\r?\n\r?\n/u.exec(buffer))) {
              const event = buffer.slice(0, boundary.index); buffer = buffer.slice(boundary.index + boundary[0].length);
              for (const line of event.split(/\r?\n/u)) if (line.startsWith('data: ')) observe(line.slice(6));
            }
          }
          if (buffer.length > 262_144) { buffer = ''; oversized = true; }
        }
        controller.enqueue(chunk.value);
      } catch (error) { controller.error(error); }
    },
    cancel(reason) { return reader.cancel(reason); },
  });
  return new Response(body, { status: response.status, statusText: response.statusText, headers: response.headers });
}

export function budgetedChatFetch(fetchImpl: typeof fetch): typeof fetch {
  return (async (input, init) => {
    const frame = schoolPaidChatContext.getStore();
    if (!frame || dispatch.getStore()) return fetchImpl(input, init);
    const url = new URL(input instanceof Request ? input.url : String(input));
    const endpoint = url.origin + url.pathname;
    let kind: ChatSpendKind;
    let body = typeof init?.body === 'string' ? init.body : '';
    if (endpoint === JEV_DECISIONS_URL) kind = 'classification';
    else if (endpoint === 'https://openrouter.ai/api/v1/chat/completions') kind = 'generation';
    else if (endpoint === frame.embeddingUrl) kind = 'embedding';
    else if (endpoint === frame.freeEmbeddingUrl && !url.search && !url.username && !url.password) return fetchImpl(input, init);
    else { frame.stopped = 'transport_policy'; throw Error('School chat provider is not qualified'); }
    if (!body || url.search || url.username || url.password || frame.calls >= 12) {
      frame.stopped = 'transport_policy'; throw Error('School chat transport policy');
    }
    if (kind === 'generation') {
      if (frame.failedGeneration) throw Error('No automatic generation retry');
      const data = JSON.parse(body);
      if (data.model !== 'openai/gpt-oss-20b') { frame.stopped = 'transport_policy'; throw Error('School fallback must be OSS20B'); }
      data.max_tokens = 4096;
      data.provider = { only: ['coreweave'], allow_fallbacks: false, require_parameters: true,
        max_price: { prompt: 0.25, completion: 0.5, request: 0 } };
      body = JSON.stringify(data);
    }
    const bytes = new TextEncoder().encode(body).byteLength;
    if (bytes > 200_000) { frame.stopped = 'transport_policy'; throw Error('School chat request exceeds bounded context'); }
    // Generation reserves at the configured provider price ceiling, treating
    // every UTF-8 byte as a possible input token, plus output and overhead.
    // Unknown classifier/embedding costs retain a conservative per-call debit.
    const reserve = kind === 'generation' ? Math.ceil((bytes * 0.25 + 4096 * 0.5) * 2)
      : kind === 'classification' ? 1000 : Math.max(1000, bytes * 2);
    init?.signal?.throwIfAborted();
    const reservation = await frame.repository.reserve(kind, reserve, frame.limit);
    if (!reservation) { frame.stopped = 'allowance'; throw Error('School monthly chat allowance reached'); }
    frame.calls++;
    // Aborting between reservation and dispatch also keeps the debit. It is
    // conservative and cannot race a refund against an uncertain network send.
    init?.signal?.throwIfAborted();
    try {
      const response = await dispatch.run(true, () => fetchImpl(input, { ...init, body, redirect: 'error' }));
      if (kind === 'generation' && !response.ok) frame.failedGeneration = true;
      return meteredResponse(response, frame, kind, reservation);
    } catch (error) { if (kind === 'generation') frame.failedGeneration = true; throw error; }
  }) as typeof fetch;
}
export function installSchoolPaidChatTransport() {
  // Next may replace fetch during route initialization/hot reload. Reinstall
  // at the request boundary; nested earlier wrappers share a dispatch scope
  // so one provider send is charged once, including concurrent requests.
  if (state.fetch === globalThis.fetch) return;
  state.fetch = budgetedChatFetch(globalThis.fetch);
  globalThis.fetch = state.fetch;
  state.installed = true;
}
