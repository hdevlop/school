import { MASSAR_DEFAULT_STATEMENT, withStatementDefaults, type MassarSetup, type MassarSheetDetail, type MassarStatementSettings, type MassarStudent } from '@sms/contracts';
import { classCycle, classOrder, massarClassColors } from './massarModel';
import { escapeHtml as e, massarFontFaces, massarMarkText, safeUrl } from './massarDocument';
import { remarkLanguage, remarkPen, studentRemark } from './statementRemarks';

// ─── Types ──────────────────────────────────────────────────────────────────

/** `studentIds` prints those students' pages only, ranked among the whole class all the same. */
export type StudentStatementOptions = { language: string; logo?: string | null; title: string; settings?: MassarStatementSettings | null; studentIds?: readonly string[] };

type StatementPart = { name: string; mark: string; value: number | null };
/** A subject on a statement; `rank` is by the subject's average within the class, among the `ranked` students who have one. */
type StatementUnit = { subject: string; parts: StatementPart[]; average: number | null; coefficient: number; rank: number | null; ranked: number };
export type StudentStatement = {
  student: MassarStudent; className: string; levelLabel: string; schoolName: string; yearLabel: string;
  termLabel: string; examLabel: string; maxMark: number;
  /** One unit per subject sheet of the class the student is on, in the school's order (else the Massar tabs'). */
  units: StatementUnit[];
  /** The general average, and the rank it gives within the class among the `ranked` students who have one. */
  average: number | null; rank: number | null; ranked: number;
};

// ─── Levels and coefficients ────────────────────────────────────────────────

/** A Massar class's level: its name without the class number (5APG-1 → 5APG). */
export const levelOfClass = (className: string) => {
  const at = className.lastIndexOf('-');
  return at > 0 ? className.slice(0, at) : className;
};
/** Coefficients are set per level: a subject can weigh more on one level than on another. */
export const coefficientKey = (level: string, subject: string) => `${level}|${subject}`;
export const coefficientOf = (settings: Pick<MassarStatementSettings, 'coefficients'>, level: string, subject: string) =>
  settings.coefficients[coefficientKey(level, subject)] ?? 1;

// ─── Averages and ranks ─────────────────────────────────────────────────────

const mean = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;

/** A part's mark as a number; a justified absence or a mark not entered counts in no average. */
const markValue = (sheet: MassarSheetDetail, studentId: string, code: string) => {
  const found = sheet.marks.find(item => item.studentId === studentId && item.componentCode === code);
  return !found || found.absence === 'justified' || found.mark === null ? null : Number(found.mark);
};

/** The school's order: subjects it lists first, in its order; any other keeps its place among the rest. */
export function orderSubjects<T extends { subject: string }>(units: T[], order: readonly string[]) {
  const place = (name: string) => {
    const index = order.indexOf(name);
    return index < 0 ? order.length : index;
  };
  return units
    .map((unit, index) => ({ unit, index }))
    .sort((a, b) => place(a.unit.subject) - place(b.unit.subject) || a.index - b.index)
    .map(item => item.unit);
}

/** The subjects' averages weighed by their coefficients; a subject with no average, or a coefficient of 0, is left out. */
export function generalAverage(units: Array<{ average: number | null; coefficient: number }>) {
  const counted = units.filter(unit => unit.average !== null && unit.coefficient > 0);
  const weight = counted.reduce((sum, unit) => sum + unit.coefficient, 0);
  return weight ? counted.reduce((sum, unit) => sum + unit.average! * unit.coefficient, 0) / weight : null;
}

/** Ranks as a class reads them: averages equal to the hundredth, as printed, share a rank, and the next one skips (1, 2, 2, 4). */
export function classRanks(averages: Array<number | null>) {
  const shown = averages.map(value => value === null ? null : Math.round(value * 100));
  return shown.map(value => value === null ? null : 1 + shown.filter(other => other !== null && other > value).length);
}

/** Ranks every item among the others by `average`, writing `rank` and `ranked` (how many have one). */
function rankAmong<T extends { average: number | null }>(items: T[]): Array<T & { rank: number | null; ranked: number }> {
  const ranks = classRanks(items.map(item => item.average));
  const ranked = ranks.filter(rank => rank !== null).length;
  return items.map((item, index) => Object.assign(item, { rank: ranks[index], ranked }));
}

// ─── Statements ─────────────────────────────────────────────────────────────

/**
 * A Contrôle's sheets turned around: one statement per student, holding every
 * subject of the student's class with its parts and marks. A student is the same
 * School student on every sheet of the class (the roster's id), and keeps the
 * class's Massar order. A subject whose sheet does not list the student is left
 * out of that student's statement, rather than printed empty.
 */
export function studentStatements(sheets: MassarSheetDetail[], settings: MassarStatementSettings = MASSAR_DEFAULT_STATEMENT): StudentStatement[] {
  const byClass = new Map<string, MassarSheetDetail[]>();
  for (const sheet of sheets) byClass.set(sheet.sheet.className, [...(byClass.get(sheet.sheet.className) ?? []), sheet]);
  return [...byClass.keys()].sort(classOrder).flatMap(className => classStatements(className, byClass.get(className)!, settings));
}

function classStatements(className: string, list: MassarSheetDetail[], settings: MassarStatementSettings): StudentStatement[] {
  const first = list[0];
  const level = levelOfClass(className);

  const roster = new Map<string, MassarStudent>();
  for (const sheet of list) for (const student of sheet.students) if (!roster.has(student.id)) roster.set(student.id, student);

  const unitOf = (sheet: MassarSheetDetail, studentId: string): StatementUnit => {
    const parts = sheet.components.map(component => ({
      name: component.name,
      mark: massarMarkText(sheet, studentId, component.code),
      value: markValue(sheet, studentId, component.code),
    }));
    return {
      subject: sheet.sheet.subjectName,
      parts,
      average: mean(parts.flatMap(part => part.value === null ? [] : [part.value])),
      coefficient: coefficientOf(settings, level, sheet.sheet.subjectName),
      rank: null,
      ranked: 0,
    };
  };

  const statements = [...roster.values()].sort((a, b) => a.position - b.position).map((student): StudentStatement => {
    const listed = list.filter(sheet => sheet.students.some(item => item.id === student.id));
    const units = orderSubjects(listed.map(sheet => unitOf(sheet, student.id)), settings.order);
    return {
      student, className,
      levelLabel: first.levelLabel, schoolName: first.schoolName, yearLabel: first.yearLabel,
      termLabel: first.round.termLabel, examLabel: first.round.examLabel, maxMark: first.maxMark,
      units, average: generalAverage(units), rank: null, ranked: 0,
    };
  });

  // Each subject's rank, among the class's students on that subject's sheet.
  const bySubject = new Map<string, StatementUnit[]>();
  for (const statement of statements) for (const unit of statement.units) bySubject.set(unit.subject, [...(bySubject.get(unit.subject) ?? []), unit]);
  for (const units of bySubject.values()) rankAmong(units);

  return rankAmong(statements);
}

/**
 * Réglages Massar's preview: one example student of a level, on every subject of
 * that level with this year's parts and sample marks, so the order, averages and
 * rank show as they will print. Nothing here is a real mark.
 */
export function previewStatementSheets(setup: Pick<MassarSetup, 'levels' | 'subjects' | 'yearLabel'>, levelId: string): MassarSheetDetail[] {
  const level = setup.levels.find(item => item.id === levelId);
  if (!level) return [];
  const className = `${level.code}-1`;
  const maxMark = classCycle(className) === 'college' ? 20 : 10;
  const labels = { termLabel: 'الدورة الأولى', examLabel: 'الفرض الأول' };
  const student: MassarStudent = { id: 'example', studentCode: 'X000000000', name: 'اسم التلميذ(ة)', dateOfBirth: '', massarStudentId: null, position: 0 };
  // Between 55% and 95% of the maximum, to the quarter point, varied by subject and part.
  const sampleMark = (subjectIndex: number, partIndex: number) => Math.round(((subjectIndex * 7 + partIndex * 3) % 9 + 11) / 20 * maxMark * 4) / 4;

  return setup.subjects.filter(subject => subject.levelId === levelId).map((subject, i) => ({
    sheet: { id: subject.id, roundId: 'example', className, subjectName: subject.name, teacherName: null, status: 'not_started', missing: 0, total: 0, revision: 0, roundStatus: 'open', ...labels },
    round: { id: 'example', term: 1, exam: 1, status: 'open', ...labels },
    components: subject.components,
    maxMark,
    students: [student],
    marks: subject.components.map((component, j) => ({ studentId: student.id, componentCode: component.code, mark: sampleMark(i, j), absence: 'none' as const })),
    // Réglages knows a level by its code only, which the class name already says.
    canEdit: false, canReopen: false, schoolName: '', levelLabel: '', yearLabel: setup.yearLabel,
  }));
}

// ─── Page layout ────────────────────────────────────────────────────────────

// A4 portrait with a 10mm margin. The table gets what the header, the student's line and the
// signatures leave (less the result line when there is one): its rows share that height, never
// shorter than a hand-written mark needs nor taller than a short statement looks right with. A longer
// one goes on to a second page, its header repeated and no subject cut in two.
const TABLE_HEIGHT = 210, RESULT_HEIGHT = 18, ROW_MIN = 6, ROW_MAX = 12;
export const statementRowHeight = (parts: number, reserved = 0) =>
  Math.max(ROW_MIN, Math.min(ROW_MAX, Math.floor((TABLE_HEIGHT - reserved) / (Math.max(1, parts) + 1) * 10) / 10));

const fixed = (value: number | null) => value === null ? '—' : value.toFixed(2);

/** Remarks lines lean a little, each its own way, as hand-written lines do. */
const TILTS = [-2, 1, -1, 2];

type Settings = ReturnType<typeof withStatementDefaults>;
/** Which columns one statement's table has, and each one's share of the width, in the order they read. */
type Layout = {
  singlePart: boolean; showAverage: boolean; showRank: boolean; showCoefficient: boolean;
  /** The general average or the rank adds the result line, and shows the coefficients they weigh with. */
  result: boolean;
  columns: Array<[string, number]>;
  /** How many students the most-ranked subject ranks: said once in the header. */
  rankedMost: number;
};

function statementLayout(statement: StudentStatement, settings: Settings): Layout {
  // Collège sheets have one part per subject, named after the exam (الفرض الأول): a parts column would
  // only repeat it on every row, and a subject's average would repeat its mark. Such a statement is
  // the subject, its mark and the remarks. The subject rank stays there: a place in the class is no repeat of the mark.
  const singlePart = statement.units.every(unit => unit.parts.length <= 1);
  const showAverage = settings.subjectAverage && !singlePart;
  const showRank = settings.subjectRank;
  const showCoefficient = settings.coefficientColumn;
  const column = (name: string, weight: number, shown = true): Array<[string, number]> => shown ? [[name, weight]] : [];
  // The remarks take what is left.
  const columns = [
    ...column('unit', singlePart ? 36 : 24),
    ...column('coefficient', singlePart ? 12 : 9, showCoefficient),
    ...column('part', 32, !singlePart),
    ...column('mark', singlePart ? 16 : 12),
    ...column('average', 12, showAverage),
    ...column('rank', singlePart ? 14 : 11, showRank),
    ...column('note', singlePart ? 34 : 24),
  ];
  return {
    singlePart, showAverage, showRank, showCoefficient, columns,
    result: settings.generalAverage || settings.rank,
    rankedMost: Math.max(0, ...statement.units.map(unit => unit.ranked)),
  };
}

/** One subject's rows: a `<tbody>`, so a page break never cuts a subject in two. */
function renderUnit(unit: StatementUnit, index: number, statement: StudentStatement, layout: Layout, settings: Settings, written: Set<string>) {
  const { singlePart, showAverage, showRank, showCoefficient, result, rankedMost } = layout;
  const parts = unit.parts.length ? unit.parts : [{ name: '', mark: '' }];
  const span = singlePart ? '' : ` rowspan="${parts.length}"`;

  // Written by hand from the subject's average (its mark when it has one part): in the subject's language,
  // with that subject's teacher's pen, each line at its own slight slant.
  const remark = settings.remarks ? studentRemark(unit.average, statement.maxMark, unit.subject, statement.student.id, written, statement.className) : '';
  const pen = remarkPen(unit.subject, statement.className);
  const latin = remarkLanguage(unit.subject, statement.className) !== 'ar';
  const style = `--tilt:${TILTS[index % TILTS.length]}deg;--ink:${pen.ink}${latin ? `;font-family:${pen.latin},cursive;font-size:${pen.size}pt` : ''}`;
  const note = remark ? `<span class="hand"${latin ? ' dir="ltr"' : ''} style="${style}">${e(remark)}</span>` : '';

  // The coefficient has its own column, or else one other than 1 is said under the subject, so the general average can be checked by hand.
  const coefficientNote = result && !showCoefficient && unit.coefficient !== 1 ? `<small>المعامل <bdi dir="ltr">${e(unit.coefficient)}</bdi></small>` : '';
  const subject = `${e(unit.subject)}${coefficientNote}`;
  const coefficient = showCoefficient ? `<td class="coefficient"${span} dir="ltr">${e(unit.coefficient)}</td>` : '';
  const average = showAverage ? `<td class="average"${span} dir="ltr">${unit.average === null ? '' : unit.average.toFixed(2)}</td>` : '';
  // Out of how many is said once, in the header; a subject fewer students have a mark in says its own.
  const rankOutOf = unit.ranked !== rankedMost ? `<small> / ${unit.ranked}</small>` : '';
  const rank = showRank ? `<td class="rank"${span} dir="ltr">${unit.rank === null ? '' : `${unit.rank}${rankOutOf}`}</td>` : '';

  if (singlePart) {
    return `<tbody><tr><td class="unit" dir="auto">${subject}</td>${coefficient}<td class="mark" dir="ltr">${e(parts[0].mark)}</td>${rank}<td class="note">${note}</td></tr></tbody>`;
  }
  const rows = parts.map((part, row) => {
    const head = row === 0 ? `<td class="unit"${span} dir="auto">${subject}</td>${coefficient}` : '';
    const tail = row === 0 ? `${average}${rank}<td class="note"${span}>${note}</td>` : '';
    return `<tr>${head}<td class="part" dir="auto">${e(part.name)}</td><td class="mark" dir="ltr">${e(part.mark)}</td>${tail}</tr>`;
  });
  return `<tbody>${rows.join('')}</tbody>`;
}

function renderTableHead(statement: StudentStatement, layout: Layout) {
  const { singlePart, showAverage, showRank, showCoefficient, rankedMost } = layout;
  return '<thead><tr>'
    + `<th>${singlePart ? 'المادة' : 'الوحدة الدراسية'}</th>`
    + (showCoefficient ? '<th>المعامل</th>' : '')
    + (singlePart ? '' : '<th>المكونات</th>')
    + `<th>النقطة<small dir="ltr">/${e(statement.maxMark)}</small></th>`
    + (showAverage ? '<th>معدل الوحدة</th>' : '')
    + (showRank ? `<th>الرتبة${rankedMost ? `<small dir="ltr">/${rankedMost}</small>` : ''}</th>` : '')
    + '<th>ملاحظات</th>'
    + '</tr></thead>';
}

/** The general average and the rank: one line under the table, as a class council reads them. */
function renderResult(statement: StudentStatement, settings: Settings) {
  const average = settings.generalAverage
    ? `<div><dt>المعدل العام</dt><dd><bdi dir="ltr">${fixed(statement.average)}<small> / ${e(statement.maxMark)}</small></bdi></dd></div>` : '';
  const rank = settings.rank
    ? `<div><dt>الرتبة في القسم</dt><dd><bdi dir="ltr">${statement.rank ?? '—'}<small> / ${statement.ranked}</small></bdi></dd></div>` : '';
  return `<dl class="result">${average}${rank}</dl>`;
}

function renderPage(statement: StudentStatement, settings: Settings, images: { logo: string; ministry: string }) {
  const [accent, pale] = massarClassColors(statement.className);
  const layout = statementLayout(statement, settings);
  const share = layout.columns.reduce((sum, [, weight]) => sum + weight, 0);
  const rows = statement.units.reduce((sum, unit) => sum + Math.max(1, unit.parts.length), 0);
  const written = new Set<string>();
  const units = statement.units.map((unit, index) => renderUnit(unit, index, statement, layout, settings, written)).join('');
  const year = e(statement.yearLabel.replace('-', '/'));
  const outcome = layout.result ? renderResult(statement, settings) : '';
  const { logo, ministry } = images;

  return `<section class="sheet" dir="rtl" style="--accent:${accent};--pale:${pale};--row:${statementRowHeight(rows, layout.result ? RESULT_HEIGHT : 0)}mm">
      <header class="head">
        <div class="ministry"><img src="${e(ministry)}" alt="وزارة التربية الوطنية والتعليم الأولي والرياضة"></div>
        <div class="title"><h1>بيان نقط المراقبة : ${e(statement.examLabel)} - ${e(statement.termLabel)}</h1><p>الموسم الدراسي <bdi dir="ltr">${year}</bdi></p></div>
        ${logo ? `<img src="${e(logo)}" alt="">` : '<span></span>'}
      </header>
      <dl class="who">
        <div class="name"><dt>إسم التلميذ(ة)</dt><dd dir="auto">${e(statement.student.name)}</dd></div>
        <div><dt>رقم التلميذ</dt><dd dir="ltr">${e(statement.student.studentCode)}</dd></div>
        <div><dt>القسم</dt><dd><bdi dir="ltr">${e(statement.className)}</bdi>${statement.levelLabel ? ` · ${e(statement.levelLabel)}` : ''}</dd></div>
      </dl>
      <table>
        <colgroup>${layout.columns.map(([, weight]) => `<col style="width:${Math.round(weight / share * 1000) / 10}%">`).join('')}</colgroup>
        ${renderTableHead(statement, layout)}
        ${units}
      </table>
      ${outcome}
      <footer>
        <div class="signs"><span>إمضاء ولي الأمر<i></i></span><span>إمضاء الإدارة<i></i></span></div>
        <span class="latin" dir="auto">${e(statement.schoolName)} · <bdi>${e(statement.className)}</bdi> · <bdi dir="ltr">${e(statement.student.studentCode)}</bdi> · <bdi>${e(statement.yearLabel)}</bdi></span>
      </footer>
    </section>`;
}

const STATEMENT_STYLES = `
    *{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}html{color-scheme:light}
    body{margin:0;padding:16px;background:#e9edf2;color:#1f2a3a;font:11pt/1.3 MassarLatin,MassarArabic,Calibri,Arial,sans-serif}
    .sheet{display:flex;flex-direction:column;width:210mm;max-width:100%;min-height:297mm;margin:0 auto 16px;padding:10mm;background:#fff;box-shadow:0 2px 9px #0001}
    /* Right to left: the school, the title in the middle, the logo at the far end. */
    .head{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);align-items:center;gap:4mm;margin-bottom:4mm}
    .head > img{justify-self:end;width:22mm;height:22mm;object-fit:contain}.school{font:700 10pt MassarArabic,MassarLatin,serif;color:#15519B;overflow-wrap:anywhere}
    .ministry{display:flex;flex-direction:column;align-items:center;justify-self:start;gap:1mm;max-width:36mm;text-align:center}.ministry img{width:30mm;height:auto;object-fit:contain}
    .title{text-align:center}.title h1{margin:0;font:700 15pt/1.35 MassarArabic,serif;color:#1f2a3a}.title p{margin:1mm 0 0;font:11pt MassarArabic,serif;color:#3b475a}
    .who{display:grid;grid-template-columns:minmax(0,1.6fr) auto minmax(0,1.6fr);margin:0 0 4mm;border:0.5pt solid #cfd8e3;border-radius:1.5mm;overflow:hidden}
    .who div{display:flex;align-items:baseline;gap:2mm;min-width:0;padding:2mm 3mm;border-left:0.5pt solid #e3e8ef;background:#fbfcfe}.who div:last-child{border-left:0}
    .who dt,.result dt{flex-shrink:0;font:9pt MassarArabic,serif;color:#6b778c}.who dt::after,.result dt::after{content:' :'}.who dd{margin:0;min-width:0;font:700 11pt MassarArabic,MassarLatin,serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .who .name{background:var(--pale)}.who .name dd{color:var(--accent);font-size:13pt}
    table{width:100%;border-collapse:collapse;table-layout:fixed}thead{display:table-header-group}tbody{break-inside:avoid}
    th,td{border:0.6pt solid #6b778c;text-align:center;vertical-align:middle;overflow-wrap:anywhere}
    th{background:var(--pale);padding:2mm 1mm;font:700 11pt/1.2 MassarArabic,serif;border-top:1.4pt solid var(--accent)}th small{margin-right:1mm;font:400 8.5pt MassarLatin,sans-serif;color:#5d6a80}
    td{height:var(--row);padding:0 2mm}td.unit{font:700 11pt MassarArabic,MassarLatin,serif;color:var(--accent);background:#fbfcfe}td.unit small{display:block;margin-top:.5mm;font:400 8.5pt MassarArabic,serif;color:#6b778c}
    td.part{font:10.5pt MassarArabic,MassarLatin,serif}td.mark{font-weight:700;font-size:11.5pt}td.average{font-weight:700;font-size:12pt;color:var(--accent);background:#fbfcfe}
    td.coefficient{font:700 11pt MassarLatin,sans-serif;color:#3b475a;background:#fbfcfe}
    td.rank{font:700 11.5pt MassarLatin,sans-serif;color:#1f2a3a}td.rank small{font-weight:400;font-size:9pt;color:#6b778c}
    /* A remark as a teacher writes it: Ruqaa, in blue ink, not quite level. */
    /* Ruqaa's strokes are thick: smaller than the Latin pens, never thickened, so both read as the same pen weight. */
    td.note .hand{display:inline-block;max-width:100%;font:400 13pt/1.1 MassarHand,MassarArabic,serif;font-synthesis:none;color:var(--ink,#1e3a8a);transform:rotate(var(--tilt,-1deg))}
    /* The general average and the rank: one line under the table, as a class council reads them. */
    .result{display:flex;justify-content:flex-start;gap:4mm;margin:4mm 0 0}.result div{display:flex;align-items:baseline;gap:2mm;padding:2mm 4mm;border:0.8pt solid var(--accent);border-radius:1.5mm;background:var(--pale)}
    .result dd{margin:0;font:700 14pt MassarLatin,sans-serif;color:var(--accent)}.result small{font-weight:400;font-size:9.5pt;color:#5d6a80}
    footer{display:flex;flex-direction:column;gap:3mm;margin-top:auto;padding-top:6mm;font:10.5pt MassarArabic,serif;color:#3b475a}
    .signs{display:flex;justify-content:space-between;gap:10mm}.signs i{display:inline-block;width:45mm;border-bottom:0.6pt dotted #6b778c;margin-right:2mm}
    footer .latin{font:8pt MassarLatin,sans-serif;color:#8090a5}
    @page{size:A4 portrait;margin:0}
    @media print{body{background:#fff;padding:0}.sheet{width:auto;max-width:none;min-height:296mm;margin:0;box-shadow:none;break-after:page}.sheet:last-child{break-after:auto}}
  `;

/**
 * بيان نقط المراقبة: one page per student. Right to left: the subject (الوحدة الدراسية),
 * each of its parts with the mark, the subject's average when the school asks for it, and
 * a remarks cell per subject left for the teacher's hand. The general average and the rank
 * in the class follow the table when the school asks for them.
 */
export function buildStudentStatementDocument(sheets: MassarSheetDetail[], options: StudentStatementOptions) {
  const origin = typeof window === 'undefined' ? 'http://localhost' : window.location.origin;
  const settings = withStatementDefaults(options.settings);
  const images = {
    logo: safeUrl(options.logo, origin),
    // The ministry's emblem heads every statement on the right, as on the ministry's own papers.
    ministry: safeUrl('/images/massar/ministry.png', origin),
  };
  const pages = studentStatements(sheets, settings)
    .filter(statement => !options.studentIds || options.studentIds.includes(statement.student.id))
    .map(statement => renderPage(statement, settings, images))
    .join('');
  return `<!doctype html><html lang="${e(options.language)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(options.title)}</title><style>
    ${massarFontFaces(origin)}${STATEMENT_STYLES}</style></head><body>${pages}</body></html>`;
}
