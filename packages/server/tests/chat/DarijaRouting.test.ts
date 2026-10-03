import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { rewriteDarijaForRouting } from '../../src/modules/chat/darijaRouting';

// najm-rag's normalizeQuery, which runs before the rewrite.
const normalize = (text: string) => text.trim().toLowerCase()
  .replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه');

const dataset = (name: string): Array<{ id: string; language: string; query: string }> =>
  JSON.parse(readFileSync(resolve(import.meta.dir, '../../../../datasets/chatbot-latency', name), 'utf8')).cases;
const questions = [...dataset('questions.json'), ...dataset('routing-cases.json')];

describe('rewriteDarijaForRouting', () => {
  it.each([
    ['شحال من تلميذ وشحال من أستاذ كاينين هاد العام؟', 'كم عدد تلميذ وكم عدد استاذ يوجد هذا العام؟'],
    ['شحال من طوبيس عندنا؟', 'كم عدد حافله عندنا؟'],
    ['شكون اللي ما جاش البارح؟', 'من الذي لم يحضر امس؟'],
    ['شكون ما خلصوش؟ ما عرفتش', 'من لم يدفعوا؟ ما عرفتش'],
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

  it('writes its keys in the folded spelling routing hands it', async () => {
    const source = readFileSync(resolve(import.meta.dir, '../../src/modules/chat/darijaRouting.ts'), 'utf8');
    const keys = [...source.matchAll(/^ {2}([ء-ي]+): '/gm)].map((match) => match[1]);
    expect(keys.length).toBeGreaterThan(80);
    expect(keys.filter((key) => key !== normalize(key))).toEqual([]);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
