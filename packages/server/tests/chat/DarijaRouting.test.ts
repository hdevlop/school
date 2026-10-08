import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createDarijaQueryRewriter } from 'najm-rag/query-rewrites';
import { rewriteDarijaForRouting } from '../../src/modules/chat/darijaRouting';

// najm-rag's normalizeQuery, which runs before the rewrite.
const normalize = (text: string) => text.trim().toLowerCase()
  .replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه');

const dataset = (name: string): Array<{ id: string; language: string; query: string }> =>
  JSON.parse(readFileSync(resolve(import.meta.dir, '../../../../datasets/chatbot-latency', name), 'utf8')).cases;
const questions = [...dataset('questions.json'), ...dataset('routing-cases.json')];

describe('rewriteDarijaForRouting', () => {
  it.each([
    ['wrini ghiyab tlamid lyom 2026-10-08', 'اعرض غياب التلاميذ اليوم 2026-10-08'],
    ['chhal mn tilmid f l9ism 6A?', 'كم عدد من تلميذ في القسم 6a?'],
    ['3tini lista a9sam w nno9at riyadiyat', 'اعرض لائحة اقسام و النقاط الرياضيات'],
    ['werini tlamd majach lyom', 'اعرض التلاميذ لم يحضر اليوم'],
    ['sejjel tilmid ghayeb lyoum', 'سجل تلميذ غائب اليوم'],
    ['bghit forod chher li fat', 'اريد اختبارات الشهر الذي الماضي'],
  ])('routes unseen Arabizi wording without losing constraints: %s', (query, expected) => {
    expect(rewriteDarijaForRouting(normalize(query))).toBe(expected);
  });

  it('preserves unknown names, IDs and codes rather than transliterating digits', () => {
    expect(rewriteDarijaForRouting('werini nno9at dyal yassine ab9z 4b 2026-2027'))
      .toBe('اعرض النقاط yassine ab9z 4b 2026-2027');
    expect(rewriteDarijaForRouting('werini nno9at constructor')).toBe('اعرض النقاط constructor');
    for (const query of ['list students in class 4b', 'show f and w', 'la liste des classes', 'imta'])
      expect(rewriteDarijaForRouting(query)).toBe(query);
  });
  it.each([
    ['شحال من تلميذ وشحال من أستاذ كاينين هاد العام؟', 'كم عدد تلميذ وكم عدد استاذ يوجد هذا العام؟'],
    ['شحال من طوبيس عندنا؟', 'كم عدد حافله عندنا؟'],
    ['شكون اللي ما جاش البارح؟', 'من الذي لم يحضر امس؟'],
    ['شكون ما خلصوش؟ ما عرفتش', 'من لم يدفعوا؟ ما عرفتش'],
    ['عطيني الرقم ديال باباه ديال ياسين', 'اعرض رقم هاتف والده ياسين'],
    ['وريني النقط ديال التلميذ Zzbench Qqtest.', 'اعرض النقاط التلميذ zzbench qqtest.'],
    ['علّم ياسين وسلمى غايبين هاد الصباح فالقسم 2B.', 'سجل ياسين وسلمي غائبين هذا الصباح في القسم 2b.'],
    ['شنو هوما الامتحانات اللي جايين؟', 'ما هم الامتحانات الذي القادمه؟'],
    ['واش كاين شي تلميذ ماخلصش؟', 'هل يوجد شي تلميذ لم يدفع؟'],
  ])('rewrites %s for routing', (message, routed) => {
    expect(rewriteDarijaForRouting(normalize(message))).toBe(routed);
  });

  it('leaves English, French and Spanish questions as they are', () => {
    const latin = questions.filter((item) => ['en', 'fr', 'es'].includes(item.language));
    expect(latin.length).toBeGreaterThan(30);
    for (const item of latin) expect(rewriteDarijaForRouting(normalize(item.query))).toBe(normalize(item.query));
  });

  it('changes Modern Standard Arabic questions only where they use the Moroccan word', () => {
    const changed = questions
      .filter((item) => item.language === 'ar')
      .filter((item) => rewriteDarijaForRouting(normalize(item.query)) !== normalize(item.query))
      .map((item) => item.id);
    // نقط (marks) and فرض (test) are Moroccan school words inside MSA questions.
    expect(changed.sort()).toEqual(['grade-create-ar', 'grade-report-ar', 'missing-student-ar']);
  });

  it('keeps "science" (علم without a shadda) and MSA words that start with و or ف', () => {
    expect(rewriteDarijaForRouting('نقاط مادة علم الاحياء')).toBe('نقاط مادة علم الاحياء');
    expect(rewriteDarijaForRouting('وريني الواجبات والوقت والفصل')).toBe('اعرض الواجبات والوقت والفصل');
    expect(rewriteDarijaForRouting('فالقسم وفالمدرسه وديال')).toBe('في القسم وفي المدرسه');
  });

  it('extends shared Darija wording without leaking School meanings to other apps', () => {
    const shared = createDarijaQueryRewriter();
    const query = normalize('وريني النقط ديال ياسين');
    expect(shared(query)).toBe('اعرض النقط ياسين');
    expect(rewriteDarijaForRouting(query)).toBe('اعرض النقاط ياسين');
    expect(shared('علّم ياسين غايب')).toBe('علّم ياسين غايب');
    expect(rewriteDarijaForRouting('علّم ياسين غايب')).toBe('سجل ياسين غائب');
    expect(shared('الرقم ديال الطلب')).toBe('الرقم الطلب');
    expect(rewriteDarijaForRouting('الرقم ديال باباه')).toBe('رقم هاتف والده');
  });

  it('keeps the marking shadda when an attached conjunction or vowels are present', () => {
    expect(rewriteDarijaForRouting(normalize('عَلِّمْ ياسين غايب'))).toBe('سجل ياسين غائب');
    expect(rewriteDarijaForRouting(normalize('وَعَلِّمْ ياسين غايب'))).toBe('وسجل ياسين غائب');
    expect(rewriteDarijaForRouting('وعلم الاحياء')).toBe('وعلم الاحياء');
    expect(rewriteDarijaForRouting('عِلْمُ الاحياء')).toBe('عِلْمُ الاحياء');
    expect(rewriteDarijaForRouting('يَاسِين')).toBe('يَاسِين');
  });

  it('recognizes vowelled two-word count and negation phrases', () => {
    expect(rewriteDarijaForRouting(normalize('شْحال من تلميذ'))).toBe('كم عدد تلميذ');
    expect(rewriteDarijaForRouting(normalize('شكون ما جاشْ البارح'))).toBe('من لم يحضر امس');
  });

  it('handles long attached conjunctions without recursive stack overflow', () => {
    const prefix = 'و'.repeat(12000);
    expect(rewriteDarijaForRouting(`${prefix}شحال`)).toBe(`${prefix}كم`);
    expect(rewriteDarijaForRouting(`${prefix}وقت`)).toBe(`${prefix}وقت`);
  });
});
