export interface SchoolPrintDocumentOptions {
  language: string;
  school: { name: string; logo?: string | null; contact: readonly string[] };
  title: string;
  /** The register's day, already formatted. */
  date: string;
  /** Class and section. */
  details: readonly { label: string; value: string }[];
  /** Table headings after the row number. */
  columns: readonly string[];
  /** Relative data-column widths, normalized to the available page width. */
  columnWeights?: readonly number[];
  totalLabel: string;
  signature: string;
  assetOrigin: string;
  /** The app's primary color and the text on it, as the theme sets them. */
  accent: { color: string; foreground: string };
  orientation?: 'portrait' | 'landscape';
}

export const escapePrintHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g,
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


const NUMERIC = /^[\d\s+()./-]+$/;

/** Text-only cells with directional isolation for phone numbers and codes. */
export function schoolPrintCells(cells: readonly string[]) {
  return cells.map(cell => `<td><bdi${NUMERIC.test(cell) ? ' dir="ltr"' : ''}>${escapePrintHtml(cell)}</bdi></td>`).join('');
}

/** Shared letterhead, table and signature; body and summary are escaped markup from the caller's document builder. */
export function buildSchoolPrintDocument(options: SchoolPrintDocumentOptions, body: string, summary: string): string {
  const e = escapePrintHtml;
  const dir = options.language === 'ar' ? 'rtl' : 'ltr';
  const logo = safeImageUrl(options.school.logo, options.assetOrigin);
  const accent = safeColor(options.accent.color, '#d64e57');
  const accentForeground = safeColor(options.accent.foreground, '#ffffff');
  const hasColumnWidths = options.columnWeights?.length === options.columns.length;
  const weights = [8, ...(options.columnWeights ?? []).map(weight => Number.isFinite(weight) && weight > 0 ? weight : 25)];
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  const colgroup = hasColumnWidths ? `<colgroup>${weights.map(weight =>
    `<col style="width:${weight / totalWeight * 100}%">`).join('')}</colgroup>` : '';
  const footer = `<footer><span class="signature">${e(options.signature)}</span></footer>`;
  const lastRow = hasColumnWidths ? body.lastIndexOf('<tr>') : -1;
  // Keep the signature beside the final student rather than on an empty page.
  const tableBody = lastRow >= 0
    ? `<tbody>${body.slice(0, lastRow)}</tbody><tbody class="signature-group">${body.slice(lastRow)}<tr class="signature-row"><td colspan="${options.columns.length + 1}">${footer}</td></tr></tbody>`
    : `<tbody>${body}</tbody>`;
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
    table{width:100%;max-width:100%;border-collapse:collapse}
    th{background:var(--accent);color:var(--accent-foreground);font-size:8pt;font-weight:600;text-align:start;padding:1.6mm 2.2mm}
    th:first-child{border-start-start-radius:1.5mm}th:last-child{border-start-end-radius:1.5mm}
    td{padding:1.3mm 2.2mm;border-bottom:0.5pt solid #e5e7eb;font-size:9pt;text-align:start}
    tbody tr:nth-child(even) td{background:#f8fafc}
    .index{width:8mm;text-align:center}td.index{color:#94a3b8;white-space:nowrap;padding-inline:1mm}
    .badge{display:inline-block;border-radius:999px;padding:0.2mm 2.4mm;font-size:8pt;font-weight:600;white-space:nowrap}
    footer{display:flex;justify-content:flex-end;margin-top:12mm;break-inside:avoid}
    .signature{min-width:55mm;border-top:0.75pt solid #94a3b8;padding-top:1.2mm;text-align:center;font-size:8.5pt;color:#475569}
    .signature-group{break-inside:avoid}.signature-row td{padding:0;border:0;background:transparent!important}
    ${options.orientation === 'landscape' ? 'td{padding:1mm 2.2mm;font-size:8.5pt}footer{margin-top:8mm}' : ''}
    ${hasColumnWidths ? 'table{table-layout:fixed}th{white-space:nowrap}th,td{padding-inline:1.5mm}td{overflow-wrap:anywhere}td bdi[dir="ltr"]{white-space:nowrap}.index{width:auto}td.index{padding-inline:1mm}' : ''}
    @page{size:A4 ${options.orientation === 'landscape' ? 'landscape' : 'portrait'};margin:0}thead{display:table-header-group}tr{break-inside:avoid}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  </style></head><body>
  <header class="top"><div class="brand">${logo ? `<img src="${e(logo)}" alt="">` : ''}<div><h1><bdi>${e(options.school.name)}</bdi></h1>${options.school.contact.length ? `<p>${options.school.contact.map((item) => `<bdi>${e(item)}</bdi>`).join(' · ')}</p>` : ''}</div></div>
  <div class="heading"><h2>${e(options.title)}</h2><p><bdi>${e(options.date)}</bdi></p></div></header>
  <div class="meta"><dl>${options.details.map(({ label, value }) => `<div><dt>${e(label)}</dt><dd><bdi>${e(value)}</bdi></dd></div>`).join('')}</dl><p class="summary">${summary}</p></div>
  <table>${colgroup}<thead><tr><th class="index">#</th>${options.columns.map((column) => `<th>${e(column)}</th>`).join('')}</tr></thead>${tableBody}</table>
  ${lastRow < 0 ? footer : ''}
  </body></html>`;
}

/**
 * Prints from a hidden frame, as NTable's own print does, so no window opens.
 * The sheet sets its own margins (`@page` margin 0 plus body padding), so it
 * keeps them when the print dialog's Margins is set to None.
 */
export async function printSchoolDocument(html: string) {
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
