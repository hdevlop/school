import { describe, expect, it } from 'bun:test';
import { createUiStreamParser } from '../chatbot-stream.mjs';
import { scoreReply, validateCorpus } from '../chatbot-scoring.mjs';

const name = 'attendance_get_today_students';
const item = language => ({ id: `attendance-${language}`, kind: 'single-read', language,
  query: 'Attendance', expectedToolGroups: [[name]], emptyResultTools: [name] });
const server = outcome => ({ tools: [{ name, outcome }] });
function parse(text, output = '[]', outcome = 'available') {
  const parser = createUiStreamParser({ captureToolResultSummaries: true });
  for (const chunk of [
    { type: 'tool-input-available', toolCallId: 'read', toolName: name, input: {} },
    { type: `tool-output-${outcome}`, toolCallId: 'read', output },
    { type: 'text-delta', delta: text }, { type: 'finish' },
  ]) parser.push(new TextEncoder().encode(`data: ${JSON.stringify(chunk)}\n\n`), 0);
  return parser.end(1);
}

describe('successful empty attendance reads', () => {
  it('rejects the retained Arabic failure through the real stream/scoring path', () => {
    // Exact reply from attendance-today-ar #2; paired with the empty read contract.
    const text = 'حضور التلاميذ اليوم غير متوفر. يرجى التحقق من إعدادات النظام أو المحاولة في وقت لاحق.';
    const checks = scoreReply(item('ar'), parse(text), server('executed'));
    expect(checks.passed).toBe(false);
    expect(checks.factFailures).toContainEqual({ code: 'empty_read_unavailable', index: 0 });
    expect(checks.factFailures).toContainEqual({ code: 'empty_read_not_reported', index: 0 });
    expect(checks.reviewRequired).toBe(false);
  });
  it.each([
    ['en', 'No attendance records were found for today.'],
    ['fr', "Aucun enregistrement de présence n'a été trouvé pour cette date."],
    ['es', 'No hay registros de asistencia para hoy.'],
    ['ar', 'لا توجد سجلات حضور أو غياب مسجلة لهذا التاريخ.'],
    ['ary', 'ما كاين حتى شي سجل ديال الحضور ولا الغياب فهاد التاريخ.'],
    ['ary', 'الحضور ديال التلاميذ اليوم ماكاينش حيث ما لقاوش بيانات.'],
  ])('accepts an honest empty result in %s', (language, text) => {
    expect(scoreReply(item(language), parse(text), server('executed')).passed).toBe(true);
  });
  it.each([
    ['en', 'Attendance is unavailable. Please try again.'],
    ['fr', 'Les présences sont indisponibles. Veuillez réessayer.'],
    ['es', 'Los datos no están disponibles. Vuelve a intentarlo.'],
    ['ar', 'لا توجد سجلات حضور اليوم. البيانات غير مُتوفّرة.'],
    ['ary', 'ما كاين حتى شي سجل ديال الحضور. عاود جرب من بعد.'],
  ])('does not label a successful empty read unavailable in %s', (language, text) => {
    expect(scoreReply(item(language), parse(text), server('executed')).factFailures)
      .toContainEqual({ code: 'empty_read_unavailable', index: 0 });
  });
  it('does not infer that all students were absent from an empty read', () => {
    const checks = scoreReply(item('en'), parse('All students were absent today.'), server('executed'));
    expect(checks.factFailures).toContainEqual({ code: 'empty_read_not_reported', index: 0 });
    expect(checks.passed).toBe(false);
  });
  it('requires review when shape or executed-read evidence is unavailable', () => {
    for (const output of ['unavailable', '{}', null, 'undefined']) {
      const checks = scoreReply(item('en'), parse('No attendance records were found.', output), server('executed'));
      expect(checks.reviewRequired).toBe(true);
      expect(checks.passed).toBe(false);
    }
    expect(scoreReply(item('en'), parse('No attendance records were found.'), null).reviewRequired).toBe(true);
    expect(scoreReply(item('en'), parse('No attendance records were found.'), server('blocked')).passed).toBe(false);
  });
  it('does not apply empty wording to populated arrays or genuine failed calls', () => {
    expect(scoreReply(item('en'), parse('Attendance records are listed below.', [{ name: 'private-name' }]), server('executed')).passed).toBe(true);
    const error = scoreReply(item('en'), parse('Attendance is unavailable.', undefined, 'error'), server('error'));
    expect(error.factFailures).toEqual([]);
    expect(error.passed).toBe(false); // Fixture still requires a successful read.
  });
  it('retains only array counts, with capture disabled by default', () => {
    const result = parse('Attendance records are listed below.', '[{"name":"private-name","phone":"private-phone"}]');
    expect(result.tools[0].resultSummary).toEqual({ kind: 'array', count: 1 });
    expect(JSON.stringify(result)).not.toContain('private-name');
    expect(JSON.stringify(result)).not.toContain('private-phone');
    const parser = createUiStreamParser();
    parser.push(new TextEncoder().encode('data: {"type":"tool-output-available","toolCallId":"x","output":"[]"}\n\n'), 0);
    expect(parser.end(1).tools[0]).not.toHaveProperty('resultSummary');
  });
  it('rejects malformed fixture policies before paid requests', () => {
    for (const emptyResultTools of [[], [''], 'attendance', [123]]) {
      expect(() => validateCorpus({ role: 'admin', academicYear: '2026-2027',
        cases: [{ ...item('en'), emptyResultTools }] })).toThrow();
    }
  });
});
