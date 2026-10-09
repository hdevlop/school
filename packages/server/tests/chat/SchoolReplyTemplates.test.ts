
import { describe, expect, it } from 'bun:test';
import { type ReplyRequest } from 'najm-chatbot';
import { schoolReplyLanguage } from '../../src/modules/chat/replies/schoolReplyLanguage';
import { schoolReplyTemplate } from '../../src/modules/chat/replies/schoolReplyTemplates';
import { jevReplyPlan } from '../../src/modules/chat/jev/jevReplyPlan';
const corpus = await Bun.file('packages/server/tests/chat/fixtures/morocco.json').json() as {
 cases: Array<{ id: string; query: string; language: string; kind: string }>;
};
const request = (userText: string): ReplyRequest => ({ userText, language: schoolReplyLanguage(userText), channel: 'web' });
describe('minimal School reply formatting', () => {
 it.each(corpus.cases.filter(item => item.kind === 'blocked-write'))('refuses $id without a tool plan', ({ query }) => {
  expect(schoolReplyTemplate(request(query))).toEqual({ text: expect.any(String) });
 });
 it.each(corpus.cases.filter(item => item.kind !== 'blocked-write'))('leaves read/conversation $id to Jev/router/model', ({ query }) => {
  expect(schoolReplyTemplate(request(query))).toBeNull();
 });
 it.each(['ary', 'ar', 'fr'] as const)('formats only authorized Jev counts in %s', language => {
  for (const [intent, tools] of [
   ['student_count', ['students_get_student_count']],
   ['teacher_count', ['teachers_get_teacher_count']],
   ['student_and_teacher_count', ['students_get_student_count', 'teachers_get_teacher_count']],
  ] as const) {
   const plan = jevReplyPlan(intent, language, '2025-2026');
   if (!plan || !('calls' in plan)) throw Error('Expected Jev read plan');
   expect(plan.calls).toEqual(tools.map(name => ({ name, input: { academicYear: '2025-2026' } })));
   const values = tools.map((_, i) => ({ count: i === 0 ? 103 : 52 }));
   expect(plan.render(values)).toContain('103');
   if (tools.length === 2) expect(plan.render(values)).toContain('52');
   for (const bad of [null, {}, { count: -1 }, { count: '103' }, { count: 2.5 }, { count: NaN }, { count: Infinity }, 'Error: FORBIDDEN']) {
    expect(() => plan.render(tools.map(() => bad))).toThrow();
   }
   expect(() => plan.render([])).toThrow();
   expect(plan.render(tools.map(() => ({ count: 0 })))).toContain('0');
  }
 });
 it('renders stored class/section names and distinguishes empty data from malformed/failed reads', () => {
  const plan = jevReplyPlan('class_list', 'fr', '2026-2027');
  if (!plan || !('calls' in plan)) throw Error('Expected Jev class plan');
  expect(plan.calls).toEqual([{ name: 'classes_get_classes', input: { academicYear: '2026-2027' } }]);
  expect(plan.render([[]])).toContain('Aucune classe');
  const answer = plan.render([[{ name: 'CP', sections: [{ name: 'B' }, { name: 'A' }] },
   { name: 'CE1', sections: [{ id: null, name: null }] }]]);
  expect(answer).toContain('- CP: B, A');
  expect(answer).toContain('- CE1: Aucune section');
  expect(answer).toContain('accessibles');
  for (const bad of [{}, 'Error: FORBIDDEN', [{ name: 'CP', sections: [{ id: 'S1', name: null }] }],
   [{ name: 'CP', sections: null }], [{ name: 'CP\nforged', sections: [] }]]) {
   expect(() => plan.render([bad])).toThrow();
  }
  expect(() => plan.render([])).toThrow();
 });
 it.each(['Combien de filles dans CP ?', 'ch7al mn tilmid f l9ism rab3?', 'werini forod had chher',
  'bghit no9at riyadiyat', 'bghit wladi'])('has no local filtered shortcut: %s', query => {
  expect(schoolReplyTemplate(request(query))).toBeNull();
 });
});
