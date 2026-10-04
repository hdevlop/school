import { describe, expect, it } from 'bun:test';
import { scoreSchoolFacts, validateSchoolFacts } from '../chatbot-facts.mjs';
import { scoreReply, validateCorpus } from '../chatbot-scoring.mjs';

const exams = { kind: 'exams', totalCount: 12, records: [
  { title: 'Language exam', subject: 'Mathématiques', class: 'CP', section: 'C', date: '2026-10-17', startTime: '09:00:00', endTime: '11:00:00' },
  { title: 'Science exam', subject: 'Mathématiques', class: 'CE1', section: 'B', date: '2026-10-18', startTime: '10:00:00', endTime: '12:00:00' },
] };
const reply = 'هادو الامتحانات اللي جايين:\n- Language exam – CP C – 17 أكتوبر 2026، 09:00-11:00\n- Science exam – CE1 B – 18 أكتوبر 2026، 10:00-12:00';
const classes = { kind: 'classes', totalCount: 2, records: [{ name: 'CP', sections: ['A', 'B', 'C'] }, { name: 'CE1', sections: ['A', 'B', 'C'] }] };
const codes = (text, facts = exams) => scoreSchoolFacts(text, facts).factFailures.map((f) => f.code);

describe('authoritative school facts', () => {
  it('accepts Darija/Arabic and French date/time formatting and Arabic digits', () => {
    expect(codes(reply)).toEqual([]);
    expect(codes(reply.replace('17 أكتوبر 2026', '١٧/١٠/٢٠٢٦').replace('18 أكتوبر 2026', '18 octobre 2026').replace('09:00', '9h00'))).toEqual([]);
    expect(codes(reply.replace('17 أكتوبر 2026', '2026-10-17').replace('18 أكتوبر 2026', '18.10.2026'))).toEqual([]);
  });
  it.each([
    ['17 أكتوبر', '19 أكتوبر', 'exam_date'], ['09:00', '08:00', 'exam_time'],
    ['11:00', '11:30', 'exam_time'], ['CP C', 'CP B', 'exam_section'],
    ['CP C', 'CP 2C', 'exam_section'], ['CP C', 'CM2 C', 'exam_missing'],
    ['Language exam', 'Science exam', 'exam_name'],
  ])('catches altered row %s -> %s', (before, after, code) => {
    expect(codes(reply.replace(before, after))).toContain(code);
  });
  it('rejects swapped row dates, extra records, duplicate rows and omitted exams', () => {
    const swapped = reply.replace('17 أكتوبر', 'TEMP').replace('18 أكتوبر', '17 أكتوبر').replace('TEMP', '18 أكتوبر');
    expect(codes(swapped)).toContain('exam_order');
    expect(codes(reply + '\n- Science exam – CE2 C – 20 أكتوبر 2026، 12:00')).toContain('exam_row_count');
    expect(codes(reply + '\n' + reply.split('\n')[1])).toContain('exam_row_count');
    expect(codes(reply.split('\n').slice(0, 2).join('\n'))).toContain('exam_missing');
  });
  it('checks total and remaining claims, including French and Arabic words', () => {
    for (const suffix of ['باقي 8 امتحانات.', 'Il reste huit examens.', 'باقي ثمانية امتحانات.', 'المجموع 14 امتحان.', 'Au total quatorze examens: 14.']) {
      expect(codes(reply + '\n' + suffix)).toContain('count');
    }
    expect(codes(reply + '\nباقي 10 امتحانات.')).toEqual([]);
    expect(codes(reply + '\nAu total douze examens.')).toEqual([]);
    expect(codes(reply + '\nالمجموع اثنا عشر امتحانا.')).toEqual([]);
    expect(codes(reply + '\nالمجموع ثلاثة عشر امتحانا.')).toContain('count');
    expect(codes(reply + '\nAu total treize examens.')).toContain('count');
    expect(codes(reply + '\nالمجموع طناش امتحان.')).toEqual([]);
    expect(codes(reply + '\nالمجموع حداش امتحان.')).toContain('count');
    expect(codes(reply + '\nباقي تمنية امتحانات.')).toContain('count');
    expect(codes(reply + '\nIl reste un examen.')).toContain('count');
    expect(codes(reply + '\nVoulez-vous les détails sur un examen précis ?')).toEqual([]);
    expect(codes(reply + '\nD’autres examens sont prévus après le 23 octobre ; dites-moi si vous voulez les voir.')).toEqual([]);
    expect(codes(reply + '\nكاينين امتحانات آخرين من بعد 23 أكتوبر.')).toEqual([]);
    expect(codes(reply.replace('09:00', '09:00:30'))).toContain('exam_time');
  });
  it('requires the exact sections for every class', () => {
    const good = 'هادي لائحة الأقسام:\n- CP: A, B, C\n- CE1: A, B, C';
    expect(codes(good, classes)).toEqual([]);
    for (const changed of [good.replace('A, B, C', '2A, 2B, 2C'), good.replace('A, B, C', 'A, B, B'),
      good.replace('A, B, C', 'A, B'), good + '\n- CM2: A, B, C']) {
      expect(codes(changed, classes).length).toBeGreaterThan(0);
    }
    expect(codes(good + '\nالمجموع 3 اقسام.', classes)).toContain('count');
    expect(codes(good + '\nChaque classe possède trois sections.', classes)).toEqual([]);
  });
  it('returns only failure codes and row indices, never fixture values', () => {
    const failures = scoreSchoolFacts(reply.replace('09:00', '08:00'), exams);
    expect(JSON.stringify(failures)).not.toContain('Language exam');
    expect(JSON.stringify(failures)).not.toContain('2026-10-17');
  });
  it('validates fact shapes and real dates/times before provider spend', () => {
    expect(validateSchoolFacts(exams)).toBe(true);
    expect(validateSchoolFacts(classes)).toBe(true);
    for (const bad of [{ ...exams, totalCount: 1 }, { ...exams, records: [{ ...exams.records[0], date: '2026-02-30' }] },
      { ...exams, records: [{ ...exams.records[0], startTime: '25:00' }] }, { ...classes, records: [{ name: 'CP', sections: ['A', 'A'] }] }]) {
      expect(validateSchoolFacts(bad)).toBe(false);
      expect(() => validateCorpus({ role: 'admin', academicYear: '2026-2027', cases: [
        { id: 'bad', language: 'ary', kind: 'single-read', query: 'شنو جاي؟', schoolFacts: bad },
      ] })).toThrow();
    }
  });
  it('makes structured factual defects fail the overall scorer', () => {
    const fixture = { language: 'ary', kind: 'single-read', schoolFacts: exams, storedNames: ['Language exam', 'Science exam', 'Mathématiques'] };
    expect(scoreReply(fixture, { text: reply, tools: [] }, null).passed).toBe(true);
    expect(scoreReply(fixture, { text: reply.replace('09:00', '08:00'), tools: [] }, null).passed).toBe(false);
  });
});
