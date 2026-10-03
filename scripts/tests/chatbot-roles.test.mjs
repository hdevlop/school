import { describe, expect, it } from 'bun:test';
import { findLeaks, parseUiStream } from '../chatbot-roles.mjs';

const sse = (...events) => `${events.map((event) => `data: ${JSON.stringify(event)}`).join('\n\n')}\n\ndata: [DONE]\n`;

describe('parseUiStream', () => {
  it('collects text and pairs each tool call with its output or error', () => {
    const parsed = parseUiStream(sse(
      { type: 'tool-input-available', toolCallId: 'a', toolName: 'search_search_students', input: { q: 'Selma' } },
      { type: 'tool-output-available', toolCallId: 'a', output: '[]' },
      { type: 'tool-input-available', toolCallId: 'b', toolName: 'teacher-profile_get_my_students', input: {} },
      { type: 'tool-output-error', toolCallId: 'b', errorText: 'Tool execution failed' },
      { type: 'text-delta', id: 't', delta: 'No student ' },
      { type: 'text-delta', id: 't', delta: 'found.' },
    ));
    expect(parsed.text).toBe('No student found.');
    expect(parsed.tools).toEqual([
      { name: 'search_search_students', input: { q: 'Selma' }, output: '[]', outcome: 'output' },
      { name: 'teacher-profile_get_my_students', input: {}, outcome: 'error', error: 'Tool execution failed' },
    ]);
    expect(parsed.errors).toEqual([]);
  });

  it('reports stream errors and malformed events', () => {
    const parsed = parseUiStream('data: {not json}\n\ndata: {"type":"error","errorText":"boom"}\n');
    expect(parsed.errors).toEqual(['malformed', 'boom']);
  });
});

describe('findLeaks', () => {
  const tools = [{ name: 'students_get_student', output: { id: 'Ab12Cd', name: 'Selma Guessous', parents: [{ phone: '+212 600 000 001' }] } }];

  it('finds a forbidden id, full name or phone in any tool output, ignoring case', () => {
    expect(findLeaks(tools, ['ab12cd', 'SELMA GUESSOUS', '+212 600 000 001', 'Other Name'])).toEqual(['ab12cd', 'SELMA GUESSOUS', '+212 600 000 001']);
  });

  it('ignores the reply text and empty forbidden values', () => {
    expect(findLeaks([{ name: 'search_search_students', output: [] }], ['Selma Guessous', '', null])).toEqual([]);
  });
});
