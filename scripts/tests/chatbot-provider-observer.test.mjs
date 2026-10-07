import { expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('billing observer forwards unchanged response and writes identifiers/cost without text or credentials', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'school-provider-observer-'));
  const path = join(dir, 'usage.jsonl'), original = globalThis.fetch;
  const prior = process.env.CHATBOT_PROVIDER_OBSERVER_FILE;
  const payload = 'data: {"id":"gen-example","model":"openai/gpt-oss-20b","provider":"Example","choices":[{"delta":{"content":"private generated text"}}]}\n\ndata: {"usage":{"prompt_tokens":10,"completion_tokens":2,"cost":0.00001}}\n\ndata: [DONE]\n\n';
  try {
    process.env.CHATBOT_PROVIDER_OBSERVER_FILE = path;
    globalThis.fetch = async () => new Response(payload, { headers: { 'content-type': 'text/event-stream' } });
    await import('../chatbot-provider-observer.mjs');
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions',
      { method: 'POST', headers: { authorization: 'Bearer private credential' }, body: 'private question' });
    expect(await response.text()).toBe(payload);
    for (let i = 0; !existsSync(path) && i < 100; i++) await Bun.sleep(10);
    const text = readFileSync(path, 'utf8'), record = JSON.parse(text);
    expect(record).toMatchObject({ generationId: 'gen-example', model: 'openai/gpt-oss-20b',
      provider: 'Example', usage: { cost: 0.00001 }, status: 200 });
    expect(text).not.toContain('private'); expect(text).not.toContain('choices');
    await fetch('https://other.example.com/chat');
    expect(readFileSync(path, 'utf8')).toBe(text);
  } finally {
    globalThis.fetch = original;
    if (prior === undefined) delete process.env.CHATBOT_PROVIDER_OBSERVER_FILE;
    else process.env.CHATBOT_PROVIDER_OBSERVER_FILE = prior;
    rmSync(dir, { recursive: true, force: true });
  }
});
