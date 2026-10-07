import { describe, expect, it } from 'bun:test';
import { findLeaks, parseUiStream, planRoleSchedule } from '../chatbot-roles.mjs';

const sse = (...events) => `${events.map((event) => `data: ${JSON.stringify(event)}`).join('\n\n')}\n\ndata: [DONE]\n`;

describe('bounded role schedule', () => {
  it('keeps the original ten scenarios/twelve turns and counts repeated follow-ups twice', () => {
    expect(planRoleSchedule()).toMatchObject({ repeat: 1, plannedChatRequests: 12 });
    const focus = planRoleSchedule(['parent-children-en', 'parent-other-absences-ary'], 3);
    expect(focus.plannedChatRequests).toBe(6);
    expect(focus.jobs).toHaveLength(6);
    expect(planRoleSchedule(['admin-follow-up-fr'], 3).plannedChatRequests).toBe(6);
  });
  it('rejects unknown/duplicate/empty choices and invalid repetitions', () => {
    for (const ids of [[], ['unknown'], ['parent-children-en', 'parent-children-en'], ['']]) {
      expect(() => planRoleSchedule(ids)).toThrow();
    }
    for (const repeat of [0, 6, 1.5, NaN, Infinity]) expect(() => planRoleSchedule(['parent-children-en'], repeat)).toThrow();
  });
});

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
      { toolCallId: 'a', name: 'search_search_students', input: { q: 'Selma' }, output: '[]', outcome: 'output' },
      { toolCallId: 'b', name: 'teacher-profile_get_my_students', input: {}, outcome: 'error', error: 'Tool execution failed' },
    ]);
    expect(parsed.errors).toEqual([]);
  });

  it('reports stream errors and malformed events', () => {
    const parsed = parseUiStream('data: {not json}\n\ndata: {"type":"error","errorText":"boom"}\n');
    expect(parsed.errors).toEqual(['malformed', 'boom']);
  });
});

describe('findLeaks', () => {
  const tools = [{ name: 'students_get_student_by_id', output: { id: 'Ab12Cd', name: 'Selma Guessous', parents: [{ phone: '+212 600 000 001' }] } }];

  it('finds a forbidden id, full name or phone in any tool output, ignoring case', () => {
    expect(findLeaks(tools, ['ab12cd', 'SELMA GUESSOUS', '+212 600 000 001', 'Other Name'])).toEqual(['ab12cd', 'SELMA GUESSOUS', '+212 600 000 001']);
  });

  it('ignores the reply text and empty forbidden values', () => {
    expect(findLeaks([{ name: 'search_search_students', output: [] }], ['Selma Guessous', '', null])).toEqual([]);
  });
});
