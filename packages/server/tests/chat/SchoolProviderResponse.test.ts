import { expect, test } from 'bun:test';
import { offeredToolName, schoolProviderResponse } from '../../src/modules/chat/transport/schoolProviderResponse';

const offered = new Set(['grades_get_by_section', 'subjects_get_subjects']);
const frame = (chunk: unknown) => 'data: ' + JSON.stringify(chunk) + '\n\n';
const headers = { 'content-type': 'text/event-stream' };
const event = (delta: unknown, finish: string | null = null) => ({ choices: [{ index: 0, delta, finish_reason: finish }] });
const parse = (body: string) => body.split('\n').filter(line => line.startsWith('data: {')).map(line => JSON.parse(line.slice(6)));

test('only an exact offered name or the observed terminal Harmony suffix is recognized', () => {
  expect(offeredToolName('grades_get_by_section', offered)).toBe('grades_get_by_section');
  expect(offeredToolName('grades_get_by_section<|channel|>', offered)).toBe('grades_get_by_section');
  expect(offeredToolName('grades_get_by_section<|channel|>commentary', offered)).toBe('grades_get_by_section');
  expect(offeredToolName('grades_get_by_section<|channel|>json', offered)).toBe('grades_get_by_section');
  expect(offeredToolName('grades_get_by_section<|channel|>commentary<|channel|>commentary', offered)).toBe('grades_get_by_section');
  for (const name of ['grades_get_by_section_extra', 'functions.grades_get_by_section', 'grades_get_by_section<|channel|>analysis', 'delete_everything<|channel|>commentary', 'grades_get_by_section' + '<|channel|>commentary'.repeat(5)])
    expect(offeredToolName(name, offered)).toBeNull();
});

test('fragmented tool names are adapted once; arguments, IDs and unknown calls stay unchanged', async () => {
  const original = ': keepalive\r\n\r\n' + frame(event({ content: 'We need subject ID.' }))
    + frame(event({ tool_calls: [{ index: 0, id: 'call-a', type: 'function', function: { name: 'grades_get_by_', arguments: '{"sectionId":' } }] }))
    + frame(event({ tool_calls: [{ index: 0, function: { name: 'section<|chan', arguments: '"section-a",' } }] }))
    + frame(event({ tool_calls: [{ index: 0, function: { name: 'nel|>commentary', arguments: '"subjectId":"subject-a"}' } },
      { index: 1, id: 'call-b', type: 'function', function: { name: 'unknown<|channel|>commentary', arguments: '{}' } }] }, 'tool_calls'))
    + 'data: [DONE]\n\n';
  const bytes = new TextEncoder().encode(original); let position = 0, failures = 0;
  const stream = new ReadableStream<Uint8Array>({ pull(controller) {
    if (position < bytes.length) { controller.enqueue(bytes.slice(position, position + 7)); position += 7; } else controller.close();
  } });
  const result = await schoolProviderResponse(new Response(stream, { headers }), offered, () => failures++).text();
  const chunks = parse(result), calls = chunks.flatMap(chunk => chunk.choices[0].delta.tool_calls ?? []);
  expect(failures).toBe(0);
  expect(result).not.toContain('We need');
  expect(result).toContain(': keepalive');
  expect(calls.filter(call => call.index === 0).map(call => call.function.name ?? '').join('')).toBe('grades_get_by_section');
  expect(calls.filter(call => call.index === 0).map(call => call.function.arguments).join('')).toBe('{"sectionId":"section-a","subjectId":"subject-a"}');
  expect(calls[0].id).toBe('call-a');
  expect(calls.at(-1).function.name).toBe('unknown<|channel|>commentary');
});

test('answer-only completions and repeated terminal usage frames retain text and usage', async () => {
  const original = frame(event({ content: 'ما كايناش سجلات.' }, 'stop'))
    + frame({ ...event({}, 'stop'), usage: { total_tokens: 5 } }) + 'data: [DONE]\n\n';
  expect(await schoolProviderResponse(new Response(original, { headers }), offered, () => {}).text()).toBe(original);
  const response = new Response('non-stream');
  expect(schoolProviderResponse(response, offered, () => {})).toBe(response);
});

test('truncated and oversized completions fail without publishing partial text', async () => {
  for (const original of [frame(event({ content: 'partial' })), 'x'.repeat(1_048_577)]) {
    let failures = 0;
    await expect(schoolProviderResponse(new Response(original, { headers }), offered, () => failures++).text()).rejects.toThrow();
    expect(failures).toBe(1);
  }
});

test('provider errors remain errors, and cancellation reaches the underlying stream', async () => {
  const original = frame({ error: { code: 'server_error' }, ...event({}, 'error') }) + 'data: [DONE]\n\n';
  expect(await schoolProviderResponse(new Response(original, { headers }), offered, () => {}).text()).toBe(original);
  let cancelled = false;
  const source = new ReadableStream<Uint8Array>({ cancel() { cancelled = true; } });
  const response = schoolProviderResponse(new Response(source, { headers }), offered, () => {});
  await response.body!.cancel();
  expect(cancelled).toBe(true);
});
