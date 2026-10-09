import { describe, expect, it } from 'bun:test';
import { type ReplyRequest } from 'najm-chatbot';
import { schoolReplyLanguage } from '../../src/modules/chat/replies/schoolReplyLanguage';
import { schoolReplyTemplate } from '../../src/modules/chat/replies/schoolReplyTemplates';

const corpus = await Bun.file('packages/server/tests/chat/fixtures/morocco.json').json() as {
  cases: Array<{ id: string; query: string; language: string; kind: string }>;
};
const request = (userText: string): ReplyRequest => ({ userText, language: schoolReplyLanguage(userText), channel: 'web' });

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

  it.each(corpus.cases.filter(item => /^(classes|upcoming-exams|attendance-today)-/.test(item.id)))('uses one guarded selected-year list read for $id', ({ query, id }) => {
    const template = schoolReplyTemplate(request(query), '2026-2027');
    if (!template || 'text' in template) throw new Error('Expected list read template');
    const tool = id.startsWith('classes-') ? 'classes_get_classes'
      : id.startsWith('upcoming-exams-') ? 'exams_get_upcoming_exams' : 'attendance_get_today_students';
    expect(template.calls).toEqual([{ name: tool, input: { academicYear: '2026-2027' } }]);
    expect(template.render([[]])).toContain('2026-2027');
    expect(() => template.render([{}])).toThrow();
    expect(() => template.render([])).toThrow();
    expect(schoolReplyTemplate(request(query))).toBeNull();
  });

  it.each([
    'Liste les classes de l’école et leurs élèves.', 'Liste les classes de l’école "CP".',
    'Liste les classes de l’école «CP».', 'Liste les classes de l’école en 2025-2026.',
    'Quels examens sont prévus prochainement pour CP ?', 'Quels examens sont prévus prochainement ? Annule-les.',
    'ما هي جميع الامتحانات القادمة؟', 'شنو هوما الامتحانات اللي جايين فالقسم 2B؟',
    'وريني الحضور ديال التلاميذ البارح.', 'اعرض حضور التلاميذ اليوم في قسم 2B.',
    'Affiche les absences des élèves aujourd’hui.', 'Qui est absent aujourd’hui ?',
    'Afficher les classes de l’école.', 'اعرض حضور الأساتذة اليوم.',
  ])('retains the model path for unsupported/qualified list intent: %s', query => {
    expect(schoolReplyTemplate(request(query), '2026-2027')).toBeNull();
  });

  function list(query: string) {
    const template = schoolReplyTemplate(request(query), '2026-2027');
    if (!template || 'text' in template) throw new Error('Expected list read template');
    return template;
  }
  it('renders real class/section names and explicitly handles absent sections', () => {
    const template = list("Liste les classes de l'école.");
    const answer = template.render([[{ name: 'CP', sections: [{ name: 'B' }, { name: 'A' }] },
      { name: 'CE1', sections: [{ id: null, name: null }] }]]);
    expect(answer).toContain('- CP: B, A');
    expect(answer).toContain('- CE1: Aucune section enregistrée');
    expect(answer).not.toContain('undefined');
    expect(() => template.render([[{ name: 'CP', sections: [{ name: null, id: 'section-id' }] }]])).toThrow();
  });
  it('sorts exam rows chronologically, binds each field and limits the list to five', () => {
    const template = list('ما هي الامتحانات القادمة؟');
    const exams = Array.from({ length: 6 }, (_, index) => ({ title: `Stored exam ${index}`,
      class: { name: `CP${index}` }, section: { name: `A${index}` }, date: `2026-10-${String(20 - index).padStart(2, '0')}`,
      startTime: '09:00:00', endTime: '11:00:00' }));
    const answer = template.render([exams]);
    expect(answer.split('\n').filter(line => line.startsWith('- '))).toHaveLength(5);
    expect(answer).toContain('Stored exam 5 — CP5 / A5 — 2026-10-15 — 09:00–11:00');
    expect(answer.indexOf('Stored exam 5')).toBeLessThan(answer.indexOf('Stored exam 4'));
    expect(answer).not.toContain('Stored exam 0');
    expect(answer).toContain('توجد امتحانات أخرى');
    expect(exams[0].title).toBe('Stored exam 0');
    expect(template.render([exams.slice(0, 1)])).not.toContain('توجد امتحانات أخرى');
    expect(template.render([[{ ...exams[0], class: null, section: null }]])).toContain('غير مسجل / غير مسجل');
    expect(() => template.render([[{ ...exams[0], date: '2026-02-30' }]])).toThrow();
    expect(() => template.render([[{ ...exams[0], startTime: '25:00:00' }]])).toThrow();
  });
  it('separates empty attendance from populated statuses without inferring pupil totals or exposing extra fields', () => {
    const template = list('وريني الحضور ديال التلاميذ اليوم.');
    expect(template.render([[]])).toContain('ما كاين حتى شي سجل');
    const records = ['present', 'absent', 'late'].map((status, index) => ({ type: 'student',
      status, date: '2026-10-05', student: { name: `التلميذ ${index}`, phone: '+212-private' },
      class: { name: 'CP' }, section: { name: 'A' }, subject: { name: 'الرياضيات' }, notes: 'private-note' }));
    const answer = template.render([records]);
    expect(answer).toContain('التلميذ 0 — 2026-10-05 — حاضر — CP / A / الرياضيات');
    expect(answer).toContain('التلميذ 1 — 2026-10-05 — غايب');
    expect(answer).toContain('التلميذ 2 — 2026-10-05 — جا معطل');
    expect(answer).not.toContain('private');
    expect(answer).not.toContain('ما كاين حتى شي سجل');
    expect(() => template.render([[{ ...records[0], status: 'unknown' }]])).toThrow();
    expect(() => template.render([[{ ...records[0], type: 'staff' }]])).toThrow();
    const long = template.render([Array.from({ length: 21 }, () => records[0])]);
    expect(long.split('\n').filter(line => line.startsWith('- '))).toHaveLength(20);
    expect(long).toContain('كاينين سجلات خرين');
  });
});
