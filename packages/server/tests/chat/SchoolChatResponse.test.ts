import 'reflect-metadata';
import { expect, test } from 'bun:test';
import { ChatAgent } from 'najm-chatbot';
import { scriptedModel } from 'najm-chatbot/testing';
import { schoolChatResponse, schoolChatFailureText, schoolChatToolFailureText, latestChatUserText } from '../../src/modules/chat/schoolChatResponse';
import { createJevFixture } from './jevFixture';

const frame = (value: unknown) => 'data: ' + JSON.stringify(value) + '\n\n';
const start = frame({ type: 'start', messageId: 'original-id' });
const finish = frame({ type: 'finish', finishReason: 'stop' });
const done = 'data: [DONE]\n\n';
const headers = { 'content-type': 'text/event-stream', 'x-vercel-ai-ui-message-stream': 'v1', 'cache-control': 'no-cache' };
const reply = (body: BodyInit | ReadableStream<Uint8Array>) => new Response(body, { headers });
const events = (body: string) => body.split('\n').filter(line => line.startsWith('data: ') && !line.includes('[DONE]')).map(line => JSON.parse(line.slice(6)));
const text = (body: string) => events(body).filter(x => x.type === 'text-delta').map(x => x.delta).join('');

test('failed tool attempts stay visible after a later successful answer without another generation', async () => {
  const inputFailure = { type: 'tool-input-error', toolCallId: 'bad', toolName: 'unknown', input: {}, errorText: 'private validation body' };
  const outputFailure = { type: 'tool-output-error', toolCallId: 'bad', errorText: 'private upstream body' };
  const success = frame({ type: 'tool-output-available', toolCallId: 'good', output: { count: 44 } });
  const original = start + frame(inputFailure) + frame(outputFailure) + success
    + frame({ type: 'text-start', id: 'answer' }) + frame({ type: 'text-delta', id: 'answer', delta: 'عندك 44 تلميذ.' })
    + frame({ type: 'text-end', id: 'answer' }) + frame({ type: 'finish', finishReason: 'stop', messageMetadata: { totalCost: 0.001 } }) + done;
  const body = await schoolChatResponse(reply(original), 'شحال من تلميذ عندي؟').text();
  expect(text(body)).toBe('عندك 44 تلميذ.\n\n' + schoolChatToolFailureText('شحال من تلميذ عندي؟'));
  expect(body).not.toContain('private');
  expect(events(body).find(x => x.type === 'tool-input-error').input).toEqual({});
  expect(events(body).find(x => x.type === 'finish').messageMetadata).toEqual({ totalCost: 0.001, schoolReplyOutcome: 'tool_failure', schoolFailedToolCalls: 1 });
  expect(events(body).filter(x => x.type === 'text-end').at(-1)).toBeDefined();
  expect(events(body).findIndex(x => x.id?.startsWith('school-unavailable-'))).toBeLessThan(events(body).findIndex(x => x.type === 'finish'));
});
test('MCP error results are failures, while empty reads and ordinary Error-like record fields are not', async () => {
  const answer = frame({ type: 'text-delta', id: 'a', delta: 'جواب' });
  for (const output of ['Error (FORBIDDEN): Access denied', 'Tool execution failed']) {
    const body = await schoolChatResponse(reply(start + frame({ type: 'tool-output-available', toolCallId: 'bad', output }) + answer + finish + done), 'بغيت النقط').text();
    expect(events(body).find(x => x.type === 'finish').messageMetadata.schoolReplyOutcome).toBe('tool_failure');
    expect(events(body).find(x => x.type === 'tool-output-available').output).toBe(output);
  }
  for (const output of [[], { name: 'Error (FORBIDDEN): a real record name' }, '[]']) {
    const original = start + frame({ type: 'tool-output-available', toolCallId: 'good', output }) + answer + finish + done;
    expect(await schoolChatResponse(reply(original), 'بغيت النقط').text()).toBe(original);
  }
});
test('failed reads without a visible answer remain unavailable; cancellation adds no warning', async () => {
  const failure = frame({ type: 'tool-output-error', toolCallId: 'bad', errorText: 'private error' });
  const body = await schoolChatResponse(reply(start + failure + finish + done), 'بغيت النقط').text();
  expect(text(body)).toBe(schoolChatFailureText('بغيت النقط'));
  expect(events(body).find(x => x.type === 'finish').messageMetadata).toEqual({ schoolReplyOutcome: 'unavailable', schoolFailedToolCalls: 1 });
  const abort = new AbortController(); abort.abort();
  const original = start + failure + finish + done;
  expect(await schoolChatResponse(reply(original), 'بغيت النقط', abort.signal).text()).toBe(original);
});
test('an oversized SDK tool error remains observable without buffering its full payload', async () => {
  const failure = { type: 'tool-input-error', toolCallId: 'large-bad', toolName: 'unknown', input: 'x'.repeat(600000), errorText: 'invalid input' };
  const original = start + frame(failure) + frame({ type: 'text-delta', id: 'answer', delta: 'جواب' }) + finish + done;
  const bytes = new TextEncoder().encode(original); let i = 0;
  const stream = new ReadableStream<Uint8Array>({ pull(controller) { if (i < bytes.length) { controller.enqueue(bytes.slice(i, i + 65536)); i += 65536; } else controller.close(); } });
  const body = await schoolChatResponse(reply(stream), 'بغيت النقط').text();
  expect(events(body).find(x => x.type === 'tool-input-error')).toEqual(failure);
  expect(events(body).find(x => x.type === 'finish').messageMetadata.schoolFailedToolCalls).toBe(1);
  expect(text(body)).toContain(schoolChatToolFailureText('بغيت النقط'));
});

test('empty completed stream becomes a visible unavailable reply before finish, with honest usage', async () => {
  const usage = { totalCost: 0.001, pricingFound: true, model: 'openai/gpt-oss-20b' };
  const original = start + frame({ type: 'finish', finishReason: 'stop', messageMetadata: usage }) + done;
  const response = schoolChatResponse(reply(original), 'وريني النقط ديالي');
  const body = await response.text(), parsed = events(body);
  expect(text(body)).toBe(schoolChatFailureText('وريني النقط ديالي'));
  expect(parsed.find(x => x.type === 'start').messageId).toBe('original-id');
  expect(parsed.find(x => x.type === 'finish').messageMetadata).toEqual({ ...usage, schoolReplyOutcome: 'unavailable' });
  expect(parsed.findIndex(x => x.type === 'text-end')).toBeLessThan(parsed.findIndex(x => x.type === 'finish'));
  expect(response.headers.get('cache-control')).toBe('no-cache');
  const unknown = events(await schoolChatResponse(reply(start + finish + done), 'hello').text()).find(x => x.type === 'finish').messageMetadata;
  expect(unknown).toEqual({ schoolReplyOutcome: 'unavailable' });
});

test('successful multilingual replies and tool results pass through byte-for-byte', async () => {
  const original = start + frame({ type: 'tool-output-available', toolCallId: 'read', output: { count: 44 } })
    + frame({ type: 'text-start', id: 'answer' }) + frame({ type: 'text-delta', id: 'answer', delta: 'عندك 44 تلميذ.' })
    + frame({ type: 'text-end', id: 'answer' }) + finish + done;
  const bytes = new TextEncoder().encode(original); let i = 0;
  const fragmented = new ReadableStream<Uint8Array>({ pull(controller) { if (i < bytes.length) controller.enqueue(bytes.slice(i, ++i)); else controller.close(); } });
  expect(await schoolChatResponse(reply(fragmented), 'شحال من تلميذ عندي؟').text()).toBe(original);
});

test('tool-only completion shows failure without inventing facts or altering outputs', async () => {
  const tool = { type: 'tool-output-available', toolCallId: 'read', output: { studentCount: 44 } };
  const body = await schoolChatResponse(reply(start + frame(tool) + finish + done), 'ch7al mn tilmid 3ndi?').text();
  expect(text(body)).toBe(schoolChatFailureText('ch7al mn tilmid 3ndi?'));
  expect(text(body)).not.toContain('44');
  expect(events(body).find(x => x.type === tool.type)).toEqual(tool);
});

test('provider errors stay errors and expose only the localized failure message', async () => {
  const body = await schoolChatResponse(reply(start + frame({ type: 'error', errorText: 'private upstream body' }) + finish + done), 'بغيت النقط').text();
  expect(body).not.toContain('private upstream body');
  expect(events(body).find(x => x.type === 'error').errorText).toBe(schoolChatFailureText('بغيت النقط'));
  expect(text(body)).toBe(schoolChatFailureText('بغيت النقط'));
  const partial = start + frame({ type: 'text-start', id: 'partial' }) + frame({ type: 'text-delta', id: 'partial', delta: 'A partial answer.' })
    + frame({ type: 'text-end', id: 'partial' }) + frame({ type: 'error', errorText: 'provider error' }) + finish + done;
  const partialBody = await schoolChatResponse(reply(partial), 'hello').text();
  expect(text(partialBody)).toBe('A partial answer.\n\n' + schoolChatFailureText('hello'));
  expect(events(partialBody).find(x => x.type === 'finish').messageMetadata.schoolReplyOutcome).toBe('unavailable');
});

test('visible text streams before completion instead of buffering the whole reply', async () => {
  const prefix = start + frame({ type: 'text-delta', id: 'answer', delta: 'Early answer' });
  const source = new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(new TextEncoder().encode(prefix)); } });
  const reader = schoolChatResponse(reply(source), 'hello').body!.getReader();
  const first = await reader.read();
  const second = await reader.read();
  expect(new TextDecoder().decode(first.value) + new TextDecoder().decode(second.value)).toBe(prefix);
  await reader.cancel();
});

test('truncated and thrown provider streams become visible failures, not fake completions', async () => {
  for (const original of [start + 'data: {"type":"text-delta","delta":"unfinished', start + done]) {
    const body = await schoolChatResponse(reply(original), 'hello').text();
    expect(text(body)).toBe(schoolChatFailureText('hello'));
    expect(events(body).some(x => x.type === 'error')).toBe(true);
    expect(events(body).some(x => x.type === 'finish')).toBe(false);
  }
  let reads = 0;
  const broken = new ReadableStream<Uint8Array>({ pull(controller) { if (!reads++) controller.enqueue(new TextEncoder().encode(start)); else controller.error(Error('private provider failure')); } });
  const body = await schoolChatResponse(reply(broken), 'hello').text();
  expect(text(body)).toBe(schoolChatFailureText('hello'));
  expect(body).not.toContain('private provider failure');
});

test('cancellation and user stop propagate without generating a failure reply', async () => {
  const original = start + frame({ type: 'abort' }) + finish + done;
  expect(await schoolChatResponse(reply(original), 'hello').text()).toBe(original);
  const abort = new AbortController(); abort.abort();
  expect(await schoolChatResponse(reply(start + finish + done), 'hello', abort.signal).text()).toBe(start + finish + done);
  let reason: unknown;
  const source = new ReadableStream<Uint8Array>({ cancel(value) { reason = value; } });
  await schoolChatResponse(reply(source), 'hello').body!.cancel('user stopped');
  expect(reason).toBe('user stopped');
});

test('large tool output passes through while empty answer still receives a notice', async () => {
  const tool = { type: 'tool-output-available', toolCallId: 'read', output: 'x'.repeat(600000) };
  const original = start + frame(tool) + finish + done, bytes = new TextEncoder().encode(original); let i = 0;
  const source = new ReadableStream<Uint8Array>({ pull(controller) { if (i < bytes.length) { controller.enqueue(bytes.slice(i, i + 65536)); i += 65536; } else controller.close(); } });
  const body = await schoolChatResponse(reply(source), 'hello').text();
  expect(events(body).find(x => x.type === tool.type)).toEqual(tool);
  expect(text(body)).toBe(schoolChatFailureText('hello'));
});

test('authorization and non-chat responses are untouched; language uses latest user text', () => {
  for (const response of [Response.json({ error: 'Forbidden' }, { status: 403 }), Response.json({ year: '2026-2027' }), new Response(null, { status: 204 })]) {
    expect(schoolChatResponse(response, 'hello')).toBe(response);
  }
  expect(latestChatUserText([{ role: 'user', content: 'old' }, { role: 'assistant', parts: [{ type: 'text', text: 'French answer' }] }, { role: 'user', parts: [{ type: 'text', text: 'بغيت' }, { type: 'file' }, { type: 'text', text: 'النقط' }] }])).toBe('بغيت النقط');
  expect(latestChatUserText([{ role: 'user', content: 'legacy' }])).toBe('legacy');
  expect(latestChatUserText(null)).toBe('');
});

test('real School chat middleware repairs empty provider output after auth/year guards', async () => {
  const fixture = await createJevFixture();
  try {
    let calls = 0;
    fixture.server.container.get(ChatAgent).stream = async () => { calls++; return reply(start + finish + done); };
    const messages = [{ role: 'user', parts: [{ type: 'text', text: 'عطيني النقط ديال تلميذ ما كيقراش عندي.' }] }];
    const response = await fixture.call('/chat', { messages }, 'teacher');
    expect(response.status).toBe(200);
    const body = await response.text();
    expect(text(body)).toBe(schoolChatFailureText(messages[0].parts[0].text));
    expect(events(body).find(x => x.type === 'finish').messageMetadata.schoolReplyOutcome).toBe('unavailable');
    expect(calls).toBe(1);
    const denied = await fixture.call('/chat', { messages }, 'teacher', '2025-2026');
    expect(denied.status).toBe(403); expect(calls).toBe(1);
  } finally { await fixture.server.stop(); }
});

test('the published ChatAgent and SDK empty model result get a notice with one generation', async () => {
  const fixture = await createJevFixture();
  try {
    const model = scriptedModel(''); let generations = 0;
    const stream = model.doStream.bind(model);
    model.doStream = async options => { generations++; return stream(options); };
    (fixture.server.container.get(ChatAgent) as any).buildModel = () => model;
    const query = 'عطيني النقط ديال تلميذ ما كيقراش عندي.';
    const response = await fixture.call('/chat', { messages: [{ role: 'user', parts: [{ type: 'text', text: query }] }] }, 'teacher');
    const body = await response.text();
    expect(text(body)).toBe(schoolChatFailureText(query));
    expect(events(body).find(x => x.type === 'finish').messageMetadata.schoolReplyOutcome).toBe('unavailable');
    expect(generations).toBe(1);
  } finally { await fixture.server.stop(); }
});
