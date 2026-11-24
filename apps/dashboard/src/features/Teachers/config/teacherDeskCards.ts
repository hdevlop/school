import { compareClassNames } from '@sms/contracts';
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
  /** The name in Arabic: an Arabic card shows it in place of `name`. */
  nameAr?: string | null;
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
  /** An imported image that fills each card behind a white veil; none prints plain paper. */
  backgroundImage?: string | null;
  /** What the card shows, and how large; the default is the full card at medium size. */
  display?: Partial<DeskCardDisplay>;
}

/** Which of the teacher's names: the card's language's (auto), one, or both on two lines. */
export const DESK_CARD_NAME_MODES = ['auto', 'latin', 'arabic', 'both'] as const;
export type DeskCardNameMode = (typeof DESK_CARD_NAME_MODES)[number];
export const DESK_CARD_TEXT_SIZES = ['small', 'medium', 'large'] as const;
export type DeskCardTextSize = (typeof DESK_CARD_TEXT_SIZES)[number];
/** The card's typeface: a Latin family and an Arabic one, all hosted by School so printing needs no network. */
export const DESK_CARD_FONTS = ['classic', 'modern', 'elegant', 'hand'] as const;
export type DeskCardFont = (typeof DESK_CARD_FONTS)[number];
export const DESK_CARD_FONT_STACKS: Record<DeskCardFont, { latin: string; arabic: string }> = {
  // Carlito and FreeSerif, as the Massar sheets.
  classic: { latin: 'MassarLatin', arabic: 'MassarArabic' },
  modern: { latin: 'MassarLatin', arabic: 'DeskNaskh' },
  // FreeSerif (named MassarArabic) has Latin letters too: a serif for both scripts.
  elegant: { latin: 'MassarArabic', arabic: 'DeskNaskh' },
  hand: { latin: 'MassarPenKalam', arabic: 'MassarHand' },
};

/** Every family a card may use; the dialog loads them too, to show each choice in its own letters. */
export function deskCardFontFaces(origin: string) {
  const naskh = e(safeUrl('/fonts/insurance/', origin));
  return `${massarFontFaces(origin)}
    @font-face{font-family:DeskNaskh;src:url('${naskh}NotoNaskhArabic-400.woff2') format('woff2');font-weight:400;font-display:swap}
    @font-face{font-family:DeskNaskh;src:url('${naskh}NotoNaskhArabic-700.woff2') format('woff2');font-weight:700;font-display:swap}`;
}

/** The parts a card may leave out. */
export const DESK_CARD_PARTS = ['title', 'subjects', 'classes', 'school', 'year'] as const;
export type DeskCardPart = (typeof DESK_CARD_PARTS)[number];

export type DeskCardDisplay = { names: DeskCardNameMode; textSize: DeskCardTextSize; font: DeskCardFont } & Record<DeskCardPart, boolean>;

export const DEFAULT_DESK_CARD_DISPLAY: DeskCardDisplay = {
  names: 'auto', textSize: 'medium', font: 'classic', title: true, subjects: true, classes: true, school: true, year: true,
};

const TEXT_SCALE: Record<DeskCardTextSize, number> = { small: 0.85, medium: 1, large: 1.2 };

/** A display read back from storage or a caller: anything unknown takes the default. */
export function deskCardDisplay(value: unknown): DeskCardDisplay {
  const given = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  const pick = <T extends string>(list: readonly T[], item: unknown, fallback: T) => (list.includes(item as T) ? item as T : fallback);
  return {
    names: pick(DESK_CARD_NAME_MODES, given.names, DEFAULT_DESK_CARD_DISPLAY.names),
    textSize: pick(DESK_CARD_TEXT_SIZES, given.textSize, DEFAULT_DESK_CARD_DISPLAY.textSize),
    font: pick(DESK_CARD_FONTS, given.font, DEFAULT_DESK_CARD_DISPLAY.font),
    ...Object.fromEntries(DESK_CARD_PARTS.map((part) => [part, typeof given[part] === 'boolean' ? given[part] : DEFAULT_DESK_CARD_DISPLAY[part]])) as Record<DeskCardPart, boolean>,
  };
}

export interface DeskCard {
  id: string;
  language: DeskCardLanguage;
  /** The name printed large. */
  name: string;
  /** The other name, printed smaller under it when both are shown. */
  altName: string | null;
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
 * The card reads in the language its subjects are taught in. A teacher of a
 * subject named in Arabic (العربية) is the class's Arabic teacher: the whole
 * card is Arabic, every subject under its Arabic name (Éducation islamique →
 * التربية الإسلامية). Any other teacher's card is French.
 */
export function deskCardLanguage(subjects: readonly DeskCardSubject[], fallback: DeskCardLanguage): DeskCardLanguage {
  if (!subjects.length) return fallback;
  return subjects.some((subject) => isArabicText(subject.name)) ? 'ar' : 'fr';
}

/** Each class taught, once, by its level alone (CP, CE1): sections are not named. In the school's order: CP, CE1, CE2… */
export function taughtClasses(teacher: DeskCardTeacher, classes: readonly DeskCardClass[]): string[] {
  return unique((teacher.assignments ?? []).flatMap((assignment) => {
    const cls = classes.find((item) => item.id === assignment.classId);
    return cls ? [cls.name] : [];
  })).sort(compareClassNames);
}

const translate = (language: DeskCardLanguage, key: string) => schoolI18n.translate(language, key as SchoolTranslationKey);

/**
 * The names a card prints: auto gives the card's language's (the Arabic name on
 * an Arabic card when it is set); both gives that one large and the other under
 * it. A teacher with no Arabic name always shows the Latin one.
 */
export function deskCardNames(teacher: Pick<DeskCardTeacher, 'name' | 'nameAr'>, language: DeskCardLanguage, mode: DeskCardNameMode) {
  // Stored capitalized, as every name in School (capitalizePersonName).
  const latin = teacher.name.trim();
  const arabic = teacher.nameAr?.trim() || '';
  if (!arabic || arabic === latin) return { name: latin, altName: null };
  if (mode === 'latin') return { name: latin, altName: null };
  if (mode === 'arabic') return { name: arabic, altName: null };
  const [first, second] = language === 'ar' ? [arabic, latin] : [latin, arabic];
  return { name: first, altName: mode === 'both' ? second : null };
}

export function deskCard(teacher: DeskCardTeacher, options: Pick<DeskCardOptions, 'subjects' | 'classes' | 'fallback' | 'display'>): DeskCard {
  const subjects = taughtSubjects(teacher, options.subjects);
  const language = deskCardLanguage(subjects, teacher.specialization && isArabicText(teacher.specialization) ? 'ar' : options.fallback);
  const gender = teacher.gender === 'M' || teacher.gender === 'F' ? teacher.gender : 'other';
  const names = subjects.map((subject) => (language === 'ar' ? subject.nameAr?.trim() || subject.name : subject.name));
  return {
    id: teacher.id,
    language,
    ...deskCardNames(teacher, language, deskCardDisplay(options.display).names),
    title: translate(language, `teachers.deskCards.title.${gender}`),
    subjects: names.length ? names : teacher.specialization ? [teacher.specialization] : [],
    classes: taughtClasses(teacher, options.classes),
  };
}

/** A long name takes a smaller size, so every name holds on one or two lines. */
export const nameSize = (name: string) => (name.length <= 16 ? 24 : name.length <= 24 ? 22 : name.length <= 34 ? 19 : 17);
const subjectSize = (subjects: readonly string[]) => {
  const length = subjects.join(' · ').length;
  return length <= 18 ? 14 : length <= 32 ? 13 : length <= 50 ? 12 : 11;
};

function cardHtml(card: DeskCard, options: DeskCardOptions, logo: string, background: string, display: DeskCardDisplay) {
  const school = card.language === 'ar' ? options.school.nameAr?.trim() || options.school.name : options.school.name;
  const dir = schoolI18n.direction(card.language);
  const scale = TEXT_SCALE[display.textSize];
  const pt = (size: number) => `${Math.round(size * scale * 10) / 10}pt`;
  const head = display.school || display.year ? `<header>${display.school
    ? `${logo ? `<img src="${e(logo)}" alt="">` : ''}<span class="school"><bdi>${e(school)}</bdi></span>` : '<span class="school"></span>'}
      ${display.year ? `<span class="year"><small>${e(translate(card.language, 'teachers.deskCards.year'))}</small><bdi dir="ltr">${e(options.year)}</bdi></span>` : ''}</header>` : '';
  const subjects = display.subjects && card.subjects.length
    ? `<h2 style="font-size:${pt(subjectSize(card.subjects))}">${card.subjects.map((subject) => `<bdi>${e(subject)}</bdi>`).join('<i>·</i>')}</h2>` : '';
  const classes = display.classes && card.classes.length
    ? `<footer><small>${e(translate(card.language, 'teachers.deskCards.classes'))}</small><p>${card.classes
      .map((name) => `<span style="font-size:${pt(11)}"><bdi>${e(name)}</bdi></span>`).join('')}</p></footer>` : '';
  return `<article class="card ${card.language}" lang="${card.language}" dir="${dir}">
    ${background ? `<img class="backdrop" src="${e(background)}" alt=""><span class="veil"></span>` : ''}
    ${head}
    <main>
      ${display.title ? `<p class="role" style="font-size:${pt(14)}">${e(card.title)}</p>` : ''}
      <h1 style="font-size:${pt(nameSize(card.name))}"><bdi>${e(card.name)}</bdi></h1>
      ${card.altName ? `<p class="alt" style="font-size:${pt(nameSize(card.altName) * 0.62)}"><bdi>${e(card.altName)}</bdi></p>` : ''}
      ${subjects}
    </main>
    ${classes}
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
  const background = safeUrl(options.backgroundImage, origin);
  const display = deskCardDisplay(options.display);
  const pages: DeskCard[][] = [];
  for (let at = 0; at < cards.length; at += 2) pages.push(cards.slice(at, at + 2));
  const title = translate(options.fallback, 'teachers.deskCards.document');
  const fonts = DESK_CARD_FONT_STACKS[display.font];
  return `<!doctype html><html lang="${options.fallback}" dir="${schoolI18n.direction(options.fallback)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(title)}</title><style>
    ${deskCardFontFaces(origin)}
    ${schoolPrintAccentCss(options.accent)}
    :root{--latin:${fonts.latin};--arabic:${fonts.arabic}}
    *{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}html{color-scheme:light}
    body{margin:0;background:#e9edf2;color:#1f2937;font:10pt/1.3 var(--latin),var(--arabic),"Segoe UI",Tahoma,Arial,sans-serif}
    .page{width:210mm;height:297mm;margin:0 auto 16px;background:#fff;display:grid;grid-template-rows:1fr 1fr;break-after:page;overflow:hidden}
    .page:last-child{break-after:auto}
    .card{position:relative;display:flex;flex-direction:column;height:148.5mm;padding:10mm 12mm 9mm;overflow:hidden}
    .card+.card{border-top:.6pt dashed #94a3b8}
    .card::before{content:"";position:absolute;inset:5mm;border:1.6pt solid var(--accent);border-radius:4mm;pointer-events:none}
    .ar{font-family:var(--arabic),var(--latin),Tahoma,serif}
    header{display:flex;align-items:center;gap:3mm;padding:0 2mm 2.5mm;border-bottom:.8pt solid #e2e8f0}
    header img{width:13mm;height:13mm;object-fit:contain;flex:none}
    .school{flex:1;min-width:0;font-size:12pt;font-weight:700;color:#334155;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .year{display:flex;flex-direction:column;align-items:flex-end;font-size:11pt;font-weight:700;color:#334155}.year small{font-size:8pt;font-weight:400;color:#64748b}
    main{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3mm;text-align:center;padding:0 4mm}
    .role{margin:0;font-size:14pt;color:#64748b;letter-spacing:.02em}
    h1{margin:0;line-height:1.1;font-weight:700;color:#0f172a;overflow-wrap:anywhere}
    .alt{margin:-1.5mm 0 0;font-weight:600;color:#475569;line-height:1.15;overflow-wrap:anywhere}
    h2{margin:1mm 0 0;padding:1mm 5mm;border-radius:999px;background:var(--accent);color:var(--accent-foreground);line-height:1.25;font-weight:700}
    h2 i{font-style:normal;margin:0 2.5mm;opacity:.7}
    footer{display:flex;align-items:center;gap:3mm;padding:2.5mm 2mm 0;border-top:.8pt solid #e2e8f0}
    footer small{flex:none;font-size:10pt;color:#64748b}
    footer p{display:flex;flex-wrap:wrap;gap:1.5mm;margin:0}
    footer span{padding:.6mm 3mm;border:.6pt solid #cbd5e1;border-radius:1.5mm;font-weight:700;font-size:11pt;color:#334155;white-space:nowrap}
    @page{size:A4 portrait;margin:0}
    .card{isolation:isolate}
    .backdrop,.veil{position:absolute;inset:5mm;border-radius:4mm;z-index:-1;pointer-events:none}
    .backdrop{width:calc(100% - 10mm);height:calc(100% - 10mm);object-fit:cover}
    .veil{background:radial-gradient(ellipse 62% 58% at center,rgba(255,255,255,.88),rgba(255,255,255,.55) 70%,rgba(255,255,255,.3))}
    @media print{body{background:#fff}.page{margin:0}}
  </style></head><body>${pages.map((page) => `<section class="page">${page.map((card) => cardHtml(card, options, logo, background, display)).join('')}</section>`).join('')}</body></html>`;
}
