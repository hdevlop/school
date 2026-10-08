import { describe, expect, test } from 'bun:test';
import { acceptsWithQueryGuardV5, acceptsWithQueryGuardV6 } from '../../src/modules/chat/jevQueryGuard';
import { jevReplyPlan } from '../../src/modules/chat/jevReplyPlan';
import { INTENT_NAMES } from '../../src/modules/chat/jevIntents';
import { jevDarijaCases } from '../../src/modules/chat/jevDarijaCases';

const decision = (choice: any) => ({ choice, confidence: 0.99, writeProbability: 0 });
const examIds = ['q05', 'q06', 'q77', 'q78', 'q79', 'q80'];
const examCases = jevDarijaCases.filter(item => examIds.some(id => item.id.endsWith(id)));
describe('guarded upcoming exam coverage', () => {
  test.each(examCases)('accepts only the unfiltered request $id with the scoped exam tool', item => {
    expect(acceptsWithQueryGuardV5(decision(item.intent), item.query)).toBe(false);
    expect(acceptsWithQueryGuardV6(decision(item.intent), item.query)).toBe(true);
    const plan = jevReplyPlan(item.intent, 'ary', '2026-2027', item.query)!;
    if (!('calls' in plan)) throw Error('Expected tool plan');
    expect(plan.calls).toEqual([{ name: 'exams_get_upcoming_exams', input: { academicYear: '2026-2027' } }]);
    expect(plan.render([[]])).toContain('ما كاين حتى امتحان جاي');
  });
  test('preserves the write disagreement stop for the two correctly classified counts', () => {
    for (const id of ['q12', 'q50']) {
      const item = jevDarijaCases.find(item => item.id.endsWith(id))!;
      expect(acceptsWithQueryGuardV6({ ...decision(item.intent), writeProbability: 0.65 }, item.query)).toBe(false);
      expect(acceptsWithQueryGuardV6(decision(item.intent), item.query)).toBe(true);
    }
  });
  test('does not accept a forced wrong read choice on any of the 100 reviewed questions', () => {
    const reads = INTENT_NAMES.filter(choice => !['write_request', 'needs_llm'].includes(choice));
    for (const item of jevDarijaCases) for (const choice of reads) {
      if (item.intent !== choice) expect(acceptsWithQueryGuardV6(decision(choice), item.query)).toBe(false);
    }
  });
  test.each([' ديال ZzClasseDemo', ' غير الرياضيات', ' غدا', ' ف 2025-2026', ' ثم مسح القسم',
    ' و عدد التلاميذ', ' ديال التلميذ ZzEleveDemo', ' + 1', ' اليوم', ' هاد السيمانة'])('preserves exam qualifiers and operations: %s', suffix => {
    for (const item of examCases) expect(acceptsWithQueryGuardV6(decision('upcoming_exams'), item.query + suffix)).toBe(false);
  });
  test.each(['"إمتى الفرض الجاي؟"', 'imta lfard jay f l9ism A?', 'ch7al mn forod jayin?',
    'wach ma kayninch forod?', 'عطيني جميع الامتحانات', 'imta lfard jay dyal riyadiyat?'])('declines unsupported exam request %s', query => {
    expect(acceptsWithQueryGuardV6(decision('upcoming_exams'), query)).toBe(false);
    expect(jevReplyPlan('upcoming_exams', 'ary', '2026-2027', query)).toBeNull();
  });
  test('selects the earliest exam by date and start time without mixing row fields or mutating results', () => {
    const rows = [
      { title: 'Later exam', class: { name: 'Class B' }, section: { name: 'B' }, date: '2026-10-15', startTime: '08:00', endTime: '09:00' },
      { title: 'Second today', class: { name: 'Class C' }, section: { name: 'C' }, date: '2026-10-09', startTime: '10:00', endTime: '11:00' },
      { title: 'Earliest exam', class: { name: 'Class A' }, section: { name: 'A' }, date: '2026-10-09', startTime: '08:30', endTime: '09:30' },
    ];
    const original = structuredClone(rows);
    const plan = jevReplyPlan('upcoming_exams', 'ary', '2026-2027', 'imta lfard jay?', '2026-10-08')!;
    if (!('calls' in plan)) throw Error('Expected tool plan');
    const answer = plan.render([rows]);
    expect(answer).toContain('Earliest exam — Class A / A — 2026-10-09 — 08:30–09:30');
    expect(answer).not.toContain('Second today');
    expect(answer).not.toContain('Later exam');
    expect(rows).toEqual(original);
    expect(() => plan.render([[{ ...rows[0], date: '2026-02-30' }]])).toThrow();
    const sameDay = plan.render([[{ ...rows[0], date: '2026-10-08' }]]);
    expect(sameDay).toContain('خاص نتأكدو من التوقيت');
    expect(sameDay).toContain('Later exam — Class B / B — 2026-10-08 — 08:00–09:00');
    expect(sameDay).not.toContain('ها هو الفرض الجاي');
    expect(() => plan.render([[{ ...rows[0], date: '2026-10-07' }]])).toThrow('Unexpected past upcoming exam');
  });
  test('bounds list replies to five sorted exams and states that more exist', () => {
    const rows = Array.from({ length: 6 }, (_, i) => ({ title: `Exam ${i}`,
      class: null, section: null, date: `2026-10-${20 - i}`, startTime: '08:00', endTime: '09:00' }));
    const plan = jevReplyPlan('upcoming_exams', 'ary', '2026-2027', examCases[0].query)!;
    if (!('calls' in plan)) throw Error('Expected tool plan');
    const answer = plan.render([rows]);
    expect(answer.indexOf('Exam 5')).toBeLessThan(answer.indexOf('Exam 4'));
    expect(answer).not.toContain('Exam 0');
    expect(answer).toContain('كاينين مزال امتحانات خرين');
    expect(answer).toContain('ما مسجلش / ما مسجلش');
  });
});
