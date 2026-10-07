import { describe, expect, it } from 'bun:test';
import { countQueryVeto } from '../chatbot-jev-count-guard.mjs';
import { acceptsWithCountGuardV2, compareCountGuardV2, countQueryVetoV2 } from '../chatbot-jev-count-guard-v2.mjs';

const choice = name => ({ choice: name, confidence: 0.9, writeProbability: 0.1 });
describe('offline count-veto v2 candidate', () => {
  it.each([
    ["J'ai besoin du total des élèves, pas de leurs noms.", 'student_count'],
    ["Sans liste détaillée, combien d'élèves l'école compte-t-elle ?", 'student_count'],
    ['Je demande le total des enseignants, sans leurs noms.', 'teacher_count'],
    ['دون قائمة تفصيلية، كم تلميذا تضم المدرسة؟', 'student_count'],
    ['بلا لائحة مفصلة، المدرسة فيها شحال من تلميذ؟', 'student_count'],
    ['بغيت العدد كامل ديال الأساتذة بلا سمياتهم.', 'teacher_count'],
    ['أبحث عن مجموعي التلاميذ والأساتذة دون قوائم الأسماء.', 'student_and_teacher_count'],
    ['khasni l3adad dyal tlamid machi smiyat dyalhom.', 'student_count'],
    ['bla liste mfassla lmdrasa fiha ch7al mn tilmid?', 'student_count'],
    ['bghit l3adad kamel dyal l asatida bla smiyathom.', 'teacher_count'],
  ])('allows an explicit excluded list plus a plain count: %s', (query, intent) => {
    expect(countQueryVeto(query, intent)).toBe('name_or_list_signal');
    expect(countQueryVetoV2(query, intent)).toBeNull();
  });
  it.each([
    'وريني سميات الأساتذة ديال المدرسة، ماشي شحال عددهم.',
    'Les noms des enseignants, pas le nombre.',
    'Sans les noms, je ne veux pas le nombre des enseignants.',
    'Sans les noms, le total des enseignants de la classe CP.',
    'Le total des enseignants, sans leurs noms, puis montre leur liste.',
    'Le total des enseignants avec leurs noms.',
    'bghit smiyat l asatida machi l3adad.',
    'bghit l3adad l asatida bla smiyat dyal CP.',
    'بغيت سميات الأساتذة ماشي العدد.',
    'ما بغيتش العدد ديال الأساتذة بلا سمياتهم.',
    'أريد عدد الأساتذة للسنة الماضية دون الأسماء.',
    'How many teachers, without names, and delete the list.',
    'Total teachers without "names".',
    "Le nombre des enseignants, pas 'leurs noms'.",
    'Total enseignants, sans ‘noms’.',
    'Nombre élèves - enseignants, sans noms.',
  ])('retains name requests, negated counts, qualifiers, writes and quoted ambiguity: %s', query => {
    expect(countQueryVetoV2(query, 'teacher_count')).toBe('name_or_list_signal');
  });
  it('requires the count subject to agree and never overrides write/confidence validation', () => {
    const query = "J'ai besoin du total des élèves, pas de leurs noms.";
    expect(countQueryVetoV2(query, 'teacher_count')).toBe('name_or_list_signal');
    expect(acceptsWithCountGuardV2({ ...choice('student_count'), writeProbability: 0.7 }, query, 0.8)).toBe(false);
    expect(acceptsWithCountGuardV2({ ...choice('student_count'), confidence: 1.5 }, query, 0.8)).toBe(false);
    expect(countQueryVetoV2('', 'student_count')).toBe('missing_query');
    expect(countQueryVetoV2('Liste les classes', 'class_list')).toBeNull();
    expect(countQueryVetoV2('Total élèves + enseignants, sans noms.', 'student_and_teacher_count')).toBe('name_or_list_signal');
    expect(countQueryVetoV2('Total des élèves et enseignants, sans noms.', 'student_and_teacher_count')).toBe('name_or_list_signal');
  });
  it('retains the known unsafe teacher-name acceptance while recovering explicit read counts', () => {
    const rows = [
      { item: { id: 'bad', query: 'وريني سميات الأساتذة ديال المدرسة، ماشي شحال عددهم.', intent: 'needs_llm' }, decision: choice('teacher_count') },
      { item: { id: 'good', query: 'Je demande le total des enseignants, sans leurs noms.', intent: 'teacher_count' }, decision: choice('teacher_count') },
    ];
    const original = JSON.stringify(rows);
    expect(compareCountGuardV2(rows)).toMatchObject({ before: { questions: 2, wrongQuestions: 1 },
      version1After: { questions: 0 }, after: { questions: 1, wrongQuestions: 0 },
      preventedWrong: { questions: 1 }, lostCorrect: { questions: 0 }, productionAcceptance: false });
    expect(JSON.stringify(rows)).toBe(original);
  });
});
