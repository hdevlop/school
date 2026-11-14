/**
 * The remarks a student statement shows in each subject's "ملاحظات" cell, written as a teacher would by hand:
 * a wording from the mark's band, in the subject's language, with that subject's teacher's pen.
 * Every choice is a stable hash of the student, subject and class, so a reprint writes the same thing.
 */

export type RemarkLanguage = 'ar' | 'fr' | 'en';

/** A mark's band by its share of the maximum (/10 primary, /20 collège): 0 ممتاز (≥90%) … 5 ضعيف (<50%); none without a mark. */
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
    ['ممتاز', 'ممتاز، واصل', 'عمل ممتاز', 'نتيجة ممتازة', 'أحسنت، ممتاز', 'ممتاز، تلميذ مجتهد', 'عمل متميز', 'نتائج مشرفة، واصل', 'ممتاز، أهنئك'],
    ['حسن جدا', 'عمل جيد جدا', 'حسن جدا، واصل', 'نتيجة جيدة جدا', 'حسن جدا، تلميذ نشيط', 'مجهود جيد جدا', 'حسن جدا، استمر', 'أداء جيد جدا'],
    ['حسن', 'عمل حسن', 'نتيجة حسنة', 'جيد، واصل', 'حسن، يمكنك الأفضل', 'مجهود حسن', 'حسن، استمر', 'عمل جيد'],
    ['مستحسن', 'مستحسن، يمكنك الأفضل', 'عمل مقبول', 'مستحسن، واصل المجهود', 'نتيجة مقبولة', 'لا بأس، واصل', 'مستحسن، ضاعف المجهود', 'مقبول، يمكنك التحسن'],
    ['متوسط', 'متوسط، ابذل مجهودا', 'يحتاج إلى مجهود', 'نتيجة متوسطة', 'متوسط، يمكنك الأفضل', 'عليك بالمراجعة', 'متوسط، ضاعف المجهود', 'يحتاج إلى مزيد من العمل'],
    ['ضعيف', 'ضعيف، يجب الاجتهاد', 'عليك بذل مجهود أكبر', 'نتيجة ضعيفة', 'غير كاف', 'ضعيف، عليك بالمراجعة', 'يحتاج إلى دعم', 'ضعيف، ينبغي المثابرة'],
  ],
  fr: [
    ['Excellent', 'Excellent travail', 'Bravo !', 'Félicitations', 'Excellent, continue', 'Excellent élève', 'Travail remarquable', 'Bravo, continue ainsi', 'Résultats excellents'],
    ['T. Bien', 'Très bien', 'Très bon travail', 'T. Bien – élève actif', 'T. Bien, continue', 'Très bon élève', 'Très bien, bravo', 'Très bons résultats'],
    ['Bien', 'Bon travail', 'Bien, continue', 'Bon élève', 'Bien – élève sérieux', 'Bons résultats', 'Bien, peut mieux faire', 'Bon travail, continue'],
    ['Assez bien', 'A. Bien', 'Peut mieux faire', 'Assez bien, continue', 'Travail correct', 'A. Bien, persévère', 'Résultats corrects', 'Assez bien, encourageant'],
    ['Passable', 'Moyen', 'Des efforts à faire', 'Résultats moyens', 'Passable, travaille plus', 'Moyen, peut mieux faire', 'Doit fournir plus d’efforts', 'Travail irrégulier'],
    ['Insuffisant', 'Faible', 'Travail insuffisant', 'Doit travailler davantage', 'Résultats insuffisants', 'Faible, révise tes leçons', 'Manque de travail', 'Des efforts sont nécessaires'],
  ],
  en: [
    ['Excellent', 'Excellent work', 'Outstanding', 'Well done!', 'Excellent, keep it up', 'Brilliant work', 'Outstanding results'],
    ['V. Good', 'Very good', 'Very good work', 'V. Good, keep it up', 'Very good student', 'Very good results', 'Great work'],
    ['Good', 'Good work', 'Good, keep it up', 'Good effort', 'Good results', 'Good, can do better'],
    ['Fairly good', 'Fair', 'Can do better', 'Fair work', 'Satisfactory', 'Fairly good, keep trying'],
    ['Average', 'Needs more effort', 'Must try harder', 'Average work', 'Could do better', 'Needs to revise more'],
    ['Weak', 'Poor', 'Must work harder', 'Insufficient', 'Needs support', 'Poor results'],
  ],
};

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

/**
 * The language a subject's teacher writes remarks in: English for English, Arabic for the subjects taught
 * in Arabic, French for French. Any other subject's teacher mostly writes in French (about 9 in 10), else
 * in Arabic: one or the other for that subject of that class, on every student's statement.
 */
export function remarkLanguage(subject: string, className = ''): RemarkLanguage {
  if (ENGLISH_SUBJECT.test(subject)) return 'en';
  if (ARABIC_SUBJECT.test(subject)) return 'ar';
  if (FRENCH_SUBJECT.test(subject)) return 'fr';
  return hashOf(`lang|${className}|${subject}`) % 10 === 0 ? 'ar' : 'fr';
}

/**
 * The remark one student gets in one subject: the band's wording picked by student and subject, so a
 * class's statements do not all repeat the same word, yet a reprint writes the same thing.
 * `used` collects the wordings already on the page: one taken by another subject gives way to the next, while any is left.
 */
export function studentRemark(mark: number | null, maxMark: number, subject: string, studentId: string, used?: Set<string>, className = '') {
  const band = remarkBand(mark, maxMark);
  if (band === null) return '';
  const choices = REMARKS[remarkLanguage(subject, className)][band];
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
