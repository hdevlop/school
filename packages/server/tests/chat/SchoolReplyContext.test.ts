import { describe, expect, it } from 'bun:test';
import { schoolReplyContext, schoolReplyLanguage } from '../../src/modules/chat/schoolReplyContext';
import { schoolReplyTemplate } from '../../src/modules/chat/schoolReplyTemplates';

const corpus = await Bun.file('datasets/chatbot-latency/morocco.json').json() as {
  cases: Array<{ id: string; query: string; language: string }>;
};

describe('Moroccan request reply context', () => {
  it.each(corpus.cases)('keeps the actual request language for $id', ({ query, language }) => {
    expect(schoolReplyLanguage(query)).toBe(language);
  });
  it('uses command wording rather than quoted bodies or foreign names', () => {
    expect(schoolReplyLanguage('Crée une annonce : «المدرسة غادي تسد بكري».')).toBe('fr');
    expect(schoolReplyLanguage('Affiche les notes de سلمى الإدريسي.')).toBe('fr');
    expect(schoolReplyLanguage('اعرض أقسام Cours Préparatoire.')).toBe('ar');
    expect(schoolReplyLanguage('وريني النقط ديال Salma Idrissi.')).toBe('ary');
    expect(schoolReplyLanguage('ch7al mn tilmid kayn had l3am?')).toBe('ary');
    expect(schoolReplyContext('Outside chat')).toBeNull();
  });
  it('reinforces next-five only for general upcoming questions', () => {
    for (const query of ['Quels examens sont prévus prochainement ?', 'ما هي الامتحانات القادمة؟', 'شنو هوما الامتحانات اللي جايين؟']) expect(schoolReplyContext(query)).toContain('at most five');
    for (const query of ['Liste tous les examens prochains.', 'اعرض جميع الامتحانات القادمة.', 'وريني الامتحانات الجايين كاملين.']) expect(schoolReplyContext(query) ?? '').not.toContain('at most five');
  });
  it('asks for two counts only when both entities were requested', () => {
    for (const item of corpus.cases.filter(c => c.id.startsWith('students-and-teachers-'))) expect(schoolReplyContext(item.query)).toContain('both counts');
    for (const item of corpus.cases.filter(c => /^(?:student|teacher)-count-/.test(c.id))) expect(schoolReplyContext(item.query) ?? '').not.toContain('both counts');
    expect(schoolReplyContext('Affiche les élèves et les enseignants.') ?? '').not.toContain('both counts');
    expect(schoolReplyContext('وريني لائحة التلاميذ والأساتذة.') ?? '').not.toContain('both counts');
  });
  it('makes attendance writes explicitly unavailable in all three languages', () => {
    const template = (userText: string) => schoolReplyTemplate({ userText, language: schoolReplyLanguage(userText), channel: 'web' });
    expect(template('Enregistre Salma absente aujourd’hui.')).toEqual({ text: expect.stringContaining('présences et les absences') });
    expect(template('سجل غياب التلميذ اليوم.')).toEqual({ text: expect.stringContaining('تسجيل أو تعديل الحضور') });
    expect(template('سجل بلي التلميذ غايب اليوم.')).toEqual({ text: expect.stringContaining('نسجل أو نبدل الحضور') });
    for (const query of ['اعرض حضور التلاميذ اليوم.', 'اعرض سجلات الحضور والغياب اليوم.', 'وريني سجلات الحضور ديال التلاميذ.', 'هل تعلم عدد سجلات الحضور؟']) expect(template(query)).toBeNull();
  });
});
