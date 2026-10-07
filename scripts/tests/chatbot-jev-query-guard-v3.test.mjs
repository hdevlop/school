import { describe, expect, it } from 'bun:test';
import { accepts } from '../chatbot-jev.mjs';
import { queryVetoV3, acceptsWithQueryGuardV3, compareQueryGuardV3 } from '../chatbot-jev-query-guard-v3.mjs';

const decision = choice => ({ choice, confidence: 0.97, writeProbability: 0 });
describe('offline semantic query veto v3', () => {
  it.each([
    'جمع ليا عدد التلاميذ مع عدد الأساتذة وعطيني المجموع.',
    'jme3 liya 3adad tlamd m3a 3adad lasatida w 3tini lmajmou3.',
    'Additionne le nombre des élèves et des enseignants.',
    'Add students and teachers into one number.',
  ])('blocks an arithmetic misclassification even when the write score is read-only: %s', query => {
    const choice = decision('student_and_teacher_count');
    expect(accepts(choice, 0.8, true, 'core')).toBe(true);
    expect(queryVetoV3(query, choice.choice)).toBe('arithmetic_request');
    expect(acceptsWithQueryGuardV3(choice, query)).toBe(false);
  });
  it.each([
    ['شحال من تلميذ فالقسم الرابع؟', 'student_count'],
    ['شحال من تلميذ فالرابع؟', 'student_count'],
    ['عدد التلاميذ البنات فالمدرسة؟', 'student_count'],
    ['ch7al mn tilmid kayn fl9ism?', 'student_count'],
    ['ch7al mn bent kayna f lmdrasa?', 'student_count'],
    ['Nombre des enseignants en mathématiques.', 'teacher_count'],
    ['How many students were enrolled last year?', 'student_count'],
    ['كم عدد التلاميذ الغائبين اليوم؟', 'student_count'],
    ['وريني الحضور ديال الأساتذة اليوم.', 'attendance_today'],
    ['وريني الغياب ديال التلاميذ البارح.', 'attendance_today'],
    ['شحال من قسم فالمدرسة؟', 'class_list'],
    ['Liste les classes et leurs élèves.', 'class_list'],
    ['How many students?', 'small_talk'],
    ['كم عدد التلاميذ؟', 'teacher_count'],
    ['شحال من أستاذ؟', 'student_and_teacher_count'],
  ])('rejects unsupported qualifiers and subject substitutions: %s', (query, choice) => {
    expect(queryVetoV3(query, choice)).not.toBeNull();
    expect(acceptsWithQueryGuardV3(decision(choice), query)).toBe(false);
  });
  it.each([
    ['مجموع التلاميذ فالمدرسة', 'student_count'],
    ['أحتاج فقط إلى العدد الكلي للمدرسين في هذه المؤسسة.', 'teacher_count'],
    ['Tu peux consulter la feuille de présence du jour pour tous les élèves ?', 'attendance_today'],
    ['أحتاج الاطلاع على حضور اليوم لكل تلاميذ المؤسسة دون تحديد قسم.', 'attendance_today'],
    ['بغيت نشوف الغياب اليوم فالمؤسسة كلها بلا قسم معين.', 'attendance_today'],
    ['أعطني مجموع التلاميذ في جميع أقسام المؤسسة لهذه السنة دون تفصيل حسب الأقسام.', 'student_count'],
    ['عطيني اللائحة ديال الأقسام كاملين، ماشي العدد ديالهم.', 'class_list'],
    ['جمع ليا غير الأعداد ديال التلاميذ والأساتذة، كل واحد بوحدو، فالمؤسسة كاملة.', 'student_and_teacher_count'],
    ['شحال من أستاذ كيقري فالمدرسة ديالنا دابا؟', 'teacher_count'],
    ['bghit l3adad dyal tlamd w l3adad dyal lasatida bjouj.', 'student_and_teacher_count'],
    ['عطيني عدد التلاميذ بوحدو وعدد الأساتذة بوحدو، ديال المدرسة كاملة.', 'student_and_teacher_count'],
    ['شنو هما الأقسام اللي عندنا فالمدرسة؟', 'class_list'],
    ['werini chkoun li 7ader w chkoun li ghayeb mn tlamd lyoum f lmdrasa kamla.', 'attendance_today'],
    ['صباح الخير', 'small_talk'],
    ["J'ai besoin du total des élèves, pas de leurs noms.", 'student_count'],
    ['بغيت غير العدد ديال التلاميذ اللي عندنا كاملين، بلا لائحة ديال السميات.', 'student_count'],
    ['bghit ghir l3adad dyal tlamd li 3ndna kamlin, bla lista dyal smiyat.', 'student_count'],
    ['عطيني غير العدد ديال الأساتذة، ماشي السميات ديالهم.', 'teacher_count'],
  ])('preserves unqualified reads and separate totals: %s', (query, choice) => {
    expect(queryVetoV3(query, choice)).toBeNull();
    expect(acceptsWithQueryGuardV3(decision(choice), query)).toBe(true);
  });
  it('blocks explicit school writes without overriding confidence or write scores', () => {
    const query = 'mse7 had lfard mn ljadwal.';
    expect(queryVetoV3(query, 'class_list')).toBe('explicit_school_write');
    expect(acceptsWithQueryGuardV3(decision('class_list'), query)).toBe(false);
    expect(acceptsWithQueryGuardV3({ ...decision('teacher_count'), confidence: 1.5 }, 'شحال من أستاذ؟')).toBe(false);
    expect(acceptsWithQueryGuardV3({ ...decision('teacher_count'), writeProbability: 0.6 }, 'شحال من أستاذ؟')).toBe(false);
    const rows = [{ item: { id: 'sum', query: 'jme3 tlamd w lasatida', intent: 'needs_llm' }, decision: decision('student_and_teacher_count') }];
    const before = JSON.stringify(rows);
    expect(compareQueryGuardV3(rows)).toMatchObject({ before: { wrong: 1 }, after: { questions: 0 }, preventedWrong: { questions: 1 }, productionAcceptance: false });
    expect(JSON.stringify(rows)).toBe(before);
  });
  it.each([
    ['حضور اليوم دون تحديد قسم CP.', 'attendance_today'],
    ['عطيني اللائحة ديال الأقسام والتلاميذ، ماشي العدد ديالهم.', 'class_list'],
    ['جمع التلاميذ والأساتذة بوحدو وعطيني المجموع.', 'student_and_teacher_count'],
    ['jme3 tlamd w lasatida, kol wa7ed bo7do, then compute average.', 'student_and_teacher_count'],
    ['حضور اليوم بلا قسم معين، ثم البارح.', 'attendance_today'],
    ['وريني سميات الأساتذة ديال المدرسة، ماشي شحال عددهم.', 'teacher_count'],
    ['Sans les noms, le total des enseignants de la classe CP.', 'teacher_count'],
    ['بغيت غير العدد ديال التلاميذ بلا لائحة ديال السميات ومن بعد مسح القسم.', 'student_count'],
  ])('does not erase qualified tails or arithmetic disguised as separate counts: %s', (query, choice) => {
    expect(acceptsWithQueryGuardV3(decision(choice), query)).toBe(false);
  });
});
