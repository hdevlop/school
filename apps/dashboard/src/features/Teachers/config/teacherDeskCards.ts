import { schoolI18n, type SchoolTranslationKey } from '@sms/contracts/locales';
import { escapeHtml as e, massarFontFaces, safeUrl } from '@/features/Massar/config/massarDocument';
import { isArabicText } from '@/features/Competencies/config/competencyLanguage';
import { schoolPrintAccentCss } from '@/shared/schoolPrintDocument';

export type DeskCardLanguage = 'ar' | 'fr';
export type DeskCardSubject = { id: string; name: string; nameAr?: string | null };
export type DeskCardClass = { id: string; name: string; sections?: readonly { id: string; name: string }[] | null };
export type DeskCardTeacher = {
  id: string;
  name: string;
  gender?: string | null;
  specialization?: string | null;
  assignments?: readonly { classId: string; sectionIds?: readonly string[] | null; subjectIds?: readonly string[] | null }[] | null;
};

export interface DeskCardOptions {
  subjects: readonly DeskCardSubject[];
  classes: readonly DeskCardClass[];
  /** The school's name in each card language. */
  school: { name: string; nameAr?: string | null; logo?: string | null };
  /** The school year the assignments belong to ("2026-2027"). */
  year: string;
  /** The language of a teacher with no subject: the interface's, Arabic or French. */
  fallback: DeskCardLanguage;
  assetOrigin: string;
  accent: { color: string; foreground: string };
}

export interface DeskCard {
  id: string;
  language: DeskCardLanguage;
  name: string;
  title: string;
  subjects: string[];
  classes: string[];
}

const unique = <T,>(values: readonly T[]) => [...new Set(values)];

/** The subjects a teacher teaches this year, in the order first assigned. */
export function taughtSubjects(teacher: DeskCardTeacher, subjects: readonly DeskCardSubject[]): DeskCardSubject[] {
  const ids = unique((teacher.assignments ?? []).flatMap((assignment) => assignment.subjectIds ?? []));
  return ids.map((id) => subjects.find((subject) => subject.id === id)).filter((subject): subject is DeskCardSubject => !!subject);
}

/**
 * The card reads in the language its subjects are taught in: a subject named
 * in Arabic (العربية, التربية الإسلامية) is taught in Arabic, any other in
 * French. A teacher of both follows the larger share; a tie, the first subject.
 */
export function deskCardLanguage(subjects: readonly DeskCardSubject[], fallback: DeskCardLanguage): DeskCardLanguage {
  if (!subjects.length) return fallback;
  const arabic = subjects.filter((subject) => isArabicText(subject.name)).length;
  const latin = subjects.length - arabic;
  if (arabic !== latin) return arabic > latin ? 'ar' : 'fr';
  return isArabicText(subjects[0].name) ? 'ar' : 'fr';
}

/** Each class taught, once, by its level alone (CP, CE1): sections are not named. */
export function taughtClasses(teacher: DeskCardTeacher, classes: readonly DeskCardClass[]): string[] {
  return unique((teacher.assignments ?? []).flatMap((assignment) => {
    const cls = classes.find((item) => item.id === assignment.classId);
    return cls ? [cls.name] : [];
  }));
}

const translate = (language: DeskCardLanguage, key: string) => schoolI18n.translate(language, key as SchoolTranslationKey);

export function deskCard(teacher: DeskCardTeacher, options: Pick<DeskCardOptions, 'subjects' | 'classes' | 'fallback'>): DeskCard {
  const subjects = taughtSubjects(teacher, options.subjects);
  const language = deskCardLanguage(subjects, teacher.specialization && isArabicText(teacher.specialization) ? 'ar' : options.fallback);
  const gender = teacher.gender === 'M' || teacher.gender === 'F' ? teacher.gender : 'other';
  const names = subjects.map((subject) => (language === 'ar' ? subject.nameAr?.trim() || subject.name : subject.name));
  return {
    id: teacher.id,
    language,
    name: teacher.name.trim(),
    title: translate(language, `teachers.deskCards.title.${gender}`),
    subjects: names.length ? names : teacher.specialization ? [teacher.specialization] : [],
    classes: taughtClasses(teacher, options.classes),
  };
}

/** A long name takes a smaller size, so every name holds on one or two lines. */
export const nameSize = (name: string) => (name.length <= 16 ? 32 : name.length <= 24 ? 28 : name.length <= 34 ? 24 : 21);
const subjectSize = (subjects: readonly string[]) => {
  const length = subjects.join(' · ').length;
  return length <= 18 ? 20 : length <= 32 ? 17 : length <= 50 ? 15 : 13;
};

function cardHtml(card: DeskCard, options: DeskCardOptions, logo: string) {
  const school = card.language === 'ar' ? options.school.nameAr?.trim() || options.school.name : options.school.name;
  const dir = schoolI18n.direction(card.language);
  return `<article class="card ${card.language}" lang="${card.language}" dir="${dir}">
    <header>${logo ? `<img src="${e(logo)}" alt="">` : ''}<span class="school"><bdi>${e(school)}</bdi></span>
      <span class="year"><small>${e(translate(card.language, 'teachers.deskCards.year'))}</small><bdi dir="ltr">${e(options.year)}</bdi></span></header>
    <main>
      <p class="role">${e(card.title)}</p>
      <h1 style="font-size:${nameSize(card.name)}pt"><bdi>${e(card.name)}</bdi></h1>
      ${card.subjects.length ? `<h2 style="font-size:${subjectSize(card.subjects)}pt">${card.subjects.map((subject) => `<bdi>${e(subject)}</bdi>`).join('<i>·</i>')}</h2>` : ''}
    </main>
    ${card.classes.length ? `<footer><small>${e(translate(card.language, 'teachers.deskCards.classes'))}</small><p>${card.classes
    .map((name) => `<span><bdi>${e(name)}</bdi></span>`).join('')}</p></footer>` : ''}
  </article>`;
}

/**
 * One card per teacher on half an A4 sheet (A5 landscape), two to a page with
 * a dashed line to cut along: the name large, the subjects under it, the
 * classes at the foot, each card in its subjects' language.
 */
export function buildTeacherDeskCards(teachers: readonly DeskCardTeacher[], options: DeskCardOptions): string {
  const origin = options.assetOrigin;
  const logo = safeUrl(options.school.logo, origin);
  const cards = teachers.map((teacher) => deskCard(teacher, options));
  const pages: DeskCard[][] = [];
  for (let at = 0; at < cards.length; at += 2) pages.push(cards.slice(at, at + 2));
  const title = translate(options.fallback, 'teachers.deskCards.document');
  return `<!doctype html><html lang="${options.fallback}" dir="${schoolI18n.direction(options.fallback)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(title)}</title><style>
    ${massarFontFaces(origin)}
    ${schoolPrintAccentCss(options.accent)}
    *{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}html{color-scheme:light}
    body{margin:0;background:#e9edf2;color:#1f2937;font:10pt/1.3 MassarLatin,MassarArabic,"Segoe UI",Tahoma,Arial,sans-serif}
    .page{width:210mm;height:297mm;margin:0 auto 16px;background:#fff;display:grid;grid-template-rows:1fr 1fr;break-after:page;overflow:hidden}
    .page:last-child{break-after:auto}
    .card{position:relative;display:flex;flex-direction:column;height:148.5mm;padding:10mm 12mm 9mm;overflow:hidden}
    .card+.card{border-top:.6pt dashed #94a3b8}
    .card::before{content:"";position:absolute;inset:5mm;border:1.6pt solid var(--accent);border-radius:4mm;pointer-events:none}
    .ar{font-family:MassarArabic,MassarLatin,Tahoma,serif}
    header{display:flex;align-items:center;gap:3mm;padding:0 2mm 2.5mm;border-bottom:.8pt solid #e2e8f0}
    header img{width:13mm;height:13mm;object-fit:contain;flex:none}
    .school{flex:1;min-width:0;font-size:12pt;font-weight:700;color:#334155;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .year{display:flex;flex-direction:column;align-items:flex-end;font-size:11pt;font-weight:700;color:#334155}.year small{font-size:8pt;font-weight:400;color:#64748b}
    main{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3mm;text-align:center;padding:0 4mm}
    .role{margin:0;font-size:14pt;color:#64748b;letter-spacing:.02em}
    h1{margin:0;line-height:1.1;font-weight:700;color:#0f172a;overflow-wrap:anywhere}
    h2{margin:1mm 0 0;padding:1.5mm 7mm;border-radius:999px;background:var(--accent);color:var(--accent-foreground);line-height:1.25;font-weight:700}
    h2 i{font-style:normal;margin:0 2.5mm;opacity:.7}
    footer{display:flex;align-items:center;gap:3mm;padding:2.5mm 2mm 0;border-top:.8pt solid #e2e8f0}
    footer small{flex:none;font-size:10pt;color:#64748b}
    footer p{display:flex;flex-wrap:wrap;gap:1.5mm;margin:0}
    footer span{padding:.6mm 3mm;border:.6pt solid #cbd5e1;border-radius:1.5mm;font:700 11pt MassarLatin,MassarArabic,sans-serif;color:#334155;white-space:nowrap}
    @page{size:A4 portrait;margin:0}
    @media print{body{background:#fff}.page{margin:0}}
  </style></head><body>${pages.map((page) => `<section class="page">${page.map((card) => cardHtml(card, options, logo)).join('')}</section>`).join('')}</body></html>`;
}
