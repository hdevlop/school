import type { MassarSheetDetail } from '@sms/contracts';
import { CLASS_DOCUMENT_COLORS } from '@/features/Assessments/planning/planningModel';
import { componentLabel } from './componentLabels';

export type MassarPaperOptions = { language: string; logo?: string | null; title: string; student: string; teacher: string; term: string; exam: string };
export const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
const e = escapeHtml;

/** Branding URLs are data, never markup or active URI schemes; the print window needs them absolute. */
export function safeUrl(value: string | null | undefined, origin: string) {
  if (!value) return '';
  try { const url = new URL(value, origin); return ['https:', 'http:'].includes(url.protocol) ? url.href : ''; } catch { return ''; }
}

/** The printed papers' fonts, served with the planning documents: Carlito for Latin text, FreeSerif for Arabic. */
export function massarFontFaces(origin: string) {
  const fonts = e(safeUrl('/fonts/assessment-planning/', origin));
  return `@font-face{font-family:MassarLatin;src:url('${fonts}Carlito-Regular.ttf') format('truetype');font-weight:400;font-display:swap}
    @font-face{font-family:MassarLatin;src:url('${fonts}Carlito-Bold.ttf') format('truetype');font-weight:700;font-display:swap}
    @font-face{font-family:MassarArabic;src:url('${fonts}FreeSerif.ttf') format('truetype');font-weight:400;font-display:swap}
    @font-face{font-family:MassarArabic;src:url('${fonts}FreeSerifBold.ttf') format('truetype');font-weight:700;font-display:swap}
    @font-face{font-family:MassarHand;src:url('${fonts}ArefRuqaa-Regular.ttf') format('truetype');font-weight:400;font-display:block}`;
}

// A4 landscape with a 7mm margin all round, held by the page itself (a print dialog set to no margins keeps it): 283mm of width.
// the marks share what is left, never wider than 26mm nor narrower than 10mm.
// Widths in mm: a Massar code is about 17mm at 9.5pt and the longest names about 30mm in bold 10pt
// (a longer one ends with …); the rest of the page goes to the marks.
const PAGE_WIDTH = 283, IDENTITY = { number: 9, code: 22, name: 40 }, MARK_MAX = 26, MARK_MIN = 10;
const IDENTITY_WIDTH = IDENTITY.number + IDENTITY.code + IDENTITY.name;
// One page holds 27 students at the usual row height, 25 when long part names wrap in narrow columns.
// A bigger class gets the compact sheet, whose rows stay tall enough to write a mark in by hand. A class
// too big even for that keeps its usual rows on two pages, rather than a few names alone on the second.
const USUAL_STUDENTS = 25, COMPACT_STUDENTS = 38;
const isCompact = (students: number) => students > USUAL_STUDENTS && students <= COMPACT_STUDENTS;

/** A mark as printed: two decimals, مبرر for a justified absence, and nothing when none is entered (never 0). */
export const massarMarkText = (data: MassarSheetDetail, studentId: string, code: string) => {
  const found = data.marks.find(item => item.studentId === studentId && item.componentCode === code);
  return found?.absence === 'justified' ? 'مبرر' : found?.mark === null || found?.mark === undefined ? '' : Number(found.mark).toFixed(2);
};

/**
 * The printed sheet follows Massar's: right to left, N°, code and name, then
 * one column per part. The birth date is left out so the marks get the room;
 * the xlsx export to Massar keeps it. A header names the school, the Contrôle and
 * the class in its colour; the teacher signs at the bottom.
 */
export function buildMassarDocument(sheets: MassarSheetDetail[], options: MassarPaperOptions) {
  const origin = typeof window === 'undefined' ? 'http://localhost' : window.location.origin;
  const logo = safeUrl(options.logo, origin);
  const pages = sheets.map(data => {
    const level = Number(/^([1-6])AP/i.exec(data.sheet.className)?.[1] ?? 5), [accent, pale] = CLASS_DOCUMENT_COLORS[level - 1];
    const markWidth = Math.max(MARK_MIN, Math.min(MARK_MAX, Math.floor((PAGE_WIDTH - IDENTITY_WIDTH) / Math.max(1, data.components.length) * 10) / 10));
    const width = IDENTITY_WIDTH + markWidth * data.components.length;
    // What a teacher's paper needs, two rows of three; no title block, the page starts with what identifies the sheet.
    // Values are escaped here; the class reads left to right inside the Arabic line.
    const info: Array<[string, string]> = [['المؤسسة', e(data.schoolName)], ['السنة الدراسية', e(data.yearLabel.replace('-', '/'))], ['الدورة', `${e(data.round.termLabel)} · ${e(data.round.examLabel)}`],
      ['القسم', `<bdi dir="ltr">${e(data.sheet.className)}</bdi> · ${e(data.levelLabel)}`], ['المادة', e(data.sheet.subjectName)], ['الأستاذ(ة)', e(data.sheet.teacherName ?? '—')]];
    return `<section class="sheet${isCompact(data.students.length) ? ' compact' : ''}" dir="rtl" style="--accent:${accent};--pale:${pale}">
      <header class="head">
        <dl class="info">${info.map(([label, value]) => `<div${label === 'المادة' ? ' class="subject"' : ''}><dt>${label}</dt><dd>${value}</dd></div>`).join('')}</dl>
        ${logo ? `<img src="${e(logo)}" alt="">` : `<div class="school" dir="auto">${e(data.schoolName)}</div>`}
      </header>
      <div class="grid"><table style="width:${width}mm">
        <colgroup><col style="width:${IDENTITY.number}mm"><col style="width:${IDENTITY.code}mm"><col style="width:${IDENTITY.name}mm">${data.components.map(() => `<col style="width:${markWidth}mm">`).join('')}</colgroup>
        <thead><tr>
          <th>ر.ت<small dir="ltr">N°</small></th><th>رقم التلميذ<small>Code Massar</small></th><th>إسم التلميذ<small dir="auto">${e(options.student)}</small></th>
          ${data.components.map(component => `<th class="part" dir="auto">${e(componentLabel(component.name))}</th>`).join('')}
        </tr></thead>
        <tbody>${data.students.map(student => `<tr><td class="number">${student.position + 1}</td><td dir="ltr">${e(student.studentCode)}</td><td class="name" dir="auto">${e(student.name)}</td>${data.components.map(component => `<td class="mark" dir="ltr">${e(massarMarkText(data, student.id, component.code))}</td>`).join('')}</tr>`).join('')}</tbody>
      </table></div>
      <footer><span>توقيع الأستاذ(ة): <i></i></span><span class="latin" dir="auto">${e(data.schoolName)} · <bdi>${e(data.sheet.className)}</bdi> · ${e(data.sheet.subjectName)} · <bdi>${e(data.yearLabel)}</bdi></span></footer>
    </section>`;
  }).join('');
  return `<!doctype html><html lang="${e(options.language)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(options.title)}</title><style>
    ${massarFontFaces(origin)}
    *{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}html{color-scheme:light}
    body{margin:0;padding:16px;background:#e9edf2;color:#1f2a3a;font:10pt/1.3 MassarLatin,MassarArabic,Calibri,Arial,sans-serif}
    .sheet{display:flex;flex-direction:column;width:297mm;max-width:100%;min-height:210mm;margin:0 auto 16px;padding:7mm;background:#fff;box-shadow:0 2px 9px #0001}
    /* One header row, right to left: the sheet's details, then the logo at the far end. The table starts right under it. */
    .head{display:grid;grid-template-columns:minmax(0,1fr) 20mm;align-items:center;gap:4mm;margin-bottom:3mm}
    .head img{width:20mm;height:19mm;object-fit:contain}.school{font-weight:700;color:#15519B;font-size:9pt;overflow-wrap:anywhere}
    .info{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0;margin:0;border:0.5pt solid #cfd8e3;border-radius:1.5mm;overflow:hidden}
    .info div{display:flex;align-items:baseline;gap:2mm;min-width:0;padding:1.4mm 2.5mm;border-bottom:0.5pt solid #e3e8ef;border-left:0.5pt solid #e3e8ef;background:#fbfcfe}
    .info dt{flex-shrink:0;font:8pt MassarArabic,serif;color:#6b778c}.info dt::after{content:' :'}.info dd{margin:0;min-width:0;font:700 9.5pt MassarArabic,MassarLatin,serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .info div:nth-child(3n){border-left:0}.info div:nth-last-child(-n+3){border-bottom:0}.info .subject{background:var(--pale)}.info .subject dd{color:var(--accent);font-size:10.5pt}
    table{border-collapse:collapse;table-layout:fixed;font-size:9.5pt}thead{display:table-header-group}tr{break-inside:avoid}
    th,td{border:0.5pt solid #9aa5b4;text-align:center;overflow-wrap:anywhere}
    th{background:var(--pale);padding:1.6mm 1mm;font:700 10pt/1.2 MassarArabic,serif;color:#1f2a3a;border-top:1.2pt solid var(--accent)}th small{display:block;margin-top:.6mm;font:400 7.5pt MassarLatin,sans-serif;color:#5d6a80}
    th.part{font-size:9pt}td{height:5.7mm;padding:0 1.2mm}td.name{text-align:right;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font:700 10pt MassarArabic,serif}
    td.number{color:#5d6a80}td.mark{font-weight:700}tbody tr:nth-child(even) td{background:#f7f9fc}
    footer{display:flex;justify-content:space-between;align-items:flex-end;gap:10mm;margin-top:auto;padding-top:4mm;font:10pt MassarArabic,serif;color:#3b475a}
    footer i{display:inline-block;width:60mm;border-bottom:0.6pt dotted #6b778c;margin-right:2mm}footer .latin{font:8pt MassarLatin,sans-serif;color:#8090a5}
    /* A big class: a tighter header, and rows that start small and share whatever height the page has left. */
    .compact{height:210mm}.compact .head{margin-bottom:2mm}.compact .head img{height:15mm}.compact .grid{flex:1 1 auto}.compact table{height:100%;font-size:9pt}
    .compact th{padding:.9mm 1mm}.compact td{height:4.2mm;line-height:1.1}.compact td.name{font-size:9.5pt;line-height:1.1}.compact footer{padding-top:2mm}
    @page{size:A4 landscape;margin:0}
    @media print{body{background:#fff;padding:0}.sheet{width:auto;max-width:none;min-height:209mm;padding:7mm;margin:0;box-shadow:none;break-after:page}.sheet:last-child{break-after:auto}.compact{height:209mm}}
  </style></head><body>${pages}</body></html>`;
}
