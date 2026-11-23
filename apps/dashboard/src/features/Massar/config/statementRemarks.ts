/**
 * The remarks a student statement shows in each subject's "ملاحظات" cell, written as a teacher would by hand:
 * a wording from the mark's band, in the subject's language, with that subject's teacher's pen.
 * Every choice is a stable hash of the student, subject and class, so a reprint writes the same thing.
 */

export type RemarkLanguage = 'ar' | 'fr' | 'en';

/** A mark's band by its share of the maximum (/10 primary, /20 collège): 0 ممتاز (≥90%) … 5 يحتاج إلى دعم (<50%); none without a mark. */
export function remarkBand(mark: number | null, maxMark: number) {
  if (mark === null || !maxMark) return null;
  const share = mark / maxMark;
  if (share >= 0.9) return 0;
  if (share >= 0.8) return 1;
  if (share >= 0.7) return 2;
  if (share >= 0.6) return 3;
  if (share >= 0.5) return 4;
  return 5;
}

/**
 * What teachers write, band by band, in the subject's own language: the same band reads differently
 * from one student to the next (حسن جدا, T. Bien, Très bon travail…), as on a statement filled by hand.
 */
export const REMARKS: Record<RemarkLanguage, readonly (readonly string[])[]> = {
  ar: [
    ['ممتاز', 'ممتاز، واصل', 'عمل ممتاز', 'نتيجة ممتازة', 'أحسنت، ممتاز', 'ممتاز، تلميذ مجتهد', 'عمل متميز', 'نتائج مشرفة، واصل', 'ممتاز، أهنئك',
      'تفوق باهر', 'عمل رائع، واصل التألق', 'نتيجة مشرفة', 'أداء متميز، أحسنت'],
    ['حسن جدا', 'عمل جيد جدا', 'حسن جدا، واصل', 'نتيجة جيدة جدا', 'حسن جدا، تلميذ نشيط', 'مجهود جيد جدا', 'حسن جدا، استمر', 'أداء جيد جدا',
      'حسن جدا، أحسنت', 'عمل جاد ومثمر', 'نتائج طيبة، واصل', 'تحصيل جيد جدا'],
    ['حسن', 'عمل حسن', 'نتيجة حسنة', 'جيد، واصل', 'حسن، يمكنك الأفضل', 'مجهود حسن', 'حسن، استمر', 'عمل جيد',
      'نتائج جيدة', 'حسن، بإمكانك التقدم أكثر', 'مجهود مشكور', 'عمل منظم'],
    ['مستحسن', 'مستحسن، يمكنك الأفضل', 'عمل مقبول', 'مستحسن، واصل المجهود', 'نتيجة مقبولة', 'لا بأس، واصل', 'مستحسن، ضاعف المجهود', 'مقبول، يمكنك التحسن',
      'نتيجة مشجعة', 'مقبول، واصل العمل', 'في تحسن، استمر'],
    ['متوسط', 'متوسط، ابذل مجهودا', 'يحتاج إلى مجهود', 'نتيجة متوسطة', 'متوسط، يمكنك الأفضل', 'عليك بالمراجعة', 'متوسط، ضاعف المجهود', 'يحتاج إلى مزيد من العمل',
      'متوسط، بإمكانك التحسن', 'مزيدا من التركيز', 'متوسط، راجع دروسك بانتظام'],
    // No ضعيف: the lowest band says what helps (support, revision, effort), never labels the student.
    ['يحتاج إلى دعم', 'عليك بذل مجهود أكبر', 'غير كاف، واصل المحاولة', 'نتيجة غير كافية', 'عليك بالمراجعة المستمرة', 'يحتاج إلى متابعة',
      'بالمثابرة ستتحسن', 'مزيدا من الجهد والتركيز', 'لا تيأس، واصل العمل', 'راجع دروسك بانتظام', 'يمكنك التحسن بالعمل', 'ينبغي المثابرة',
      'يحتاج إلى متابعة ومجهود إضافي', 'ضاعف مجهوداتك، باستطاعتك ذلك', 'نتائج غير مقبولة، عليك بالمزيد'],
  ],
  fr: [
    ['Excellent', 'Excellent travail', 'Bravo !', 'Félicitations', 'Excellent, continue', 'Excellent élève', 'Travail remarquable', 'Bravo, continue ainsi', 'Résultats excellents',
      'Travail exemplaire', 'Remarquable, félicitations', 'Très beau travail'],
    ['T. Bien', 'Très bien', 'Très bon travail', 'T. Bien – élève actif', 'T. Bien, continue', 'Très bon élève', 'Très bien, bravo', 'Très bons résultats',
      'Travail sérieux et soigné', 'Très bien, continue ainsi'],
    ['Bien', 'Bon travail', 'Bien, continue', 'Bon élève', 'Bien – élève sérieux', 'Bons résultats', 'Bien, peut mieux faire', 'Bon travail, continue',
      'Bien, encourageant', 'Travail régulier', 'Bons efforts, continue'],
    ['Assez bien', 'A. Bien', 'Peut mieux faire', 'Assez bien, continue', 'Travail correct', 'A. Bien, persévère', 'Résultats corrects', 'Assez bien, encourageant',
      'En progrès, continue', 'Des progrès, persévère', 'Résultats encourageants'],
    ['Passable', 'Moyen', 'Des efforts à faire', 'Résultats moyens', 'Passable, travaille plus', 'Moyen, peut mieux faire', 'Doit fournir plus d’efforts', 'Travail irrégulier',
      'Peut progresser', 'Plus de régularité', 'Plus de concentration'],
    // No Faible: the lowest band says what helps, never labels the student.
    ['Insuffisant', 'Travail insuffisant', 'Doit travailler davantage', 'Résultats insuffisants', 'Des efforts sont nécessaires', 'Besoin de soutien',
      'Révise tes leçons régulièrement', 'Ne te décourage pas, continue', 'Peut progresser avec du travail', 'Plus d’efforts et de concentration'],
  ],
  en: [
    ['Excellent', 'Excellent work', 'Outstanding', 'Well done!', 'Excellent, keep it up', 'Brilliant work', 'Outstanding results'],
    ['V. Good', 'Very good', 'Very good work', 'V. Good, keep it up', 'Very good student', 'Very good results', 'Great work'],
    ['Good', 'Good work', 'Good, keep it up', 'Good effort', 'Good results', 'Good, can do better'],
    ['Fairly good', 'Fair', 'Can do better', 'Fair work', 'Satisfactory', 'Fairly good, keep trying'],
    ['Average', 'Needs more effort', 'Must try harder', 'Average work', 'Could do better', 'Needs to revise more'],
    // No Weak or Poor: the lowest band says what helps.
    ['Needs support', 'Must work harder', 'Insufficient', 'Keep trying', 'Needs more practice', 'Revise regularly', 'More effort needed'],
  ],
};

/**
 * A girl's form of each wording that speaks of the student (Excellente, Bonne élève, ممتازة، واصلي).
 * A wording about the work or the result (Excellent travail, نتيجة حسنة, Très bien) is the same for everyone.
 */
export const FEMININE_REMARKS: Record<RemarkLanguage, Readonly<Record<string, string>>> = {
  ar: {
    'ممتاز': 'ممتازة', 'ممتاز، واصل': 'ممتازة، واصلي', 'أحسنت، ممتاز': 'أحسنتِ، ممتازة', 'ممتاز، تلميذ مجتهد': 'ممتازة، تلميذة مجتهدة',
    'نتائج مشرفة، واصل': 'نتائج مشرفة، واصلي', 'ممتاز، أهنئك': 'ممتازة، أهنئكِ',
    'حسن جدا، واصل': 'حسن جدا، واصلي', 'حسن جدا، تلميذ نشيط': 'حسن جدا، تلميذة نشيطة', 'حسن جدا، استمر': 'حسن جدا، استمري',
    'جيد، واصل': 'جيد، واصلي', 'حسن، استمر': 'حسن، استمري',
    'مستحسن، واصل المجهود': 'مستحسن، واصلي المجهود', 'لا بأس، واصل': 'لا بأس، واصلي', 'مستحسن، ضاعف المجهود': 'مستحسن، ضاعفي المجهود',
    'متوسط، ابذل مجهودا': 'متوسطة، ابذلي مجهودا', 'متوسط، ضاعف المجهود': 'متوسطة، ضاعفي المجهود', 'متوسط': 'متوسطة', 'متوسط، يمكنك الأفضل': 'متوسطة، يمكنكِ الأفضل',
    'يحتاج إلى مجهود': 'تحتاج إلى مجهود', 'يحتاج إلى مزيد من العمل': 'تحتاج إلى مزيد من العمل',
    'متوسط، بإمكانك التحسن': 'متوسطة، بإمكانكِ التحسن', 'متوسط، راجع دروسك بانتظام': 'متوسطة، راجعي دروسكِ بانتظام',
    'عمل رائع، واصل التألق': 'عمل رائع، واصلي التألق', 'نتائج طيبة، واصل': 'نتائج طيبة، واصلي', 'مقبول، واصل العمل': 'مقبول، واصلي العمل', 'في تحسن، استمر': 'في تحسن، استمري',
    'يحتاج إلى دعم': 'تحتاج إلى دعم', 'يحتاج إلى متابعة': 'تحتاج إلى متابعة', 'غير كاف، واصل المحاولة': 'غير كاف، واصلي المحاولة',
    'بالمثابرة ستتحسن': 'بالمثابرة ستتحسنين', 'لا تيأس، واصل العمل': 'لا تيأسي، واصلي العمل', 'راجع دروسك بانتظام': 'راجعي دروسكِ بانتظام',
    'يحتاج إلى متابعة ومجهود إضافي': 'تحتاج إلى متابعة ومجهود إضافي', 'ضاعف مجهوداتك، باستطاعتك ذلك': 'ضاعفي مجهوداتكِ، باستطاعتكِ ذلك',
    // "you" (ك، ت) is marked for a girl too, as in the forms above.
    'أداء متميز، أحسنت': 'أداء متميز، أحسنتِ', 'حسن جدا، أحسنت': 'حسن جدا، أحسنتِ',
    'حسن، يمكنك الأفضل': 'حسن، يمكنكِ الأفضل', 'حسن، بإمكانك التقدم أكثر': 'حسن، بإمكانكِ التقدم أكثر',
    'مستحسن، يمكنك الأفضل': 'مستحسن، يمكنكِ الأفضل', 'مقبول، يمكنك التحسن': 'مقبول، يمكنكِ التحسن',
    'عليك بالمراجعة': 'عليكِ بالمراجعة', 'عليك بالمراجعة المستمرة': 'عليكِ بالمراجعة المستمرة', 'عليك بذل مجهود أكبر': 'عليكِ بذل مجهود أكبر',
    'يمكنك التحسن بالعمل': 'يمكنكِ التحسن بالعمل', 'نتائج غير مقبولة، عليك بالمزيد': 'نتائج غير مقبولة، عليكِ بالمزيد',
  },
  fr: {
    'Excellent': 'Excellente', 'Excellent, continue': 'Excellente, continue', 'Excellent élève': 'Excellente élève',
    'T. Bien – élève actif': 'T. Bien – élève active', 'Très bon élève': 'Très bonne élève',
    'Bon élève': 'Bonne élève', 'Bien – élève sérieux': 'Bien – élève sérieuse',
    'Moyen': 'Moyenne', 'Moyen, peut mieux faire': 'Moyenne, peut mieux faire',
    'Insuffisant': 'Insuffisante',
  },
  en: {},
};

/** The wording in the student's gender: a girl's own form where it has one. */
export const remarkFor = (language: RemarkLanguage, remark: string, gender?: string | null) =>
  gender === 'F' ? FEMININE_REMARKS[language][remark] ?? remark : remark;

/** A small stable hash (FNV-1a): the same student and subject get the same remark on every print. */
function hashOf(text: string) {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index++) hash = Math.imul(hash ^ text.charCodeAt(index), 16777619);
  return hash >>> 0;
}

const ENGLISH_SUBJECT = /[إا]نجليز|[إا]نكليز|english|anglais/i;
/** Subjects taught in Arabic: Arabic, Islamic education, social studies (history, geography, citizenship), the Quran. */
const ARABIC_SUBJECT = /عربي|[إا]سلامي|اجتماعي|تاريخ|جغرافي|مواطن|قرآن|قران/;
const FRENCH_SUBJECT = /فرنس|french|fran[cç]ais/i;
/** Mathematics, whatever the sheet calls it (الرياضيات, Maths): its remarks are in French, except in CE6. */
const MATH_SUBJECT = /math|رياضيات/i;
/** CE6, the sixth year of primary (6APG-1 on Massar, or CE6), where Mathematics is remarked on in Arabic. */
const CE6_CLASS = /^\s*(6\s*AP|CE\s*6)/i;

/**
 * The language a subject's teacher writes remarks in: English for English, Arabic for the subjects taught
 * in Arabic, French for French and Mathematics. Any other subject's teacher mostly writes in French (about 9 in 10), else
 * in Arabic: one or the other for that subject of that class, on every student's statement.
 */
export function remarkLanguage(subject: string, className = ''): RemarkLanguage {
  if (ENGLISH_SUBJECT.test(subject)) return 'en';
  if (ARABIC_SUBJECT.test(subject)) return 'ar';
  if (FRENCH_SUBJECT.test(subject)) return 'fr';
  if (MATH_SUBJECT.test(subject)) return CE6_CLASS.test(className) ? 'ar' : 'fr';
  return hashOf(`lang|${className}|${subject}`) % 10 === 0 ? 'ar' : 'fr';
}

/**
 * The remark one student gets in one subject: the band's wording picked by student and subject, so a
 * class's statements do not all repeat the same word, yet a reprint writes the same thing.
 * `used` collects the wordings already on the page: one taken by another subject gives way to the next, while any is left.
 */
export function studentRemark(mark: number | null, maxMark: number, subject: string, studentId: string, used?: Set<string>, className = '', gender?: string | null) {
  const band = remarkBand(mark, maxMark);
  if (band === null) return '';
  const language = remarkLanguage(subject, className);
  const choices = REMARKS[language][band].map(remark => remarkFor(language, remark, gender));
  const start = hashOf(`${studentId}|${subject}`);
  const pick = (step: number) => choices[(start + step) % choices.length];
  const offset = choices.findIndex((_, step) => !used?.has(pick(step)));
  const remark = pick(Math.max(0, offset));
  used?.add(remark);
  return remark;
}

/**
 * Each subject is written by its own teacher: one pen (handwriting and ink) for that subject on every
 * student's statement, a different one from subject to subject. Arabic is always written in Ruqaa.
 */
const PENS = [
  { latin: 'MassarPenKalam', size: 14, ink: '#1e3a8a' },
  { latin: 'MassarPenCaveat', size: 17, ink: '#1f2937' },
  { latin: 'MassarPenReenie', size: 18, ink: '#1d4ed8' },
  { latin: 'MassarPenKalam', size: 14, ink: '#111827' },
  { latin: 'MassarPenCaveat', size: 17, ink: '#1e40af' },
] as const;

export const remarkPen = (subject: string, className: string) => PENS[hashOf(`${className}|${subject}`) % PENS.length];
