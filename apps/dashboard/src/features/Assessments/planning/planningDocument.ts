import { toOfficialClassName } from '@sms/contracts';
import { classDocumentColors, classDocumentTypography, planningClasses, planningDays, revisionGroups, targetSections, type PlanningAssessment } from './planningModel';

export type PlanningDocumentOptions = {
  title: string;
  schoolName: string;
  schoolLogo?: string | null;
  academicYear: string;
  semester: 1 | 2 | null;
  sectionId?: string;
  language: string;
  assetOrigin: string;
  labels: { semester: string; academicYear: string; class: string; lessons: string; subject: string; date: string; sections: string };
};

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

/** The preview and print window consume this exact document. */
export function buildPlanningDocument(records: readonly PlanningAssessment[], options: PlanningDocumentOptions): string {
  const e = escapeHtml;
  const logo = safeImageUrl(options.schoolLogo, options.assetOrigin);
  const fontBase = safeImageUrl('/fonts/assessment-planning/', options.assetOrigin);
  const locale = ['ar', 'fr', 'en', 'es'].includes(options.language) ? options.language : 'fr';
  const label = options.labels;
  const date = (value: string, language: string, weekday = false) => new Intl.DateTimeFormat(language, weekday
    ? { weekday: 'long', timeZone: 'UTC' }
    : { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T12:00:00Z`));
  const pages = planningClasses(records).map(cls => {
    const semester = options.semester ?? [...new Set(records.filter(record => record.class?.id === cls.id)
      .map(record => record.planning?.semester).filter(value => value === 1 || value === 2))].sort().join(' / ');
    const [accent, pale] = classDocumentColors(cls.name);
    const [latinSize, arabicSize] = classDocumentTypography(cls.name);
    const rows = planningDays(records.filter(record => record.class?.id === cls.id)).map(([day, assessments]) => {
      const printableRows = assessments.flatMap(record => revisionGroups(record).map(group => ({record, group})));
      return `<tbody>${printableRows.map(({record, group}, index) => {
        const sections = targetSections(record).filter(section => !options.sectionId || section.id === options.sectionId);
        const sectionNames = sections.map(section => section.name).join(' / ');
        return `<tr${index === 0 ? ' class="day-start"' : ''}>
          <td class="lessons" lang="${e(group.language)}" dir="${group.language === 'ar' ? 'rtl' : 'ltr'}">${group.lessons.length
            ? `<ul>${group.lessons.map(lesson => `<li>${e(lesson)}</li>`).join('')}</ul>` : `<span dir="auto">${e(record.title)}</span>`}</td>
          <td class="subject" dir="auto">${e(group.label || record.subject?.name || record.title)}${sectionNames && !options.sectionId ? `<small dir="auto">${e(label.sections)} ${e(sectionNames)}</small>` : ''}</td>
          ${index === 0 ? `<td class="date" rowspan="${printableRows.length}"><span lang="ar" dir="rtl">${e(date(day, 'ar', true))}</span><span lang="fr">${e(date(day, 'fr', true))}</span><strong dir="ltr">${e(date(day, 'fr'))}</strong></td>` : ''}
        </tr>`;
      }).join('')}</tbody>`;
    }).join('');
    const sectionName = options.sectionId ? records.flatMap(targetSections).find(section => section.id === options.sectionId)?.name : '';
    return `<section class="sheet" style="--document-accent:${accent};--document-pale:${pale};--document-latin-size:${latinSize}pt;--document-arabic-size:${arabicSize}pt">
      <header class="document-header">${logo ? `<img src="${e(logo)}" alt="${e(options.schoolName)}">` : '<div class="school-identity" dir="auto">' + e(options.schoolName) + '</div>'}
        <div class="heading"><h1 dir="auto">${e(options.title)}</h1><p><b>${e(label.semester)} ${e(semester)}</b> &nbsp;•&nbsp; ${e(label.academicYear)} : <bdi>${e(options.academicYear)}</bdi></p></div>
        <div class="class-badge"><small>${e(label.class)}</small><strong>${e(toOfficialClassName(cls.name))}</strong>${sectionName ? `<span>${e(sectionName)}</span>` : ''}</div>
      </header>
      <table><colgroup><col style="width:66%"><col style="width:19%"><col style="width:15%"></colgroup><thead><tr>
        <th scope="col"><span lang="ar" dir="rtl">الدروس المستهدفة</span><small>${e(label.lessons)}</small></th>
        <th scope="col"><span lang="ar" dir="rtl">المادة</span><small>${e(label.subject)}</small></th>
        <th scope="col"><span lang="ar" dir="rtl">التاريخ</span><small>${e(label.date)}</small></th>
      </tr></thead>${rows}</table>
      <footer><strong dir="auto">${e(options.schoolName)}</strong> · ${e(options.title)} · ${e(label.semester)} ${e(semester)} · ${e(options.academicYear)}</footer>
    </section>`;
  }).join('');
  return `<!doctype html><html lang="${locale}" dir="ltr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(options.title)}</title><style>
    @font-face{font-family:PlanningCarlito;src:url('${e(fontBase)}Carlito-Regular.ttf') format('truetype');font-weight:400;font-display:swap}
    @font-face{font-family:PlanningCarlito;src:url('${e(fontBase)}Carlito-Bold.ttf') format('truetype');font-weight:700;font-display:swap}
    @font-face{font-family:PlanningArabic;src:url('${e(fontBase)}FreeSerif.ttf') format('truetype');font-weight:400;font-display:swap}
    @font-face{font-family:PlanningArabic;src:url('${e(fontBase)}FreeSerifBold.ttf') format('truetype');font-weight:700;font-display:swap}
    *{box-sizing:border-box}html{color-scheme:light}body{margin:0;background:#e9edf2;color:#263244;font:11pt/1.3 PlanningCarlito,Calibri,Arial,sans-serif;padding:16px}
    .sheet{display:flex;flex-direction:column;width:100%;max-width:210mm;min-height:297mm;margin:0 auto 16px;padding:12mm;background:#fff;box-shadow:0 2px 9px #0001}
    .document-header{display:grid;grid-template-columns:25mm minmax(0,1fr) 30mm;align-items:center;gap:4mm;border-bottom:1.5pt solid var(--document-accent);padding-bottom:7mm;margin-bottom:4mm}
    .document-header img{width:25mm;height:24mm;object-fit:contain}.school-identity{color:#15519B;font-weight:700;font-size:10pt;overflow-wrap:anywhere}
    h1{font-size:20pt;line-height:1.12;margin:0 0 2mm;color:#15519B}.heading p{font-size:10pt;color:#65728a;margin:0}.heading p b{color:var(--document-accent)}
    .class-badge{background:var(--document-accent);color:#fff;text-align:center;padding:4mm 1mm;overflow-wrap:anywhere}.class-badge small{font-size:8pt;display:block}.class-badge strong{font-size:22pt;display:block}.class-badge span{font-size:10pt;display:block}
    table,.document-header{flex-shrink:0}table{width:100%;border-collapse:collapse;table-layout:fixed}th,td{border:0.5pt solid #d4dfed}th{background:#15519B;color:#fff;text-align:center;padding:2.5mm 1mm;font-weight:400}th span{display:block;font:700 11pt PlanningArabic,serif}th small{display:block;font-size:8pt}
    td{padding:1.2mm 2mm;vertical-align:middle;overflow-wrap:anywhere}.day-start td{border-top:1.5pt solid var(--document-accent)}tbody:nth-of-type(even) .lessons,tbody:nth-of-type(even) .subject{background:#F6F8FB}
    .lessons{font-size:var(--document-latin-size);line-height:1.05;white-space:pre-wrap}.lessons[lang=ar]{font-family:PlanningArabic,serif;font-size:var(--document-arabic-size);line-height:1.05;text-align:right}.lessons ul{margin:0;padding-inline-start:4mm}.lessons li::marker{color:var(--document-accent)}
    .subject{color:#15519B;text-align:center;font-weight:700;font-family:PlanningCarlito,PlanningArabic,serif;font-size:10pt}.subject small{display:block;margin-top:1mm;font-size:8pt;font-weight:400;color:#5e6b80}
    .date{background:var(--document-pale);text-align:center;color:var(--document-accent);font-size:10pt}.date span{display:block}.date span[lang=ar]{font-family:PlanningArabic,serif;font-size:11pt}.date strong{display:block;margin-top:1.5mm;color:#15519B;font-size:10pt}
    footer{flex-shrink:0;border-top:0.5pt solid #d4dfed;margin-top:auto;padding-top:3mm;text-align:center;color:#65728a;font-size:8pt}footer strong{color:#15519B}
    @page{size:A4 portrait;margin:12mm}thead{display:table-header-group}tr{break-inside:avoid}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}
    @media print{body{background:#fff;padding:0}.sheet{max-width:none;min-height:272mm;padding:0;margin:0;box-shadow:none;break-after:page}.sheet:last-child{break-after:auto}.document-header,footer{break-inside:avoid}}
    @media screen and (max-width:620px){body{padding:5px}.sheet{padding:4mm;min-height:0}.document-header{grid-template-columns:18mm minmax(0,1fr) 23mm;gap:2mm}.document-header img{width:18mm;height:18mm}h1{font-size:16pt}.heading p{font-size:9pt}.class-badge strong{font-size:18pt}td{padding:1mm}.date strong{font-size:8pt;white-space:nowrap}col:nth-child(1){width:55%!important}col:nth-child(2){width:24%!important}col:nth-child(3){width:21%!important}.subject{font-size:9pt}.lessons{font-size:10pt}.lessons[lang=ar]{font-size:12pt}}
  </style></head><body>${pages}</body></html>`;
}

/** Open during the click, then wait for the document's fonts and logo before printing. */
export async function printPlanningDocument(html: string): Promise<boolean> {
  const win = window.open('', '_blank', 'width=1000,height=850');
  if (!win) return false;
  win.document.write(html);
  win.document.close();
  await Promise.all([
    win.document.fonts?.ready,
    ...Array.from(win.document.images).map(image => image.complete ? Promise.resolve() : new Promise<void>(resolve => {
      image.addEventListener('load', () => resolve(), { once: true });
      image.addEventListener('error', () => resolve(), { once: true });
    })),
  ]);
  if (!win.closed) { win.focus(); win.print(); }
  return true;
}
