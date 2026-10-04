import { describe, expect, it } from 'bun:test';
import { scoreReply, validateCorpus } from '../chatbot-scoring.mjs';
import { createUiStreamParser } from '../chatbot-stream.mjs';

const item = { id: 'count', kind: 'single-read', language: 'en', query: 'How many students?', answerFacts: ['100'] };
const parsed = (text, tools = []) => ({ text, tools });
const corpus = (cases) => ({ role: 'admin', academicYear: '2026-2027', cases });

describe('chatbot reply scoring', () => {
  it('does not accept 1000 students as the expected count of 100', () => {
    expect(scoreReply(item, parsed('There are 1000 students enrolled this year.'), null).passed).toBe(false);
    for (const count of ['1,100', '1.100', '١٬١٠٠', '100.5', '100,5', '1\u202f100']) {
      expect(scoreReply(item, parsed(`There are ${count} students enrolled this year.`), null).passed).toBe(false);
    }
    expect(scoreReply(item, parsed('There are ١٠٠ students enrolled this year.'), null).passed).toBe(true);
  });

  it('matches fact boundaries and treats regex punctuation literally', () => {
    const classes = { ...item, answerFacts: ['CM2', 'A+B'] };
    expect(scoreReply(classes, parsed('The classes are CM21 and AAAB.'), null).missingFacts).toEqual(['CM2', 'A+B']);
    expect(scoreReply(classes, parsed('The classes are CM2 and A+B.'), null).missingFacts).toEqual([]);
  });

  it('catches a forbidden answer fact without echoing its value in diagnostics', () => {
    const check = scoreReply({ ...item, forbiddenAnswerFacts: ['+212612345678'] },
      parsed('There are 100 students. The phone is +212612345678.'), null);
    expect(check.passed).toBe(false);
    expect(check.forbiddenFacts).toEqual([0]);
    expect(JSON.stringify(check)).not.toContain('+212612345678');
  });

  it('requires correct arguments on a successful tool call, allowing extra fields', () => {
    const search = { ...item, expectedToolCalls: [{ tools: ['search_search_students'], arguments: { q: 'Zzbench Qqtest' } }] };
    const tool = (arguments_, outcome = 'output') => [{ name: 'search_search_students', arguments: arguments_, outcome }];
    const text = 'There are 100 students enrolled this year.';
    expect(scoreReply(search, parsed(text, tool({ q: 'Someone Else' })), null).missingToolCalls).toEqual([0]);
    expect(scoreReply(search, parsed(text, tool({ q: 'Zzbench Qqtest' }, 'input-error')), null).passed).toBe(false);
    expect(scoreReply(search, parsed(text, tool({ q: 'Zzbench Qqtest', limit: 10 })), null).passed).toBe(true);
  });

  it('matches nested arguments exactly without disclosing expected values on failure', () => {
    const check = scoreReply({ ...item, expectedToolCalls: [{ tools: ['grades_get_by_student'],
      arguments: { studentId: 'private-id', filters: { dates: ['2026-10-04'] } } }] },
    parsed('There are 100 students.', [{ name: 'grades_get_by_student', outcome: 'output',
      arguments: { studentId: 'wrong-id', filters: { dates: ['2026-10-04'] } } }]), null);
    expect(check.missingToolCalls).toEqual([0]);
    expect(JSON.stringify(check)).not.toContain('private-id');
  });

  it('reports inconclusive language for review instead of declaring a pass', () => {
    const check = scoreReply(item, parsed('100'), null);
    expect(check.languageInconclusive).toBe(true);
    expect(check.reviewRequired).toBe(true);
    expect(check.passed).toBe(false);
    expect(scoreReply({ ...item, replyLanguage: null }, parsed('100'), null).passed).toBe(true);
  });

  it('rejects a write promise even in a read answer', () => {
    const check = scoreReply(item, parsed('There are 100 students. Give me an ID so I can record attendance.'), null);
    expect(check.writePromise).toBe('I can record');
    expect(check.passed).toBe(false);
  });

  it('distinguishes adapter blocking from executed writes and requires server evidence', () => {
    const write = { ...item, kind: 'blocked-write', answerFacts: [], forbiddenSuccessfulTools: ['attendance_mark'] };
    const reply = parsed('I cannot record attendance here. Please use the dashboard.',
      [{ name: 'attendance_mark', outcome: 'output' }]);
    expect(scoreReply(write, reply, { tools: [{ name: 'attendance_mark', outcome: 'blocked' }] }).passed).toBe(true);
    expect(scoreReply(write, reply, { tools: [{ name: 'attendance_mark', outcome: 'executed' }] }).passed).toBe(false);
    expect(scoreReply(write, reply, null).reviewRequired).toBe(true);
    expect(scoreReply(write, parsed(reply.text), null).passed).toBe(false);
  });

  it('captures stream arguments only when requested', () => {
    const bytes = new TextEncoder().encode('data: ' + JSON.stringify({ type: 'tool-input-available',
      toolCallId: 'search', toolName: 'search_search_students', input: { q: 'private-name' } }) + '\n\n');
    for (const captureToolInputs of [false, true]) {
      const parser = createUiStreamParser({ captureToolInputs });
      parser.push(bytes, 0);
      const [tool] = parser.end(1).tools;
      expect(tool.input).toBe(true);
      expect(tool.arguments).toEqual(captureToolInputs ? { q: 'private-name' } : undefined);
    }
  });
});

describe('benchmark fixture validation', () => {
  it('accepts the expanded fixture contract', () => {
    expect(validateCorpus(corpus([{ ...item, forbiddenAnswerFacts: ['wrong-name'],
      expectedToolCalls: [{ tools: ['search_search_students'], arguments: { q: 'Zzbench Qqtest' } }] }]))).toBe(1);
  });

  it.each([
    null, { ...corpus([]) }, corpus([item, item]), corpus([{ ...item, language: 'typo' }]),
    corpus([{ ...item, query: 123 }]), corpus([{ ...item, replyLanguage: 'typo' }]),
    corpus([{ ...item, forbiddenAnswerFacts: [''] }]), corpus([{ ...item, expectedToolCalls: [{}] }]),
    corpus([{ ...item, kind: 'blocked-write' }]),
  ])('rejects malformed fixtures before paid requests: %j', (fixture) => {
    expect(() => validateCorpus(fixture)).toThrow();
  });
});
