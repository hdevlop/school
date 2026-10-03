/**
 * Rewrites Moroccan Darija words to Modern Standard Arabic before najm-rag
 * embeds a chat message to choose tools (`rewriteRoutingQuery`). The embedding
 * model separates tools well in MSA and barely at all in Darija: "شحال من
 * تلميذ" scored every tool about equally, while "كم من تلميذ" ranks the
 * student count first. Only the routing query is rewritten; the model still
 * reads the user's own words.
 *
 * The input is najm-rag's normalized text: lower case, with أ إ آ → ا, ى → ي
 * and ة → ه, so keys use those folded spellings. Words that are also common
 * Modern Standard Arabic in a school question are left out (خاص "private",
 * بين "between", علم "science" without its shadda).
 */

const WORDS: Record<string, string> = {
  // Questions
  شحال: 'كم',
  قداش: 'كم',
  شنو: 'ما',
  شنوا: 'ما',
  اشنو: 'ما',
  شكون: 'من',
  هوما: 'هم',
  واش: 'هل',
  فين: 'اين',
  فاين: 'اين',
  امتي: 'متى',
  فوقاش: 'متى',
  علاش: 'لماذا',
  كيفاش: 'كيف',
  // Requests
  وريني: 'اعرض',
  وريلي: 'اعرض',
  ورينا: 'اعرض',
  عطيني: 'اعرض',
  جيب: 'اعرض',
  قلب: 'ابحث',
  لقي: 'جد',
  بغيت: 'اريد',
  بغينا: 'نريد',
  خصني: 'احتاج',
  دير: 'انشئ',
  ديري: 'انشئ',
  صيفط: 'ارسل',
  ليا: 'لي',
  ليه: 'له',
  ليها: 'لها',
  ليهم: 'لهم',
  // Existence, pointers and links
  كاين: 'يوجد',
  كاينين: 'يوجد',
  كاينه: 'توجد',
  كاينش: 'لا يوجد',
  ماكاينش: 'لا يوجد',
  كاينينش: 'لا يوجد',
  هاد: 'هذا',
  هاذ: 'هذا',
  هادا: 'هذا',
  هادي: 'هذه',
  هاذي: 'هذه',
  داك: 'ذلك',
  ديك: 'تلك',
  ديال: '',
  ديالو: '',
  ديالها: '',
  ديالهم: '',
  ديالي: '',
  ديالنا: '',
  ديالك: '',
  بلي: 'ان',
  اللي: 'الذي',
  بزاف: 'كثير',
  مازال: 'ما زال',
  مزال: 'ما زال',
  غادي: 'سوف',
  تسد: 'تغلق',
  بكري: 'مبكرا',
  تقدر: 'تستطيع',
  // Time
  دابا: 'الان',
  البارح: 'امس',
  نهار: 'يوم',
  السيمانه: 'الاسبوع',
  سيمانه: 'اسبوع',
  العشيه: 'المساء',
  جاي: 'القادم',
  الجاي: 'القادم',
  جايه: 'القادمه',
  الجايه: 'القادمه',
  جايين: 'القادمه',
  // School words
  تلامذ: 'تلاميذ',
  التلامذ: 'التلاميذ',
  تلامذه: 'تلاميذ',
  التلامذه: 'التلاميذ',
  نقط: 'نقاط',
  النقط: 'النقاط',
  غايب: 'غائب',
  غايبه: 'غائبه',
  غايبين: 'غائبين',
  الغايبين: 'الغائبين',
  سميه: 'اسم',
  السميه: 'الاسم',
  فرض: 'اختبار',
  الفرض: 'الاختبار',
  فروض: 'اختبارات',
  الفروض: 'الاختبارات',
  كونطرول: 'اختبار',
  الكونطرول: 'الاختبار',
  خلص: 'دفع',
  خلصو: 'دفعوا',
  خلصات: 'دفعت',
  ماخلصش: 'لم يدفع',
  خلصوش: 'يدفعوا',
  ماخلصوش: 'لم يدفعوا',
  كيخلص: 'يدفع',
  كيخلصو: 'يدفعون',
  خلصش: 'يدفع',
  فلوس: 'مال',
  الفلوس: 'المال',
  // Coming to school
  جا: 'حضر',
  جاو: 'حضروا',
  جات: 'حضرت',
  جاش: 'يحضر',
  ماجاش: 'لم يحضر',
  ماجاوش: 'لم يحضروا',
  // Family
  بابا: 'اب',
  باباه: 'ابوه',
  باباها: 'ابوها',
  ماما: 'ام',
  ماماه: 'امه',
  ماماها: 'امها',
  الواليد: 'الاب',
  الواليده: 'الام',
  تيليفون: 'هاتف',
  التيليفون: 'الهاتف',
  // Teaching and transport
  كيقري: 'يدرس',
  كيقريو: 'يدرسون',
  كيقرا: 'يدرس',
  كيقراو: 'يدرسون',
  كيركب: 'يركب',
  كيركبو: 'يركبون',
  كار: 'حافله',
  الكار: 'الحافله',
  طوبيس: 'حافله',
  الطوبيس: 'الحافله',
  طوبيسات: 'حافلات',
};

// Shadda and short vowels; a message rarely has them, a lookup ignores them.
const DIACRITICS = /[ً-ْ]/g;
// Runs of Arabic letters and diacritics: the words of a message.
const ARABIC_WORD = /[ء-يً-ْ]+/g;

function rewriteWord(word: string): string {
  // "علّم" (mark) carries its shadda; plain "علم" is "science" in MSA.
  if (word === 'علّم') return 'سجل';
  const bare = word.replace(DIACRITICS, '');
  if (bare in WORDS) return WORDS[bare];
  // و "and" written onto the next word: وشحال, وديال, وفالمدرسه.
  if (bare.length > 2 && bare.startsWith('و')) {
    const rest = rewriteWord(bare.slice(1));
    if (rest !== bare.slice(1)) return rest ? `و${rest}` : '';
  }
  // فال "in the" written onto a noun: فالمدرسه → في المدرسه.
  if (bare.length > 4 && bare.startsWith('فال')) return `في ${rewriteWord(bare.slice(1))}`;
  return word;
}

// Two-word forms, applied before single words. "شحال من تلميذ" reads as
// "كم عدد تلميذ": "كم من" is not the MSA idiom, and the count tools match
// "كم عدد". Darija negation wraps a verb, "ما جاش"; joined, it is one key
// (ماجاش → لم يحضر) instead of "ما" plus a present-tense verb.
const PHRASES: Array<[RegExp, (match: string, ...groups: string[]) => string]> = [
  [/(^|[^ء-ي])(و?)شحال من(?=$|[^ء-ي])/g, (_m, before, and) => `${before}${and}كم عدد`],
  [/(^|[^ء-ي])ما ([ء-ي]+ش)(?=$|[^ء-ي])/g,
    (match, before, verb) => (`ما${verb}` in WORDS ? `${before}ما${verb}` : match)],
];

/** najm-rag `rewriteRoutingQuery`: Darija words to MSA; other text unchanged. */
export function rewriteDarijaForRouting(normalized: string): string {
  const phrased = PHRASES.reduce((text, [pattern, replace]) => text.replace(pattern, replace), normalized);
  return phrased.replace(ARABIC_WORD, rewriteWord).replace(/ {2,}/g, ' ').trim();
}
