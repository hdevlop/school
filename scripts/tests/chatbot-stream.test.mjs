import { describe, expect, it } from 'bun:test';
import { createUiStreamParser, percentile } from '../chatbot-stream.mjs';

const encoder = new TextEncoder();
const sse = (chunk) => `data: ${typeof chunk === 'string' ? chunk : JSON.stringify(chunk)}\n\n`;

function parseInPieces(text, size, startMs = 10) {
  const parser = createUiStreamParser();
  const bytes = encoder.encode(text);
  let now = startMs;
  for (let offset = 0; offset < bytes.length; offset += size) {
    parser.push(bytes.slice(offset, offset + size), now++);
  }
  return parser.end(now);
}

const answer = [
  { type: 'start' },
  { type: 'start-step' },
  { type: 'tool-input-start', toolCallId: 'c1', toolName: 'students_get_student_count' },
  { type: 'tool-input-available', toolCallId: 'c1', toolName: 'students_get_student_count', input: {} },
  { type: 'tool-output-available', toolCallId: 'c1', output: { count: 106 } },
  { type: 'finish-step' },
  { type: 'start-step' },
  { type: 'text-start', id: 't1' },
  { type: 'text-delta', id: 't1', delta: '' },
  { type: 'text-delta', id: 't1', delta: 'Il y a ' },
  { type: 'text-delta', id: 't1', delta: '106 élèves — مرحبا.' },
  { type: 'text-end', id: 't1' },
  { type: 'finish-step' },
  { type: 'finish', finishReason: 'stop', messageMetadata: { usage: { inputTokens: 10, outputTokens: 5 } } },
].map(sse).join('') + sse('[DONE]');

describe('UI message stream parser', () => {
  it('produces the same result however the network splits bytes', () => {
    const whole = parseInPieces(answer, 1_000_000);
    for (const size of [1, 2, 3, 7, 64]) {
      const split = parseInPieces(answer, size);
      expect(split.text).toBe(whole.text);
      expect(split.tools).toEqual(whole.tools);
      expect(split.finishReason).toBe('stop');
      expect(split.done).toBe(true);
    }
    expect(whole.text).toBe('Il y a 106 élèves — مرحبا.');
    expect(whole.tools).toEqual([{ name: 'students_get_student_count', input: true, outcome: 'output' }]);
    expect(whole.metadata).toEqual({ usage: { inputTokens: 10, outputTokens: 5 } });
  });

  it('times first text at the first non-empty delta, not the first byte or tool events', () => {
    const parser = createUiStreamParser();
    const events = answer.split('\n\n').filter(Boolean).map((event) => `${event}\n\n`);
    events.forEach((event, index) => parser.push(encoder.encode(event), 100 + index));
    const result = parser.end(999);
    expect(result.firstByteMs).toBe(100);
    expect(result.firstTextMs).toBe(100 + events.findIndex((event) => event.includes('Il y a')));
    expect(result.finishMs).toBe(100 + events.findIndex((event) => event.includes('"finish"')));
  });

  it('accepts CRLF framing and a final event without a trailing blank line', () => {
    const text = `data: ${JSON.stringify({ type: 'text-delta', id: 't', delta: 'ok' })}\r\n\r\n`
      + `data: ${JSON.stringify({ type: 'finish' })}`;
    const result = parseInPieces(text, 5);
    expect(result.text).toBe('ok');
    expect(result.finishMs).not.toBeNull();
  });

  it('records errors, denied or failed tools, aborts and malformed events', () => {
    const text = [
      { type: 'tool-input-available', toolCallId: 'w', toolName: 'attendance_mark', input: {} },
      { type: 'tool-output-denied', toolCallId: 'w' },
      { type: 'tool-input-available', toolCallId: 'e', toolName: 'grades_create', input: {} },
      { type: 'tool-output-error', toolCallId: 'e', errorText: 'blocked' },
      { type: 'error', errorText: 'x'.repeat(500) },
      { type: 'abort' },
    ].map(sse).join('') + sse('{not json');
    const result = parseInPieces(text, 11);
    expect(result.tools.map((tool) => tool.outcome)).toEqual(['denied', 'error']);
    expect(result.errors[0]).toHaveLength(200);
    expect(result.aborted).toBe(true);
    expect(result.malformed).toBe(1);
    expect(result.finishMs).toBeNull();
    expect(result.firstTextMs).toBeNull();
  });
});

describe('percentile', () => {
  it('uses nearest rank and ignores missing values', () => {
    expect(percentile([], 50)).toBeNull();
    expect(percentile([null, 30, 10, 20], 50)).toBe(20);
    expect(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 95)).toBe(10);
    expect(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 50)).toBe(5);
  });
});

describe('client stream milestones', () => {
  it('separates tool and answer steps while retaining no event payloads', () => {
    const parser = createUiStreamParser({ captureStreamTimings: true });
    const push = (chunk, ms) => parser.push(encoder.encode(sse(chunk)), ms);
    push({ type: 'start', messageId: 'private-message-id' }, 20);
    push({ type: 'start-step' }, 30);
    push({ type: 'tool-input-available', toolCallId: 'c', toolName: 'private-tool', input: { secret: 'private-input' } }, 2000);
    push({ type: 'tool-output-available', toolCallId: 'c', output: 'private-result' }, 2005);
    push({ type: 'finish-step' }, 2010);
    push({ type: 'start-step' }, 2020);
    push({ type: 'text-delta', delta: '' }, 3000);
    push({ type: 'text-delta', delta: 'private-answer' }, 8000);
    push({ type: 'text-delta', delta: '.' }, 8010);
    push({ type: 'finish-step' }, 8020);
    push({ type: 'finish', messageMetadata: { private: 'private-metadata' } }, 8030);
    const result = parser.end(8040);
    expect(result.streamTimings).toEqual({ events: [
      { type: 'start', atMs: 20, stepIndex: null },
      { type: 'start-step', atMs: 30, stepIndex: 0 },
      { type: 'tool-input-available', atMs: 2000, stepIndex: 0 },
      { type: 'tool-output-available', atMs: 2005, stepIndex: 0 },
      { type: 'finish-step', atMs: 2010, stepIndex: 0 },
      { type: 'start-step', atMs: 2020, stepIndex: 1 },
      { type: 'first-text', atMs: 8000, stepIndex: 1 },
      { type: 'finish-step', atMs: 8020, stepIndex: 1 },
      { type: 'finish', atMs: 8030, stepIndex: 1 },
    ], droppedEvents: 0, lastTextMs: 8010 });
    expect(JSON.stringify(result.streamTimings)).not.toContain('private');
    expect(result.firstTextMs).toBe(8000);
  });

  it('handles fragmented template events without inventing model steps', () => {
    const parser = createUiStreamParser({ captureStreamTimings: true });
    const bytes = encoder.encode(sse({ type: 'text-delta', delta: 'مرحبا' }) + sse({ type: 'finish' }));
    for (let i = 0; i < bytes.length; i++) parser.push(bytes.slice(i, i + 1), i);
    const result = parser.end(bytes.length);
    expect(result.text).toBe('مرحبا');
    expect(result.streamTimings.events.map(event => [event.type, event.stepIndex])).toEqual([['first-text', null], ['finish', null]]);
    expect(result.streamTimings.events[0].atMs).toBe(result.firstTextMs);
    expect(result.streamTimings.events[1].atMs).toBe(result.finishMs);
  });

  it('bounds milestone storage and makes truncation visible; default capture stays off', () => {
    const parser = createUiStreamParser({ captureStreamTimings: true });
    for (let i = 0; i < 140; i++) parser.push(encoder.encode(sse({ type: 'start-step' })), i);
    parser.push(encoder.encode(sse({ type: 'finish' })), 150);
    const result = parser.end(151);
    expect(result.streamTimings.events).toHaveLength(128);
    expect(result.streamTimings.droppedEvents).toBe(13);
    expect(result.finishMs).toBe(150);
    expect(createUiStreamParser().end(0).streamTimings).toBeUndefined();
  });
});
