import { describe, expect, it } from 'bun:test';
import { scoreRoleLookup } from '../chatbot-role-scoring.mjs';
import { measureRoleRequest } from '../chatbot-role-measurement.mjs';
import { createEstimatedBudget } from '../chatbot-budget.mjs';
import { parseUiStream } from '../chatbot-roles.mjs';

const search = { toolCallId: 'lookup', name: 'search_search_students', outcome: 'output', output: '[]' };
const terminal = { toolCallId: 'lookup', name: search.name, outcome: 'executed' };
const reply = (text, tools = [search], spans = [terminal]) => ({ text, tools, sample: { server: { tools: spans } } });

describe('role not-found scoring', () => {
  it('catches the exact retained Darija sentence through the stream and role-scoring path', async () => {
    const analysis = await Bun.file('docs/evidence/chatbot-latency/role-live-analysis-20261006.json').json();
    const row = analysis.anonymizedTranscript.find(item => item.id === 'parent-other-absences-ary');
    // Confirmed empty-search contract reconstructed from the review, not a saved wire response.
    const stream = [
      { type: 'tool-input-available', toolCallId: 'lookup', toolName: search.name, input: { q: 'fixture' } },
      { type: 'tool-output-available', toolCallId: 'lookup', output: '[]' },
      { type: 'text-delta', delta: row.answer },
    ].map(event => `data: ${JSON.stringify(event)}\n\n`).join('');
    const parsed = parseUiStream(stream);
    const scored = scoreRoleLookup({ ...parsed, sample: { server: { tools: [terminal] } } }, row.query);
    expect(scored.failures).toEqual(['empty_attendance_after_missing_student']);
    expect(scored.reviewRequired).toBe(false);
  });
  it.each([
    ['Show absences for the student.', 'No absence records were found.'],
    ['Montre les absences.', "Aucun enregistrement d'absence n'a été trouvé."],
    ['¿Cuáles son sus ausencias?', 'No hay registros de ausencia.'],
    ['اعرض الغياب.', 'لا توجد سجلات غياب لهذا التاريخ.'],
    ['وريني الغياب.', 'ما كاين حتى شي سجل ديال الغياب فهاد التاريخ.'],
  ])('refuses an unsupported absence claim: %s', (query, text) => {
    expect(scoreRoleLookup(reply(text), query).failures).toEqual(['empty_attendance_after_missing_student']);
  });
  it.each([
    ['Show absences.', 'No matching student was found within your selected-year access.'],
    ['Montre les absences.', "Aucun élève correspondant n'a été trouvé."],
    ['اعرض الغياب.', 'لم أجد الطالب ضمن نتائج البحث.'],
    ['وريني الغياب.', 'ما لقيتش التلميذ فنتائج البحث، ما نقدرش نأكد الغياب ديالو.'],
    ['وريني الغياب.', 'ما كاين حتى شي سجل ديال التلميذ اسميتو Zzbench فهاد العام الدراسي. ميمكنش نلقاو معلومات الحضور أو الغياب ديالو.'],
    ['اعرض الغياب.', 'لا توجد سجلات للطالب ضمن نتائج البحث. لا يمكن التحقق من حضوره.'],
  ])('accepts a scoped lookup failure without making attendance claims: %s', (query, text) => {
    expect(scoreRoleLookup(reply(text), query)).toMatchObject({ failures: [], reviewRequired: false });
  });
  it('requires review if another attendance read might concern a different student', () => {
    const read = { toolCallId: 'attendance', name: 'attendance_get_by_student', outcome: 'output', output: [] };
    const scored = scoreRoleLookup(reply('No absence records were found.', [search, read], [terminal,
      { toolCallId: 'attendance', name: read.name, outcome: 'executed' }]), 'Show absences.');
    expect(scored).toMatchObject({ failures: [], reviewRequired: true });
  });
  it('does not mistake another call ID, an error or a malformed result for verified attendance', () => {
    const read = { toolCallId: 'attendance', name: 'attendance_get_by_student', outcome: 'output', output: [] };
    for (const [outcome, toolCallId, output] of [['error', 'attendance', []], ['executed', 'other', []], ['executed', null, []], ['executed', 'attendance', 'invalid']]) {
      const scored = scoreRoleLookup(reply('No absence records were found.', [search, { ...read, output }], [terminal,
        { name: read.name, toolCallId, outcome }]), 'Show absences.');
      expect(scored.failures).toContain('empty_attendance_after_missing_student');
    }
  });
  it('does not apply the missing-student rule to genuine empty attendance or populated search results', () => {
    expect(scoreRoleLookup(reply('No absence records were found.', [], []), 'Show absences.').failures).toEqual([]);
    expect(scoreRoleLookup(reply('No absence records were found.', [{ ...search, output: [{ id: 'fixture' }] }]), 'Show absences.').failures).toEqual([]);
    expect(scoreRoleLookup(reply('No matching student.', [search], [{ ...terminal, outcome: 'error' }]), 'Show absences.').warnings)
      .toEqual([{ code: 'terminal_tool_not_executed', name: search.name, outcome: 'error' }]);
  });
  it('requires review when an apparent empty search lacks matching executed terminal evidence', () => {
    for (const spans of [[], [{ ...terminal, toolCallId: null }], [{ ...terminal, toolCallId: 'other' }], [{ ...terminal, outcome: 'error' }]]) {
      expect(scoreRoleLookup(reply('No absence records were found.', [search], spans), 'Show absences.').reviewRequired).toBe(true);
    }
  });
  it('retains a terminal finance denial even when the UI emits tool-output-available', async () => {
    const name = 'parent-profile_get_children';
    const metadata = { provider: 'openrouter', model: 'mock/model', promptTokens: 2, completionTokens: 1, totalTokens: 3 };
    const parsed = parseUiStream([
      { type: 'tool-input-available', toolCallId: 'denied', toolName: name, input: { parentId: 'private-id' } },
      { type: 'tool-output-available', toolCallId: 'denied', output: { error: 'private-denial-text' } },
      { type: 'text-delta', delta: 'Names from authorized context.' }, { type: 'finish', messageMetadata: metadata },
    ].map(event => `data: ${JSON.stringify(event)}\n\n`).join('') + 'data: [DONE]\n');
    const measured = await measureRoleRequest({ requestId: 'request', sessionId: 'session', role: 'parent',
      budget: createEstimatedBudget(.01, .005), model: 'mock/model',
      prices: { provider: 'openrouter', models: { 'mock/model': { inputUsdPerMillion: 1, outputUsdPerMillion: 1 } } },
      send: async () => ({ ...parsed, httpStatus: 200 }), diagnostics: async () => ({ diagnostics: {
        correlationId: 'request', provider: 'openrouter', model: 'mock/model', embeddings: [],
        tools: [{ toolCallId: 'denied', name, outcome: 'error', durationMs: 3, input: 'private-id', error: 'private-denial-text' }],
        toolFailures: [{ step: 0, code: 'tool_error', count: 1, private: 'private-denial-text' }],
      } }),
    });
    expect(measured.tools[0].outcome).toBe('output');
    expect(scoreRoleLookup(measured, 'What are my children\'s names?').warnings)
      .toEqual([{ code: 'terminal_tool_not_executed', name, outcome: 'error' }]);
    expect(measured.sample.server.tools).toEqual([{ toolCallId: 'denied', name, outcome: 'error', durationMs: 3 }]);
    expect(measured.sample.server.toolFailures).toEqual([{ step: 0, code: 'tool_error', count: 1 }]);
    expect(scoreRoleLookup(measured, 'What are my children\'s names?').failures).toContain('tool_attempt_failed');
    expect(JSON.stringify(measured.sample)).not.toContain('private-');
  });
});
