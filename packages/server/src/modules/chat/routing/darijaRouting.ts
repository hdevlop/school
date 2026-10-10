import { createDarijaQueryRewriter } from 'najm-rag/query-rewrites';

// School owns attendance, grades, payment, family/contact and transport meanings.
// Common Darija wording and the rewrite engine come from the published RAG package.
const rewriteArabic = createDarijaQueryRewriter({
  words: {
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
    // Family and contact. والد matches the parents tool far better than اب.
    بابا: 'والد',
    باباه: 'والده',
    باباها: 'والدها',
    ماما: 'والده',
    ماماه: 'والدته',
    ماماها: 'والدتها',
    الواليد: 'الوالد',
    الواليده: 'الوالده',
    تيليفون: 'هاتف',
    التيليفون: 'الهاتف',
    نمره: 'رقم هاتف',
    النمره: 'رقم الهاتف',
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
    'علّم': 'سجل',
  },
  rewriteRules: [{ from: 'الرقم ديال', to: 'رقم هاتف' }],
});

// Literal vocabulary, not character transliteration: numbers in dates, class
// codes, IDs and unknown names must survive. This is only the routing copy;
// the chat model still receives the original message.
const arabiziWords: Readonly<Record<string, string>> = {
  ch7al: 'كم عدد', chhal: 'كم عدد', chno: 'ما', chnou: 'ما', chmen: 'اي', achmen: 'اي',
  chkoun: 'من', chkon: 'من', wach: 'هل', imta: 'متى',
  werini: 'اعرض', wrini: 'اعرض', '3tini': 'اعرض', atini: 'اعرض',
  bghit: 'اريد', ghir: 'فقط', bla: 'بدون', machi: 'ليس',
  dyal: '', dial: '', dyalna: '', dyalhom: '', dyali: '',
  li: 'الذي', mn: 'من', f: 'في', w: 'و', had: 'هذا',
  homa: 'هم', kamlin: 'جميع', kamla: 'كاملة', kayn: 'يوجد', kayna: 'توجد', kaynin: 'يوجد',
  '3ndna': 'عندنا', '3nd': 'عند', daba: 'الان',
  '3adad': 'عدد', l3adad: 'العدد', l2ar9am: 'الارقام', lista: 'لائحة', smiyat: 'اسماء',
  tlamd: 'التلاميذ', tlamid: 'التلاميذ', tlamidh: 'التلاميذ',
  tilmid: 'تلميذ', tilmida: 'تلميذة', bent: 'بنت', lbnat: 'البنات',
  ostad: 'استاذ', ostada: 'استاذة', lasatida: 'الاساتذة', asatida: 'اساتذة',
  kay9erri: 'يدرس', kay9erriw: 'يدرسون', riyadiyat: 'الرياضيات',
  lmdrasa: 'المدرسة', madrasa: 'مدرسة', mdrasa: 'مدرسة', l2a9sam: 'الاقسام', a9sam: 'اقسام',
  wldi: 'ابني', weldi: 'ابني', bnti: 'ابنتي', wladi: 'اولادي', kay9ra: 'يدرس',
  l9ism: 'القسم', '9ism': 'قسم', ssadis: 'السادس', rrabi3: 'الرابع', lkhamis: 'الخامس',
  ibtida2i: 'ابتدائي', nno9at: 'النقاط', no9at: 'نقاط', no9ta: 'نقطة', tsjlat: 'مسجلة',
  lmawadd: 'المواد', kan9erri: 'ادرس', ghyab: 'غياب',
  ns7ho: 'اصححه', ndkhel: 'ادخل', ba9i: 'باقي', khasni: 'احتاج',
  l7oudour: 'الحضور', l7odour: 'الحضور', lghiyab: 'الغياب', ghiyab: 'غياب',
  '7ader': 'حاضر', '7adra': 'حاضرة', ghayeb: 'غائب',
  lyoum: 'اليوم', lyom: 'اليوم', chher: 'الشهر', l3am: 'العام',
  liyam: 'الايام', fat: 'الماضي', jay: 'القادم', jayin: 'القادمة', jaya: 'القادمة',
  tawarikh: 'تواريخ', lforod: 'الاختبارات', forod: 'اختبارات', lfard: 'الاختبار', fard: 'اختبار',
  nchof: 'اعرض', kifach: 'كيف', dayer: 'حالة', fihom: 'فيهم', kter: 'اكثر', tlatin: 'ثلاثين',
  jme3: 'اجمع', m3a: 'مع', lmajmou3: 'المجموع', bo7do: 'وحده', bjouj: 'كلاهما', liya: 'لي',
  // Keep write intent and negation explicit rather than routing them as reads.
  zid: 'اضف', nzid: 'اضيف', beddel: 'غير', nbeddel: 'اغير',
  sejjel: 'سجل', '7iyed': 'احذف', mse7: 'امسح', sifet: 'ارسل',
  majach: 'لم يحضر', makhellesch: 'لم يدفع',
};
const arabiziVocabulary = new Map(Object.entries(arabiziWords));

export function rewriteDarijaForRouting(normalized: string): string {
  const tokens: string[] = normalized.match(/[a-z0-9]+/g) ?? [];
  // A short Latin word such as "f", "w" or "li" alone is not Darija.
  const signals = new Set(tokens.filter(word => word.length > 2 && arabiziVocabulary.has(word)));
  if (signals.size < 2) return rewriteArabic(normalized);
  const translated = normalized.replace(/[a-z0-9]+/g, word => arabiziVocabulary.get(word) ?? word);
  return rewriteArabic(translated);
}
