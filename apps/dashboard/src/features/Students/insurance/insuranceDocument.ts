import { compareClassNames, toAppClassName, toOfficialClassName } from '@sms/contracts';
import { ar } from '@sms/contracts/locales';
import { birthplaceLabel } from '@sms/contracts/birthplace';

/** One row of the year's student list, as `GET /students` returns it. */
export type InsuranceStudent = {
  id: string;
  studentCode?: string | null;
  name: string;
  arabicName?: string | null;
  dateOfBirth?: string | null;
  birthplace?: string | null;
  birthplaceArabic?: string | null;
  previousSchool?: string | null;
  enrollmentDate?: string | null;
  status?: string | null;
  class?: { id: string | null; name: string | null } | null;
  enrollment?: { enrolledOn?: string | null } | null;
};

export type InsuranceClass = { id: string; name: string; students: InsuranceStudent[] };

export type InsuranceDocumentOptions = {
  schoolName: string;
  schoolLogo?: string | null;
  schoolAddress?: string | null;
  schoolPhones: readonly string[];
  licenseNumber?: string | null;
  licenseDate?: string | null;
  cycles: readonly string[];
  academicYear: string;
  assetOrigin: string;
};

/** Twenty-five numbered lines fit one A4 landscape sheet; a longer class continues on the next sheet. */
export const INSURANCE_ROWS_PER_PAGE = 25;

const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g,
  char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);

/** Branding URLs are data, never markup or active URI schemes. */
function safeImageUrl(value: string | null | undefined, origin: string) {
  if (!value) return '';
  try {
    const url = new URL(value, origin);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : '';
  } catch { return ''; }
}

const displayName = (student: InsuranceStudent) => student.arabicName?.trim() || student.name;

/** Active enrollments only, one register per class, students in name order. */
export function insuranceClasses(students: readonly InsuranceStudent[]): InsuranceClass[] {
  const byClass = new Map<string, InsuranceClass>();
  for (const student of students) {
    const id = student.class?.id;
    if (!id || student.status !== 'active') continue;
    const entry = byClass.get(id) ?? { id, name: student.class?.name ?? '', students: [] };
    entry.students.push(student);
    byClass.set(id, entry);
  }
  return [...byClass.values()]
    .sort((a, b) => compareClassNames(a.name, b.name))
    .map(cls => ({ ...cls, students: cls.students.sort((a, b) => displayName(a).localeCompare(displayName(b), 'ar')) }));
}

/** The level as the ministry writes it; a custom class keeps its own name. */
export function arabicLevelName(name: string): string {
  const levels: Record<string, string> = ar.insurance.document.levelNames;
  const key = toAppClassName(name).toUpperCase();
  return Object.hasOwn(levels, key) ? levels[key] : toOfficialClassName(name);
}

/** "2025-2026" → the two-digit years over the levels columns: 24 and 25. */
export function levelYearLabels(academicYear: string): [string, string] {
  const start = Number(/^\d{4}/.exec(academicYear)?.[0]);
  if (!start) return ['', ''];
  return [String(start - 1).slice(-2), String(start).slice(-2)];
}

const day = (value: string | null | undefined) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? '');
  return match ? `${match[3]}/${match[2]}/${match[1]}` : '';
};

/** A first enrollment before this year's makes this year a renewal; a new student has none. */
function renewalDay(student: InsuranceStudent) {
  const enrolledOn = student.enrollment?.enrolledOn;
  return enrolledOn && student.enrollmentDate && student.enrollmentDate < enrolledOn ? day(enrolledOn) : '';
}

/** The preview and print window consume this exact document. */
export function buildInsuranceDocument(classes: readonly InsuranceClass[], options: InsuranceDocumentOptions): string {
  const e = escapeHtml;
  const text = ar.insurance.document;
  const logo = safeImageUrl(options.schoolLogo, options.assetOrigin);
  // FreeSerif's bold face has no Arabic, so Arabic letters take Noto Naskh and the rest FreeSerif.
  const arabicFontBase = safeImageUrl('/fonts/insurance/', options.assetOrigin);
  const latinFontBase = safeImageUrl('/fonts/assessment-planning/', options.assetOrigin);
  const arabicRange = 'U+0600-06FF,U+0750-077F,U+0870-08FF,U+FB50-FDFF,U+FE70-FEFF,U+200C-200E';
  const year = options.academicYear.replace('-', '/');
  const [previousYear, currentYear] = levelYearLabels(options.academicYear);
  const date = (value: string) => value ? `<bdi dir="ltr">${e(value)}</bdi>` : '';
  const blank = '<span class="blank"></span>';
  const head = `<thead>
    <tr>
      <th rowspan="3">${e(text.rowNumber)}</th>
      <th rowspan="3">${e(text.massarCode)}</th>
      <th rowspan="3">${e(text.studentName)}</th>
      <th rowspan="3">${e(text.birthDate)}</th>
      <th rowspan="3">${e(text.birthPlace)}</th>
      <th colspan="3" class="group">${e(text.previousSchool)}</th>
      <th colspan="4" class="group">${e(text.currentSchool)}</th>
      <th rowspan="3">${e(text.notes)}</th>
    </tr>
    <tr>
      <th rowspan="2">${e(text.previousSchoolName)}</th>
      <th rowspan="2">${e(text.previousLevel)}</th>
      <th rowspan="2">${e(text.leftOn)}</th>
      <th rowspan="2">${e(text.firstEnrollment)}</th>
      <th rowspan="2">${e(text.renewal)}</th>
      <th colspan="2">${e(text.levels)}</th>
    </tr>
    <tr><th dir="ltr">${e(previousYear)}</th><th dir="ltr">${e(currentYear)}</th></tr>
  </thead>`;
  const cols = [3.5, 9, 19, 7.5, 7.5, 9, 6.5, 7, 7.5, 7.5, 3.5, 3.5, 9.5].map(width => `<col style="width:${width}%">`).join('');
  const sheets = classes.flatMap(cls => {
    const level = arabicLevelName(cls.name);
    const pageCount = Math.max(1, Math.ceil(cls.students.length / INSURANCE_ROWS_PER_PAGE));
    return Array.from({ length: pageCount }, (_, page) => {
      const rows = Array.from({ length: INSURANCE_ROWS_PER_PAGE }, (_, line) => {
        const index = page * INSURANCE_ROWS_PER_PAGE + line;
        const student = cls.students[index];
        const number = `<td class="number">${String(index + 1).padStart(2, '0')}</td>`;
        if (!student) return `<tr>${number}${'<td></td>'.repeat(12)}</tr>`;
        return `<tr>${number}
          <td><bdi dir="ltr">${e(student.studentCode)}</bdi></td>
          <td class="name wrap"><bdi>${e(displayName(student))}</bdi></td>
          <td>${date(day(student.dateOfBirth))}</td>
          <td class="wrap"><bdi>${e(birthplaceLabel(student, 'ar'))}</bdi></td>
          <td class="wrap"><bdi>${e(student.previousSchool)}</bdi></td>
          <td></td><td></td>
          <td>${date(day(student.enrollmentDate))}</td>
          <td>${date(renewalDay(student))}</td>
          <td></td><td></td><td></td>
        </tr>`;
      }).join('');
      return `<section class="sheet">
        <header class="top">
          <div class="school">
            <h1><bdi>${e(options.schoolName)}</bdi></h1>
            <p>${e(text.licenseNumber)} ${options.licenseNumber ? `<bdi dir="ltr">${e(options.licenseNumber)}</bdi>` : blank} &nbsp; ${e(text.licenseDate)} ${date(day(options.licenseDate)) || blank}</p>
          </div>
          <div class="heading">
            <h2>${e(text.title)}</h2>
            <div class="boxes"><span class="box">${e(text.academicYear)} <bdi dir="ltr">${e(year)}</bdi></span><span class="box">${e(text.class)} ${e(level)}</span></div>
          </div>
          <div class="logo">${logo ? `<img src="${e(logo)}" alt="${e(options.schoolName)}">` : ''}</div>
        </header>
        <div class="info">
          <div><b>${e(text.address)}</b> ${options.schoolAddress ? `<bdi>${e(options.schoolAddress)}</bdi>` : blank}</div>
          <div><b>${e(text.phone)}</b> ${options.schoolPhones.length ? `<bdi dir="ltr">${e(options.schoolPhones.join(' / '))}</bdi>` : blank}</div>
          <div><b>${e(text.cycles)}</b> ${options.cycles.length ? e(options.cycles.join(' – ')) : blank}</div>
        </div>
        <table><colgroup>${cols}</colgroup>${head}<tbody>${rows}</tbody></table>
        <footer><span>${e(text.directorSignature)}</span><span>${e(text.provincialDirectorate)}</span><span>${e(text.insurance)}</span></footer>
      </section>`;
    });
  }).join('');
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(text.title)}</title><style>
    @font-face{font-family:InsuranceArabic;src:url('${e(arabicFontBase)}NotoNaskhArabic-400.woff2') format('woff2');font-weight:400;font-display:swap;unicode-range:${arabicRange}}
    @font-face{font-family:InsuranceArabic;src:url('${e(arabicFontBase)}NotoNaskhArabic-700.woff2') format('woff2');font-weight:700;font-display:swap;unicode-range:${arabicRange}}
    @font-face{font-family:InsuranceLatin;src:url('${e(latinFontBase)}FreeSerif.ttf') format('truetype');font-weight:400;font-display:swap}
    @font-face{font-family:InsuranceLatin;src:url('${e(latinFontBase)}FreeSerifBold.ttf') format('truetype');font-weight:700;font-display:swap}
    *{box-sizing:border-box}html{color-scheme:light}body{margin:0;background:#e9edf2;color:#000;font:10pt/1.25 InsuranceArabic,InsuranceLatin,'Times New Roman',serif;padding:16px}
    .sheet{display:flex;flex-direction:column;width:297mm;min-height:210mm;margin:0 auto 16px;padding:7mm 8mm;background:#fff;box-shadow:0 2px 9px #0001}
    .top{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);align-items:start;gap:6mm}
    .school h1{font-size:18pt;line-height:1.2;margin:0 0 2mm}.school p{margin:0;font-size:9.5pt;font-weight:700}
    .heading{text-align:center}.heading h2{font-size:18pt;line-height:1.2;margin:0 0 2.5mm}
    .boxes{display:flex;justify-content:center;gap:5mm}.box{border:1pt solid #000;padding:1mm 4mm;font-weight:700;font-size:10.5pt;white-space:nowrap}
    .logo{justify-self:end}.logo img{display:block;max-width:34mm;max-height:20mm;object-fit:contain}
    .blank{display:inline-block;min-width:24mm;border-bottom:0.75pt dotted #000;vertical-align:baseline}
    .info{display:grid;grid-template-columns:1.4fr 1fr 1.6fr;border:1pt solid #000;margin:3mm 0;font-size:8.5pt}
    .info div{padding:1.2mm 2mm;border-inline-start:1pt solid #000;overflow-wrap:anywhere}.info div:first-child{border-inline-start:0}
    table{width:100%;border-collapse:collapse;table-layout:fixed;border:1.5pt solid #000}
    th,td{border:0.75pt solid #000;padding:0.5mm 1mm;text-align:center;vertical-align:middle;overflow:hidden}
    th{font-size:8.5pt;font-weight:700;line-height:1.15}th.group{font-size:9.5pt;padding:1mm}
    td{height:5.2mm;font-size:9pt;white-space:nowrap;text-overflow:ellipsis}td.number{font-weight:700}td.name{text-align:start}td.wrap{white-space:normal;line-height:1.05;overflow-wrap:anywhere}
    footer{display:flex;justify-content:space-around;margin-top:auto;padding-top:3mm;font-weight:700;font-size:11pt}
    @page{size:A4 landscape;margin:7mm 8mm}thead{display:table-header-group}tr{break-inside:avoid}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}
    @media print{body{background:#fff;padding:0}.sheet{width:auto;min-height:195mm;padding:0;margin:0;box-shadow:none;break-after:page}.sheet:last-child{break-after:auto}}
  </style></head><body>${sheets}</body></html>`;
}
