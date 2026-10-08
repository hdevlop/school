/** Benchmark-only Node preload. Persist usage and opt-in tool names, never request bodies or generated text. */
import { appendFileSync } from 'node:fs';
export function benchmarkToolNames(body) {
  try {
    const value = typeof body === 'string' ? JSON.parse(body) : null;
    return Array.isArray(value?.tools) ? [...new Set(value.tools.slice(0, 512).map(tool => tool?.function?.name)
      .filter(name => typeof name === 'string' && /^[\w-]{1,200}$/u.test(name)))] : null;
  } catch { return null; }
}
const output = process.env.CHATBOT_PROVIDER_OBSERVER_FILE;
if (output) {
  const original = globalThis.fetch;
  globalThis.fetch = async function observedFetch(input, init) {
    const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
    const startedAt = new Date().toISOString();
    const response = await original.call(this, input, init);
    if (url.hostname === 'openrouter.ai' && url.pathname === '/api/v1/chat/completions' && response.body) {
      const record = { startedAt, status: response.status, generationId: null, model: null, provider: null, usage: null };
      if (process.env.CHATBOT_PROVIDER_OBSERVER_TOOL_NAMES === 'true') record.requestToolNames = benchmarkToolNames(init?.body);
      void observe(response.clone(), record).catch(() => {});
    }
    return response;
  };
  async function observe(response, record) {
    const reader = response.body.getReader(), decoder = new TextDecoder();
    let buffer = '', bytes = 0;
    const capture = value => {
      if (typeof value.id === 'string') record.generationId = value.id;
      if (typeof value.model === 'string') record.model = value.model;
      if (typeof value.provider === 'string') record.provider = value.provider;
      if (value.usage) record.usage = value.usage;
    };
    const timer = setTimeout(() => { void reader.cancel().catch(() => {}); }, 125000);
    try {
      while (true) {
        const part = await reader.read(); if (part.done) break;
        bytes += part.value.byteLength;
        if (bytes > 2000000) throw Error('Observer size limit');
        buffer += decoder.decode(part.value, { stream: true });
        let newline;
        while ((newline = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, newline).trim(); buffer = buffer.slice(newline + 1);
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try { capture(JSON.parse(line.slice(6))); } catch { /* SSE comments/non-JSON are not billing. */ }
          }
        }
      }
      if (buffer.trim().startsWith('{')) capture(JSON.parse(buffer));
    } catch { record.incomplete = true; }
    finally {
      clearTimeout(timer); void reader.cancel().catch(() => {});
      appendFileSync(output, `${JSON.stringify({ ...record, completedAt: new Date().toISOString() })}\n`);
    }
  }
}
