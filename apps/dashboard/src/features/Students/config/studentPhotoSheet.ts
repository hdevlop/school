import type { Table } from '@tanstack/react-table';
import {
  escapePrintHtml, safePrintImageUrl, schoolPrintAccentCss, schoolPrintLetterhead,
  SCHOOL_PRINT_LETTERHEAD_CSS, type SchoolPrintDocumentOptions,
} from '@/shared/schoolPrintDocument';
import { isStudentDisabled } from './studentActivity';

export interface StudentPhotoSheetStudent {
  name: string;
  arabicName?: string | null;
  image?: string | null;
}

/** One class section's students, printed together on their own sheet. */
export interface StudentPhotoSheetGroup {
  className: string;
  sectionName: string;
  students: StudentPhotoSheetStudent[];
}

export type StudentPhotoSheetOptions = Omit<SchoolPrintDocumentOptions, 'columns' | 'columnWeights' | 'wrapHeadings' | 'orientation'> & {
  labels: { class: string; section: string };
};

/** The bundled gender pictures and the placeholder are not the student's face. */
const DEFAULT_PICTURE = /(^|\/)(images\/[^/?#]+|noavatar\.png)(?:$|[?#])/i;

export const hasStudentPhoto = (image: string | null | undefined) => {
  const value = image?.trim();
  return !!value && !DEFAULT_PICTURE.test(value);
};

/**
 * Active students of every filtered page, in the table's order, grouped by
 * class and section in the order each group first appears.
 */
export function studentPhotoSheetGroups(table: Table<any>): StudentPhotoSheetGroup[] {
  const groups = new Map<string, StudentPhotoSheetGroup>();
  for (const { original: student } of table.getPrePaginationRowModel().rows) {
    if (isStudentDisabled(student)) continue;
    const className = student.class?.name ?? '';
    const sectionName = student.section?.name ?? '';
    const key = `${className}\u0000${sectionName}`;
    const group = groups.get(key) ?? { className, sectionName, students: [] };
    group.students.push({ name: student.name ?? '', arabicName: student.arabicName, image: student.image });
    groups.set(key, group);
  }
  return [...groups.values()];
}

/** Always six photos across. */
const COLUMNS = 6;
/** Rows share the page as if there were at least five, so a small class keeps sensible photos. */
const MIN_ROWS = 5;
/** Past six rows the captions shrink to leave the photos room. */
const COMPACT_FROM_ROWS = 7;
/** Ten rows (sixty students) is the most one A4 page holds legibly; a larger class flows onto more pages. */
const MAX_FILL_ROWS = 10;

/** Rows for one class: they share the page height below the letterhead, so the class stays on one page. */
export function studentPhotoSheetLayout(count: number) {
  const rows = Math.max(MIN_ROWS, Math.ceil(count / COLUMNS));
  return { rows, compact: rows >= COMPACT_FROM_ROWS, fill: rows <= MAX_FILL_ROWS };
}

const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2)
  .map(part => Array.from(part)[0] ?? '').join('').toUpperCase() || '?';

function photoCard(student: StudentPhotoSheetStudent, index: number, origin: string) {
  const e = escapePrintHtml;
  const src = hasStudentPhoto(student.image) ? safePrintImageUrl(student.image, origin) : '';
  const arabicName = student.arabicName?.trim();
  const photo = src
    ? `<img src="${e(src)}" alt="">`
    : `<span class="initials" aria-hidden="true">${e(initials(student.name))}</span>`;
  return `<figure class="card"><div class="photo">${photo}<span class="number">${index + 1}</span></div><figcaption>`
    + `<span class="name"><bdi>${e(student.name)}</bdi></span>`
    + (arabicName && arabicName !== student.name.trim() ? `<span class="arabic" lang="ar" dir="rtl">${e(arabicName)}</span>` : '')
    + '</figcaption></figure>';
}

/**
 * A face-to-name sheet for parent-teacher meetings: each class section starts
 * its own A4 page with the school letterhead and a grid of photos and names.
 */
export function buildStudentPhotoSheet(groups: readonly StudentPhotoSheetGroup[], options: StudentPhotoSheetOptions): string {
  const e = escapePrintHtml;
  const dir = options.language === 'ar' ? 'rtl' : 'ltr';
  const sheets = groups.map(group => {
    const details = [
      ...options.details,
      ...(group.className ? [{ label: options.labels.class, value: group.className }] : []),
      ...(group.sectionName ? [{ label: options.labels.section, value: group.sectionName }] : []),
    ];
    const summary = `<span class="chip">${e(options.totalLabel)} <b>${group.students.length}</b></span>`;
    const { rows, compact, fill } = studentPhotoSheetLayout(group.students.length);
    return `<section class="sheet${fill ? ' fill' : ''}">${schoolPrintLetterhead({ ...options, details }, summary)}`
      + `<div class="grid${compact ? ' compact' : ''}" style="--rows:${rows}">${group.students.map((student, index) => photoCard(student, index, options.assetOrigin)).join('')}</div></section>`;
  }).join('');
  return `<!doctype html><html lang="${e(options.language)}" dir="${dir}"><head><meta charset="utf-8"><title>${e(options.title)}</title><style>
    ${schoolPrintAccentCss(options.accent)}
    ${SCHOOL_PRINT_LETTERHEAD_CSS}
    body{padding:0}
    .sheet{padding:9mm 10mm;break-after:page;-webkit-box-decoration-break:clone;box-decoration-break:clone}.sheet:last-child{break-after:auto}
    .grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:3mm 2.5mm}.grid.compact{row-gap:2mm}
    .compact figcaption{font-size:7.5pt;margin-top:0.8mm}.compact .initials{font-size:14pt}
    .card{margin:0;min-height:0;break-inside:avoid;display:flex;flex-direction:column;align-items:center;text-align:center}
    .photo{position:relative;width:100%;aspect-ratio:5/6;border-radius:2mm;overflow:hidden;background:#f1f5f9;border:0.5pt solid #e2e8f0}
    /* One page per class: the rows share the height below the letterhead, and each photo takes its row's height. */
    .fill{display:flex;flex-direction:column;height:296mm;overflow:hidden}
    .fill .grid{flex:1;min-height:0;grid-template-rows:repeat(var(--rows),minmax(0,1fr))}
    .fill .photo{flex:1;min-height:0;aspect-ratio:auto}
    .photo img{width:100%;height:100%;object-fit:cover;object-position:center 20%;display:block}
    .initials{display:flex;width:100%;height:100%;align-items:center;justify-content:center;font-size:18pt;font-weight:600;color:#94a3b8}
    .number{position:absolute;inset-block-start:1mm;inset-inline-start:1mm;min-width:4.5mm;padding:0 1mm;border-radius:999px;background:var(--accent);color:var(--accent-foreground);font-size:6.5pt;font-weight:600;line-height:4.5mm}
    /* Every caption is three lines tall, so the photos of a row line up whatever the names. */
    figcaption{display:flex;flex-direction:column;flex-shrink:0;width:100%;height:3.75em;margin-top:1.2mm;font-size:8.5pt;line-height:1.25}
    .name,.arabic{display:-webkit-box;-webkit-box-orient:vertical;overflow:hidden;overflow-wrap:anywhere}
    .name{-webkit-line-clamp:2;font-weight:600;color:#1f2937}
    .arabic{-webkit-line-clamp:1;color:#475569}
    @page{size:A4 portrait;margin:0}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  </style></head><body>${sheets}</body></html>`;
}
