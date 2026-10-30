import { compareClassNames } from '@sms/contracts';
import type { RosterMark } from './rosterMarks';

/** What the register's print menu offers, in menu order. */
export const ROSTER_PRINT_CHOICES = [
  { key: 'all', label: 'common.all', marks: ['present', 'absent', 'late', 'unmarked'] },
  { key: 'present', label: 'attendance.roster.present', marks: ['present'] },
  { key: 'absent', label: 'attendance.roster.absent', marks: ['absent'] },
  { key: 'late', label: 'attendance.roster.late', marks: ['late'] },
  { key: 'absentAndLate', label: 'attendance.roster.absentAndLate', marks: ['absent', 'late'] },
] as const satisfies readonly { key: string; label: string; marks: readonly RosterMark[] }[];

export type RosterPrintChoice = (typeof ROSTER_PRINT_CHOICES)[number];

export interface RosterDocumentRow {
  cells: readonly string[];
  mark: RosterMark;
}

export interface RosterDocumentOptions {
  language: string;
  school: { name: string; logo?: string | null; contact: readonly string[] };
  title: string;
  /** The register's day, already formatted. */
  date: string;
  /** Class and section. */
  details: readonly { label: string; value: string }[];
  /** Headers of `cells`; the status column follows them. */
  columns: readonly string[];
  statusHeader: string;
  statusLabels: Record<RosterMark, string>;
  totalLabel: string;
  signature: string;
  assetOrigin: string;
  /** The app's primary color and the text on it, as the theme sets them. */
  accent: { color: string; foreground: string };
}

interface CyclePerson {
  name?: string | null;
  class?: { name?: string | null } | null;
  section?: { name?: string | null } | null;
}

/** The school's cycle order (PS before CP before 1AC), then section, then name. */
export function orderByCycle<T extends CyclePerson>(people: readonly T[]): T[] {
  const text = (value?: string | null) => value ?? '';
  return [...people].sort((a, b) => compareClassNames(text(a.class?.name), text(b.class?.name))
    || text(a.section?.name).localeCompare(text(b.section?.name), 'fr', { numeric: true })
    || text(a.name).localeCompare(text(b.name), 'fr'));
}

export function rowsForChoice(rows: readonly RosterDocumentRow[], choice: RosterPrintChoice) {
  const marks: readonly RosterMark[] = choice.marks;
  return rows.filter((row) => marks.includes(row.mark));
}

// Phone numbers and codes read left to right in every language, so a leading
// "+" stays in front of the number on an Arabic sheet.
const NUMERIC = /^[\d\s+()./-]+$/;

const MARK_ORDER: readonly RosterMark[] = ['present', 'absent', 'late', 'unmarked'];

const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g,
  (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);

/** Theme colors go into the sheet's CSS, so only a plain color value is kept. */
function safeColor(value: string, fallback: string) {
  const color = value.trim();
  return /^(#[0-9a-f]{3,8}|(rgba?|hsla?|oklch|oklab|lab|lch)\([\d\s.,%/+-]*\))$/i.test(color) ? color : fallback;
}

/** Branding URLs are data, never markup or active URI schemes. */
function safeImageUrl(value: string | null | undefined, origin: string) {
  if (!value) return '';
  try {
    const url = new URL(value, origin);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : '';
  } catch { return ''; }
}

/** The register as a printable sheet: the marks on screen, unsaved ones included. */
export function buildRosterDocument(rows: readonly RosterDocumentRow[], options: RosterDocumentOptions): string {
  const e = escapeHtml;
  const dir = options.language === 'ar' ? 'rtl' : 'ltr';
  const logo = safeImageUrl(options.school.logo, options.assetOrigin);
  const accent = safeColor(options.accent.color, '#d64e57');
  const accentForeground = safeColor(options.accent.foreground, '#ffffff');
  const counts = MARK_ORDER
    .map((mark) => [mark, rows.filter((row) => row.mark === mark).length] as const)
    .filter(([, count]) => count > 0);
  const chips = [
    `<span class="chip">${e(options.totalLabel)} <b>${rows.length}</b></span>`,
    ...counts.map(([mark, count]) => `<span class="chip mark-${mark}">${e(options.statusLabels[mark])} <b>${count}</b></span>`),
  ].join('');
  const body = rows.map((row, index) => `<tr><td class="index">${index + 1}</td>${row.cells.map((cell) => `<td><bdi${NUMERIC.test(cell) ? ' dir="ltr"' : ''}>${e(cell)}</bdi></td>`).join('')}<td><span class="badge mark-${row.mark}">${e(options.statusLabels[row.mark])}</span></td></tr>`).join('');
  return `<!doctype html><html lang="${e(options.language)}" dir="${dir}"><head><meta charset="utf-8"><title>${e(options.title)}</title><style>
    :root{--accent:${accent};--accent-foreground:${accentForeground}}
    *{box-sizing:border-box}html{color-scheme:light}
    body{margin:0;padding:9mm 10mm;color:#1f2937;font:9.5pt/1.4 "Segoe UI",system-ui,-apple-system,Roboto,Tahoma,Arial,sans-serif;-webkit-box-decoration-break:clone;box-decoration-break:clone}
    .top{display:flex;justify-content:space-between;align-items:center;gap:6mm;padding-bottom:3mm;border-bottom:1.2pt solid var(--accent)}
    .brand{display:flex;align-items:center;gap:3.5mm;min-width:0}.brand img{width:16mm;height:16mm;object-fit:contain;flex-shrink:0}
    .brand h1{margin:0;font-size:13pt;line-height:1.2;color:#334155}.brand p{margin:0.8mm 0 0;font-size:8pt;color:#64748b}
    .heading{flex-shrink:0;text-align:end}.heading h2{margin:0;font-size:14pt;line-height:1.2;color:#334155}.heading p{margin:0.8mm 0 0;font-weight:600;color:#64748b}
    .meta{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:2mm 6mm;margin:3mm 0;padding:2mm 3mm;background:#f1f5f9;border-radius:1.5mm}
    .meta dl{display:flex;flex-wrap:wrap;gap:1mm 6mm;margin:0}.meta dl div{display:flex;align-items:baseline;gap:1.5mm}
    .meta dt,.meta dd{margin:0;font-size:9pt;font-weight:600;color:#334155}.meta dt::after{content:":"}
    .summary{display:flex;flex-wrap:wrap;gap:1.5mm;margin:0}
    .chip{border-radius:999px;padding:0.5mm 2.6mm;font-size:8.5pt;background:#fff;color:#334155}
    .mark-present{background:#ecfdf5;color:#047857}.mark-absent{background:#fef2f2;color:#b91c1c}.mark-late{background:#fffbeb;color:#b45309}.mark-unmarked{background:#f3f4f6;color:#4b5563}
    table{width:100%;border-collapse:collapse}
    th{background:var(--accent);color:var(--accent-foreground);font-size:8pt;font-weight:600;text-align:start;padding:1.6mm 2.2mm}
    th:first-child{border-start-start-radius:1.5mm}th:last-child{border-start-end-radius:1.5mm}
    td{padding:1.3mm 2.2mm;border-bottom:0.5pt solid #e5e7eb;font-size:9pt;text-align:start}
    tbody tr:nth-child(even) td{background:#f8fafc}
    .index{width:8mm;text-align:center}td.index{color:#94a3b8}
    .badge{display:inline-block;border-radius:999px;padding:0.2mm 2.4mm;font-size:8pt;font-weight:600;white-space:nowrap}
    footer{display:flex;justify-content:flex-end;margin-top:12mm;break-inside:avoid}
    .signature{min-width:55mm;border-top:0.75pt solid #94a3b8;padding-top:1.2mm;text-align:center;font-size:8.5pt;color:#475569}
    @page{size:A4 portrait;margin:0}thead{display:table-header-group}tr{break-inside:avoid}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  </style></head><body>
  <header class="top"><div class="brand">${logo ? `<img src="${e(logo)}" alt="">` : ''}<div><h1><bdi>${e(options.school.name)}</bdi></h1>${options.school.contact.length ? `<p>${options.school.contact.map((item) => `<bdi>${e(item)}</bdi>`).join(' · ')}</p>` : ''}</div></div>
  <div class="heading"><h2>${e(options.title)}</h2><p><bdi>${e(options.date)}</bdi></p></div></header>
  <div class="meta"><dl>${options.details.map(({ label, value }) => `<div><dt>${e(label)}</dt><dd><bdi>${e(value)}</bdi></dd></div>`).join('')}</dl><p class="summary">${chips}</p></div>
  <table><thead><tr><th class="index">#</th>${options.columns.map((column) => `<th>${e(column)}</th>`).join('')}<th>${e(options.statusHeader)}</th></tr></thead><tbody>${body}</tbody></table>
  <footer><span class="signature">${e(options.signature)}</span></footer>
  </body></html>`;
}

/**
 * Prints from a hidden frame, as NTable's own print does, so no window opens.
 * The sheet sets its own margins (`@page` margin 0 plus body padding), so it
 * keeps them when the print dialog's Margins is set to None.
 */
export async function printRosterDocument(html: string) {
  const frame = document.createElement('iframe');
  frame.title = 'Print register';
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = 'position:fixed;width:0;height:0;border:0';
  document.body.append(frame);
  const doc = frame.contentDocument;
  const view = frame.contentWindow;
  if (!doc || !view) { frame.remove(); return; }
  doc.open();
  doc.write(html);
  doc.close();
  // The logo has to arrive before the dialog renders the page.
  await Promise.all([
    doc.fonts?.ready,
    ...Array.from(doc.images).map((image) => image.complete ? undefined : new Promise<void>((resolve) => {
      image.addEventListener('load', () => resolve(), { once: true });
      image.addEventListener('error', () => resolve(), { once: true });
    })),
  ]);
  const cleanup = () => { clearTimeout(timeout); frame.remove(); };
  const timeout = setTimeout(cleanup, 60_000);
  view.addEventListener('afterprint', cleanup, { once: true });
  try { view.focus(); view.print(); } catch (error) { cleanup(); throw error; }
}
