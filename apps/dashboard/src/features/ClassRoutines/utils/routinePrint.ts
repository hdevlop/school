import type { RoutineDay, RoutineDuty, RoutineEntry, RoutinePeriod } from '../types';
import { printedInk } from './subjectColors';

export interface RoutineDocumentOptions {
  language: string;
  title: string;
  /** "Class" and the class with its section, as the sheet's corner names them. */
  classLabel: string;
  className: string;
  dayHeader: string;
  orLabel: string;
  dayLabel: (day: RoutineDay) => string;
  periodLabel: (period: RoutinePeriod) => string;
  /** The grid's color for a subject, so paper and screen agree. */
  colorOf: (subjectId: string) => string;
}

interface RoutineDocumentData {
  days: readonly RoutineDay[];
  periods: readonly RoutinePeriod[];
  entries: readonly RoutineEntry[];
  duties?: readonly RoutineDuty[];
}

export interface RoutineDocumentPage {
  data: RoutineDocumentData;
  options: RoutineDocumentOptions;
}

// The sheet's navy, rules and striped breaks, at the grid's own values.
const NAVY = '#2c4a7a';
const RULE = '#8b97ab';
// A4 landscape less the body's side padding; the day column is a narrow strip
// with its names set upright, so the lessons take the rest.
const TABLE_WIDTH_MM = 279;
const DAY_COLUMN_MM = 11;

const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g,
  (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);

function buildRoutinePage({ days, periods, entries, duties = [] }: RoutineDocumentData, options: RoutineDocumentOptions): string {
  const e = escapeHtml;
  const entryMap = new Map(entries.map((entry) => [`${entry.dayOfWeek}:${entry.periodId}`, entry]));
  const dutyMap = new Map(duties.map((duty) => [`${duty.dayOfWeek}:${duty.periodId}`, duty]));
  // As on screen, a break that holds a lesson on some day is as wide as a lesson.
  const narrow = (period: RoutinePeriod) => period.isBreak && !entries.some((entry) => entry.periodId === period.id);
  const weights = periods.map((period) => narrow(period) ? 2 : 3);
  const total = weights.reduce((sum, weight) => sum + weight, 0) || 1;
  // The rows share what the page leaves below the header.
  const rowHeight = Math.min(32, Math.floor(160 / Math.max(days.length, 1)));
  // French sets a space before its colon.
  const colon = options.language === 'fr' ? ' :' : ':';

  const lesson = (entry: RoutineEntry) => {
    const { fill, ink } = printedInk(options.colorOf(entry.subjectId));
    const groups = entry.contentGroups ?? [];
    const content = groups.length
      ? `<div class="groups">${groups.map((group) => group.kind === 'fixed'
        ? `<span class="group"><bdi>${e(group.label)}</bdi></span>`
        : `<span class="group pair" aria-label="${e(`${group.options[0]} ${options.orLabel} ${group.options[1]}`)}"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><line x1="0" y1="0" x2="100" y2="100" stroke="currentColor" stroke-width="0.8" vector-effect="non-scaling-stroke"/></svg><span class="first" dir="auto">${e(group.options[0])}</span><span class="second" dir="auto">${e(group.options[1])}</span></span>`).join('')}</div>`
      : `<span class="subject"><bdi>${e(entry.subjectName)}</bdi></span>`;
    const footer = entry.teacherName || entry.roomNumber
      ? `<span class="meta"><bdi>${e(entry.teacherName ?? '')}</bdi><bdi>${e(entry.roomNumber ?? '')}</bdi></span>`
      : '';
    return `<td class="lesson" style="background:${fill};color:${ink}"><div class="cell">${content}${footer}</div></td>`;
  };

  const body = days.map((day) => `<tr><th scope="row" class="day"><span>${e(options.dayLabel(day))}</span></th>${periods.map((period) => {
    const entry = entryMap.get(`${day}:${period.id}`);
    if (entry) return lesson(entry);
    if (period.isBreak) {
      const duty = dutyMap.get(`${day}:${period.id}`);
      return `<td class="break">${duty ? `<span class="duty"><bdi>${e(duty.staffName)}</bdi></span>` : e(options.periodLabel(period))}</td>`;
    }
    return '<td class="empty"></td>';
  }).join('')}</tr>`).join('');

  return `<section class="routine-page" style="--row-height:${rowHeight}mm">
  <header class="top"><h1>${e(options.title)}</h1><p>${e(options.classLabel)}${colon} <bdi class="chip">${e(options.className)}</bdi></p></header>
  <div class="sheet"><table><colgroup><col style="width:${DAY_COLUMN_MM}mm">${weights.map((weight) => `<col style="width:${((TABLE_WIDTH_MM - DAY_COLUMN_MM) * weight / total).toFixed(2)}mm">`).join('')}</colgroup>
  <thead><tr><th scope="col">${e(options.dayHeader)}</th>${periods.map((period) => `<th scope="col"><span dir="ltr">${e(period.startTime.slice(0, 5))} – ${e(period.endTime.slice(0, 5))}</span></th>`).join('')}</tr></thead>
  <tbody>${body}</tbody></table></div>
  </section>`;
}

/** The week as one A4 landscape sheet: days down, periods across. */
export function buildRoutineDocument(data: RoutineDocumentData, options: RoutineDocumentOptions): string {
  return buildRoutineDocuments([{ data, options }]);
}

/** One section per landscape page, sent to the printer in a single document. */
export function buildRoutineDocuments(pages: readonly RoutineDocumentPage[]): string {
  if (!pages.length) throw new Error('No timetables to print');
  const { options } = pages[0];
  const e = escapeHtml;
  const dir = options.language === 'ar' ? 'rtl' : 'ltr';
  const title = pages.length === 1 ? `${options.title} · ${options.className}` : options.title;
  return `<!doctype html><html lang="${e(options.language)}" dir="${dir}"><head><meta charset="utf-8"><title>${e(title)}</title><style>
    *{box-sizing:border-box}html{color-scheme:light}
    body{margin:0;color:#1f2937;font:9pt/1.3 "Segoe UI",system-ui,-apple-system,Roboto,Tahoma,Arial,sans-serif}
    .routine-page{padding:8mm 9mm;break-after:page;page-break-after:always}
    .routine-page:last-child{break-after:auto;page-break-after:auto}
    .top{display:flex;justify-content:space-between;align-items:flex-end;gap:6mm;padding-bottom:2mm;margin-bottom:4mm;border-bottom:1.2pt solid ${NAVY}}
    .top h1{margin:0;font-size:18pt;line-height:1.1;font-weight:800;color:${NAVY}}
    .top p{margin:0;display:flex;align-items:center;gap:2mm;font-size:11pt;color:#1f2937}
    .chip{border-radius:1.5mm;padding:0.4mm 3mm;background:${NAVY};color:#fff;font-weight:800;font-size:11pt}
    .sheet{border:1px solid ${RULE};border-radius:2mm;overflow:hidden}
    /* Collapsed borders are painted after every cell's fill, so a scaled print
       preview cannot let a neighbouring lesson cover a line; the hidden table
       edge leaves the outline to the rounded frame. */
    table{width:100%;table-layout:fixed;border-collapse:collapse;border-style:hidden}
    th,td{border:1px solid ${RULE};padding:0;text-align:center;vertical-align:middle}
    thead th{background:${NAVY};color:#fff;font-size:9.5pt;font-weight:700;padding:2mm 1mm;border-color:rgba(255,255,255,.3) rgba(255,255,255,.3) ${RULE};white-space:nowrap}
    thead th:first-child{padding-inline:0.5mm;font-size:7.5pt}
    .day{background:#eef2f8;color:${NAVY};font-size:9.5pt;font-weight:700;padding:0}
    .day span{display:inline-block;writing-mode:vertical-rl;transform:rotate(180deg);white-space:nowrap;letter-spacing:.02em}
    tbody td,tbody th{height:var(--row-height)}
    .empty{background:#fafafa}
    .break{background:repeating-linear-gradient(45deg,#f4f5f7 0 6px,#eceef2 6px 12px);color:#6b7385;font-size:7.5pt;font-weight:700;text-transform:uppercase;letter-spacing:.03em;padding:1mm}
    .duty{display:inline-block;border:0.75pt dashed ${NAVY};border-radius:999px;padding:0.3mm 2mm;color:${NAVY};text-transform:none;letter-spacing:0}
    .cell{display:flex;flex-direction:column;min-height:var(--row-height)}
    .subject{flex:1;display:flex;align-items:center;justify-content:center;padding:1mm 1.5mm;font-size:10.5pt;font-weight:700;line-height:1.15}
    .groups{flex:1;display:flex;align-items:stretch}
    .group{flex:1;min-width:0;display:flex;align-items:center;justify-content:center;padding:1mm;font-size:8.5pt;font-weight:700;line-height:1.15;overflow-wrap:break-word;hyphens:auto}
    .group+.group{border-inline-start:0.75pt dashed currentColor}
    .pair{flex:1.3;position:relative;display:block}
    .pair svg{position:absolute;inset:0;width:100%;height:100%;opacity:.45}
    .pair span{position:absolute;inset-inline:1mm;max-height:45%;overflow:hidden;font-size:8pt}
    .pair .first{top:0.8mm;text-align:right}.pair .second{bottom:0.8mm;text-align:left}
    .meta{display:flex;justify-content:space-between;gap:1mm;padding:0.4mm 1.2mm;border-top:0.5pt dashed currentColor;font-size:7pt;font-weight:600;opacity:.8}
    @page{size:A4 landscape;margin:0}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  </style></head><body>
  ${pages.map(({ data, options: pageOptions }) => buildRoutinePage(data, pageOptions)).join('')}
  </body></html>`;
}

/**
 * Prints from a hidden frame, as the attendance register does, so no window
 * opens. The sheet sets its own margins, so it keeps them when the print
 * dialog's Margins is None.
 */
export async function printRoutineDocument(html: string) {
  const frame = document.createElement('iframe');
  frame.title = 'Print timetable';
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = 'position:fixed;width:0;height:0;border:0';
  document.body.append(frame);
  const doc = frame.contentDocument;
  const view = frame.contentWindow;
  if (!doc || !view) { frame.remove(); return; }
  doc.open();
  doc.write(html);
  doc.close();
  await doc.fonts?.ready;
  const cleanup = () => { clearTimeout(timeout); frame.remove(); };
  const timeout = setTimeout(cleanup, 60_000);
  view.addEventListener('afterprint', cleanup, { once: true });
  try { view.focus(); view.print(); } catch (error) { cleanup(); throw error; }
}
