import { describe, expect, it } from 'bun:test';
import { detectMoroccanReplyLanguage, type ReplyRequest } from 'najm-chatbot';
import { schoolReplyTemplate } from '../../src/modules/chat/schoolReplyTemplates';

const corpus = await Bun.file('datasets/chatbot-latency/morocco.json').json() as {
  cases: Array<{ id: string; query: string; language: string; kind: string }>;
};
const request = (userText: string): ReplyRequest => ({ userText, language: detectMoroccanReplyLanguage(userText), channel: 'web' });

describe('School response templates', () => {
  it.each(corpus.cases.filter(item => /^(student-count|teacher-count|students-and-teachers)-/.test(item.id)))('renders real counts for $id', ({ query, id }) => {
    const template = schoolReplyTemplate(request(query), '2026-2027');
    expect(template).not.toBeNull();
    if (!template || 'text' in template) throw new Error('Expected read template');
    const both = id.startsWith('students-and-teachers');
    expect(template.calls).toHaveLength(both ? 2 : 1);
    for (const call of template.calls) expect(call.input).toEqual({ academicYear: '2026-2027' });
    const reply = template.render(both ? [{ count: 103 }, { count: 52 }] : [{ count: 103 }]);
    expect(reply).toContain('103');
    if (both) expect(reply).toContain('52');
    for (const bad of [{}, { count: -1 }, { count: '103' }, { count: 2.5 }]) expect(() => template.render([bad, bad])).toThrow();
  });
  it.each(corpus.cases.filter(item => item.kind === 'blocked-write'))('refuses $id without any tool plan', ({ query }) => {
    const template = schoolReplyTemplate(request(query), '2026-2027');
    expect(template).toEqual({ text: expect.any(String) });
  });
  it.each([
    'Combien d’élèves dans la classe CP ?', 'كم عدد التلاميذ الغائبين اليوم؟',
    'شحال من تلميذ فالقسم ديال سلمى؟', 'Combien de filles sont inscrites ?',
    'كم عدد التلاميذ سنة 2025-2026؟', 'Crée un poème.', 'اعرض سجلات الحضور اليوم.',
    'اعرض وصف الإعلان «دير إعلان جديد»',
  ])('leaves qualified/other requests to model/tools: %s', query => {
    expect(schoolReplyTemplate(request(query), '2026-2027')).toBeNull();
  });
  it('never guesses a year outside the validated chat scope', () => {
    expect(schoolReplyTemplate(request('كم عدد التلاميذ؟'))).toBeNull();
  });
  it('recognizes attached Arabic conjunctions without losing the second count', () => {
    const template = schoolReplyTemplate(request('كم عدد التلاميذ والأساتذة؟'), '2026-2027');
    if (!template || 'text' in template) throw new Error('Expected read template');
    expect(template.calls.map(call => call.name)).toEqual(['students_get_student_count', 'teachers_get_teacher_count']);
    expect(template.render([{ count: 103 }, { count: 52 }])).toContain('52');
  });
});
