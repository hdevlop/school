import { expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('billing observer forwards unchanged response and writes identifiers/cost without text or credentials', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'school-provider-observer-'));
  const path = join(dir, 'usage.jsonl'), original = globalThis.fetch;
  const prior = process.env.CHATBOT_PROVIDER_OBSERVER_FILE;
  const priorNames = process.env.CHATBOT_PROVIDER_OBSERVER_TOOL_NAMES;
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
    process.env.CHATBOT_PROVIDER_OBSERVER_TOOL_NAMES = 'true';
    await fetch('https://openrouter.ai/api/v1/chat/completions', { method: 'POST', body: JSON.stringify({
      messages: [{ content: 'private question' }], tools: [{ function: { name: 'students_get_student_count', description: 'private schema' } }] }) });
    for (let i = 0; readFileSync(path, 'utf8').trim().split('\n').length < 2 && i < 100; i++) await Bun.sleep(10);
    const captured = readFileSync(path, 'utf8');
    expect(JSON.parse(captured.trim().split('\n')[1]).requestToolNames).toEqual(['students_get_student_count']);
    expect(captured).not.toContain('private');
  } finally {
    globalThis.fetch = original;
    if (prior === undefined) delete process.env.CHATBOT_PROVIDER_OBSERVER_FILE;
    else process.env.CHATBOT_PROVIDER_OBSERVER_FILE = prior;
    if (priorNames === undefined) delete process.env.CHATBOT_PROVIDER_OBSERVER_TOOL_NAMES;
    else process.env.CHATBOT_PROVIDER_OBSERVER_TOOL_NAMES = priorNames;
    rmSync(dir, { recursive: true, force: true });
  }
});

test('observer extracts only offered names, never request text or schemas', async () => {
  const { benchmarkToolNames } = await import('../chatbot-provider-observer.mjs');
  const body = JSON.stringify({ messages: [{ content: 'DO_NOT_PERSIST' }], tools: [
    { function: { name: 'students_get_student_count', description: 'PRIVATE_SCHEMA' } },
    { function: { name: 'teachers_get_teacher_count' } }, { function: { name: 'bad<|channel|>' } }] });
  expect(benchmarkToolNames(body)).toEqual(['students_get_student_count', 'teachers_get_teacher_count']);
  expect(benchmarkToolNames('malformed')).toBeNull();
  expect(benchmarkToolNames(undefined)).toBeNull();
  expect(benchmarkToolNames(JSON.stringify({ tools: [] }))).toEqual([]);
});
