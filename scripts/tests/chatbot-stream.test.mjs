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
