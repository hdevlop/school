import { AsyncLocalStorage } from 'node:async_hooks';
import { JEV_DECISIONS_URL } from '../jev/jevIntents';
import { schoolOss20bProvider } from '../routing/schoolOpenRouterProvider';
import { schoolProviderResponse } from './schoolProviderResponse';

export interface SchoolChatTransportFrame {
  embeddingUrl: string;
  calls: number;
  failedGeneration?: boolean;
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
      data.provider = schoolOss20bProvider();
      body = JSON.stringify(data);
    }
    if (new TextEncoder().encode(body).byteLength > 200_000)
      throw Error('School chat request exceeds bounded context');
    init?.signal?.throwIfAborted();
    frame.calls++;
    try {
      const response = await state.dispatch.run(true, () => fetchImpl(input, { ...init, body, redirect: 'error' }));
      if (generation && !response.ok) frame.failedGeneration = true;
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
