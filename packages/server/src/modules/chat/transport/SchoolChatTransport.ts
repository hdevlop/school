import { AsyncLocalStorage } from 'node:async_hooks';
import { JEV_DECISIONS_URL } from '../jev/jevIntents';
import { schoolOss20bProvider } from '../routing/schoolOpenRouterProvider';
import { schoolProviderResponse } from './schoolProviderResponse';
import { completionProblem, correctionNote, withCorrection } from './schoolCompletionCorrection';

export interface SchoolChatTransportFrame {
  embeddingUrl: string;
  calls: number;
  failedGeneration?: boolean;
  /** One corrective retry per chat turn (schoolCompletionCorrection). */
  corrected?: boolean;
}

const COMPLETION_BYTES = 1_048_576;

/** The whole provider stream, bounded like schoolProviderResponse; null when it is not a stream. */
async function bufferedCompletion(response: Response): Promise<{ text: string; response: Response } | null> {
  if (!response.body || !response.headers.get('content-type')?.includes('text/event-stream')) return null;
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let text = '', bytes = 0;
  for (;;) {
    const part = await reader.read();
    if (part.done) break;
    bytes += part.value.byteLength;
    if (bytes > COMPLETION_BYTES) { await reader.cancel().catch(() => {}); throw Error('School provider completion exceeds stream bound'); }
    text += decoder.decode(part.value, { stream: true });
  }
  text += decoder.decode();
  const headers = new Headers(response.headers);
  headers.delete('content-length'); headers.delete('content-encoding');
  return { text, response: new Response(text, { status: response.status, statusText: response.statusText, headers }) };
}

// Share one request context across Next module graphs and hot reload.
const shared = globalThis as typeof globalThis & { __schoolChatTransport?: {
  context: AsyncLocalStorage<SchoolChatTransportFrame>;
  dispatch: AsyncLocalStorage<boolean>;
  fetch?: typeof fetch;
  adapter?: typeof schoolChatFetch;
} };
const state = shared.__schoolChatTransport ??= {
  context: new AsyncLocalStorage<SchoolChatTransportFrame>(),
  dispatch: new AsyncLocalStorage<boolean>(),
};
export const schoolChatTransportContext = state.context;

/** Constrain dispatch and adapt OSS20B's provider stream before SDK execution. */
export function schoolChatFetch(fetchImpl: typeof fetch): typeof fetch {
  return (async (input, init) => {
    const frame = schoolChatTransportContext.getStore();
    if (state.dispatch.getStore()) return fetchImpl(input, init);
    let url: URL;
    try { url = new URL(input instanceof Request ? input.url : String(input)); }
    catch (error) { if (!frame) return fetchImpl(input, init); throw error; }
    const endpoint = url.origin + url.pathname;
    const generation = endpoint === 'https://openrouter.ai/api/v1/chat/completions';
    if (!frame) {
      // Formatting applies even without a request-local frame. Existing
      // request policy still applies whenever its frame is available.
      if (!generation || typeof init?.body !== 'string') return fetchImpl(input, init);
      let data;
      try { data = JSON.parse(init.body); } catch { return fetchImpl(input, init); }
      if (data?.model !== 'openai/gpt-oss-20b') return fetchImpl(input, init);
      const offered = new Set<string>();
      for (const tool of data.tools ?? []) if (typeof tool.function?.name === 'string') offered.add(tool.function.name);
      const response = await state.dispatch.run(true, () => fetchImpl(input, init));
      return schoolProviderResponse(response, offered, () => {});
    }
    if (!generation && endpoint !== JEV_DECISIONS_URL && endpoint !== frame.embeddingUrl)
      throw Error('School chat provider is not qualified');
    let body = typeof init?.body === 'string' ? init.body : '';
    const offered = new Set<string>();
    if (!body || url.search || url.username || url.password || frame.calls >= 12)
      throw Error('School chat transport policy');
    if (generation) {
      if (frame.failedGeneration) throw Error('No automatic generation retry');
      const data = JSON.parse(body);
      if (data.model !== 'openai/gpt-oss-20b') throw Error('School fallback must be OSS20B');
      for (const tool of data.tools ?? []) if (typeof tool.function?.name === 'string') offered.add(tool.function.name);
      data.max_tokens = 4096;
      // School facts and stored labels need stable decoding, not varied wording.
      data.temperature = 0;
      data.provider = schoolOss20bProvider();
      body = JSON.stringify(data);
    }
    if (new TextEncoder().encode(body).byteLength > 200_000)
      throw Error('School chat request exceeds bounded context');
    init?.signal?.throwIfAborted();
    frame.calls++;
    try {
      let response = await state.dispatch.run(true, () => fetchImpl(input, { ...init, body, redirect: 'error' }));
      if (generation && !response.ok) frame.failedGeneration = true;
      // A successful completion with unusable content gets one corrected
      // request per turn; a provider failure is never retried.
      if (generation && response.ok && !frame.corrected && frame.calls < 12) {
        const buffered = await bufferedCompletion(response);
        if (buffered) {
          response = buffered.response;
          const problem = completionProblem(buffered.text, offered);
          if (problem) {
            frame.corrected = true;
            const corrected = JSON.stringify(withCorrection(JSON.parse(body), correctionNote(problem, offered)));
            if (new TextEncoder().encode(corrected).byteLength <= 200_000) {
              init?.signal?.throwIfAborted();
              frame.calls++;
              response = await state.dispatch.run(true, () => fetchImpl(input, { ...init, body: corrected, redirect: 'error' }));
              if (!response.ok) frame.failedGeneration = true;
              console.info(`[school-chat] corrected a completion (${problem.kind})`);
            }
          }
        }
      }
      return generation ? schoolProviderResponse(response, offered, () => { frame.failedGeneration = true; }) : response;
    } catch (error) {
      if (generation) frame.failedGeneration = true;
      throw error;
    }
  }) as typeof fetch;
}

export function installSchoolChatTransport() {
  // Next may replace fetch during initialization/hot reload. Nested wrappers
  // share the dispatch context so each provider request is checked once.
  if (state.fetch === globalThis.fetch && state.adapter === schoolChatFetch) return;
  state.adapter = schoolChatFetch;
  state.fetch = schoolChatFetch(globalThis.fetch);
  globalThis.fetch = state.fetch;
}
