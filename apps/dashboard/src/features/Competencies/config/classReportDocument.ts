import { COMPETENCY_LEVEL_VALUES, type CompetencyLevel } from '@sms/contracts';
import { escapeHtml as e, massarFontFaces, safeUrl } from '@/features/Massar/config/massarDocument';
import { LEVEL_RANK, monthLabel } from './competencyLevels';
import { APPRECIATION_BANDS, supportGroups, type ClassReport, type ClassSkill } from './classReport';
import { num, outOf, SERIES, titled, wrapLabel, type FollowUpPrintOptions } from './followUpDocument';
import { formatNumber, radar, signed, type Appreciation } from './followUpReport';

export type ClassReportPrintOptions = Omit<FollowUpPrintOptions, 'analysisOf' | 'editableAnalysis' | 'needOf'> & {
  /** The day the report is printed, in the school's date format. */
  dateLabel: string;
  /** The reading of the class's results and the teacher's remark, one sentence a line. */
  analysis: string;
  note: string;
  /** The pupil open on the page, marked in the preview's table. */
  highlightId?: string | null;
};

/**
 * The class grid's colours: a heat map from Non acquis (red) to Maîtrisé
 * (navy), with En cours a neutral grey so the gaps stand out on a full class.
 */
export const CLASS_LEVEL_COLOR: Record<CompetencyLevel, { bg: string; fg: string }> = {
  not_acquired: { bg: '#dc2626', fg: '#fff' },
  beginning: { bg: '#f97316', fg: '#fff' },
  in_progress: { bg: '#d6d3c8', fg: '#3f3f46' },
  advanced: { bg: '#5b9be6', fg: '#fff' },
  mastered: { bg: '#1e3a8a', fg: '#fff' },
};
const BAND_COLOR: Record<Appreciation, string> = {
  excellent: '#1e3a8a', veryGood: '#3b82f6', good: '#93c5fd', average: '#f59e0b', weak: '#dc2626',
};
const CURRENT = '#1e3a8a';

export const level = (value: CompetencyLevel | null) => (value
  ? `<span class="lv" style="background:${CLASS_LEVEL_COLOR[value].bg};color:${CLASS_LEVEL_COLOR[value].fg}">${LEVEL_RANK[value]}</span>`
  : '<span class="lv none">–</span>');
export const captionOf = (options: ClassReportPrintOptions, key: string) => (options.caption ? options.caption(key) : '');

export function header(options: ClassReportPrintOptions, images: { logo: string; ministry: string }, titleKey = 'competencies.classReport.title') {
  const { t } = options;
  const title = `${t(titleKey)} : ${options.subjectName} - ${options.examLabel} - ${options.termLabel}`;
  const second = captionOf(options, titleKey);
  return `<header class="head">
      <div class="emblem">${images.ministry ? `<img src="${e(images.ministry)}" alt="">` : ''}</div>
      <div class="title"><h1>${e(title)}</h1><p>${second ? `${e(second)} · ` : ''}${e(t('competencies.report.year'))} ${num(options.yearLabel)}</p></div>
      <div class="emblem">${images.logo ? `<img src="${e(images.logo)}" alt="">` : `<b>${e(options.school.name)}</b>`}</div>
    </header>`;
}

export function info(report: Pick<ClassReport, 'pupils'>, options: ClassReportPrintOptions) {
  const { t } = options;
  const item = (label: string, value: string) => `<div><dt>${e(label)}</dt><dd><bdi>${e(value)}</bdi></dd></div>`;
  return `<dl class="info">
      ${item(t('competencies.report.class'), `${options.className} - ${options.levelLabel}`)}
      ${options.teacherName ? item(t('competencies.report.teacher'), options.teacherName) : ''}
      ${item(t('competencies.classReport.pupils'), String(report.pupils))}
      ${options.dateLabel ? item(t('competencies.classReport.date'), options.dateLabel) : ''}
    </dl>`;
}

function tiles(report: ClassReport, options: ClassReportPrintOptions) {
  const { t, maxMark } = options;
  const half = formatNumber(maxMark / 2);
  const excellentFrom = formatNumber(maxMark * 0.9);
  const mark = (value: number | null) => (value == null ? '—' : outOf(formatNumber(value), maxMark));
  const tile = (value: string, label: string, tone = '') => `<div class="tile ${tone}"><b>${value}</b><span>${e(label)}</span></div>`;
  return `<div class="tiles">
      ${tile(mark(report.mean), t('competencies.report.classAverage'), 'accent')}
      ${tile(mark(report.high), t('competencies.report.classHigh'))}
      ${tile(mark(report.low), t('competencies.report.classLow'))}
      ${tile(mark(report.median), t('competencies.classReport.median'))}
      ${tile(report.passRate == null ? '—' : num(`${report.passRate}%`), t('competencies.classReport.passRate', { mark: half }), 'good')}
      ${tile(report.marked ? num(report.distribution.excellent) : '—', t('competencies.classReport.excellent', { label: t('competencies.report.appreciations.excellent'), mark: excellentFrom }))}
      ${tile(report.level == null ? '—' : outOf(formatNumber(report.level), 5), t('competencies.classReport.level'), 'level')}
      ${tile(report.acquiredShare == null ? '—' : num(`${report.acquiredShare}%`), t('competencies.classReport.acquired'))}
    </div>`;
}

function grid(report: ClassReport, options: ClassReportPrintOptions, preview: boolean) {
  const { t, maxMark } = options;
  const skills = report.domains.flatMap((domain) => domain.skills);
  const domainRow = report.domains.map((domain) => `<th class="domain" colspan="${domain.skills.length}">${e(domain.name)}</th>`).join('');
  const skillRow = skills.map((skill) => `<th class="skill" title="${e(skill.name)}"><div>${e(skill.name)}</div></th>`).join('');
  const side = (key: string, extra = '') => `<th rowspan="2" class="${extra}">${e(t(key))}</th>`;
  const head = `<thead><tr>
      ${side('competencies.classReport.rank', 'rank')}${side('competencies.classReport.pupil', 'pupil')}
      <th rowspan="2" class="mark">${e(t('competencies.classReport.mark'))}<small>/${e(maxMark)}</small></th>
      ${side('competencies.classReport.diff')}${side('competencies.report.appreciation')}
      ${domainRow}
      <th rowspan="2">${e(t('competencies.classReport.mean'))}<small>/5</small></th>${side('competencies.classReport.trend')}
    </tr><tr>${skillRow}</tr></thead>`;
  const body = report.rows.map((row) => {
    const { report: pupil } = row;
    const diff = pupil.diff == null ? '<td></td>' : `<td class="${pupil.diff > 0 ? 'up' : pupil.diff < 0 ? 'down' : ''}">${num(signed(pupil.diff))}</td>`;
    const trend = [row.up ? `<span class="up">▲${row.up}</span>` : '', row.down ? `<span class="down">▼${row.down}</span>` : ''].filter(Boolean).join(' ');
    const absent = pupil.average == null && pupil.parts.some((part) => part.absent);
    return `<tr${preview && options.highlightId === pupil.student.id ? ' class="me"' : ''}>
      <td class="rank">${row.rank == null ? '' : num(row.rank)}</td>
      <td class="pupil"><bdi>${e(pupil.student.name)}</bdi></td>
      <td class="mark">${pupil.average == null ? (absent ? `<span class="muted">${e(t('competencies.report.absent'))}</span>` : '') : `<b>${num(formatNumber(pupil.average))}</b>`}</td>
      ${diff}
      <td class="grade">${pupil.appreciation ? e(t(`competencies.report.appreciations.${pupil.appreciation}`)) : ''}</td>
      ${skills.map((skill) => `<td class="cell">${level(row.levels[skill.id] ?? null)}</td>`).join('')}
      <td class="mean"><b>${num(formatNumber(row.level))}</b></td>
      <td class="trend">${trend}</td>
    </tr>`;
  }).join('');
  const foot = (label: string, cells: (skill: ClassSkill) => string, mean = '', tone = '') =>
    `<tr class="${tone}"><th colspan="5" class="label">${e(label)}</th>${skills.map((skill) => `<td>${cells(skill)}</td>`).join('')}<td>${mean}</td><td></td></tr>`;
  const value = (number: number | null) => (number == null ? '<span class="muted">–</span>' : num(formatNumber(number)));
  const rows = [
    report.baselineMonth
      ? foot(t('competencies.classReport.baselineRow', { month: monthLabel(report.baselineMonth, options.language) }), (skill) => value(skill.baseline), '', 'soft')
      : '',
    foot(t('competencies.classReport.currentRow'), (skill) => `<b>${value(skill.current)}</b>`, `<b>${value(report.level)}</b>`),
    foot(t('competencies.classReport.masteryRow'), (skill) => (skill.mastery == null ? '' : num(`${skill.mastery}%`)), '', 'soft'),
    foot(t('competencies.classReport.supportRow'), (skill) => `<span class="${skill.support.length ? 'down' : 'muted'}">${num(skill.support.length)}</span>`),
  ].join('');
  const table = `<table class="grid">${head}<tbody>${body}</tbody><tfoot>${rows}</tfoot></table>`;
  return preview ? `<div class="table-scroll" tabindex="0" role="region" aria-label="${e(t('competencies.classReport.results'))}">${table}</div>` : table;
}

function legend(report: ClassReport, options: ClassReportPrintOptions) {
  const { t } = options;
  const scale = [...COMPETENCY_LEVEL_VALUES].reverse()
    .map((value) => `<span>${level(value)}${e(t(`competencies.levels.${value}`))}</span>`).join('');
  const notes = [t('competencies.classReport.legendLevel')];
  if (report.baselineMonth) notes.push(t('competencies.classReport.legendTrend', { month: monthLabel(report.baselineMonth, options.language) }));
  return `<div class="legend-row"><div class="scale"><b>${e(t('competencies.report.scale'))} :</b>${scale}</div><small>${e(notes.join(' · '))}</small></div>`;
}

function cardTitle(number: number, options: ClassReportPrintOptions, key: string) {
  return titled(number, options.t(key), captionOf(options, key));
}

function profile(report: ClassReport, options: ClassReportPrintOptions, preview: boolean) {
  const { t } = options;
  const skills = report.domains.flatMap((domain) => domain.skills);
  const baseline = report.baselineMonth ? monthLabel(report.baselineMonth, options.language) : null;
  const legend = `<div class="legend"><span><i style="background:${CURRENT}"></i>${e(t('competencies.report.current'))}</span>${baseline ? `<span class="dashed"><i style="border-color:${SERIES.group}"></i>${e(baseline)}</span>` : ''}</div>`;
  const head = cardTitle(2, options, 'competencies.classReport.profile');
  // No level up to the Contrôle: a line saying so, not a bar per competency with nothing on it.
  if (!skills.some((skill) => skill.current != null)) {
    return `<div class="card">${head}<p class="muted">${e(t('competencies.classReport.noLevels'))}</p></div>`;
  }
  if (skills.filter((skill) => skill.current != null).length < 3) {
    // Too few competencies for a radar: a bar each, the first assessment marked on it.
    const bars = skills.map((skill) => `<div class="bar-row"><span>${e(skill.name)}</span><div class="bar"><b style="width:${((skill.current ?? 0) / 5) * 100}%;background:${CURRENT}"></b>${skill.baseline == null ? '' : `<i style="inset-inline-start:${(skill.baseline / 5) * 100}%;border-color:${SERIES.group}"></i>`}</div>${num(formatNumber(skill.current))}</div>`).join('');
    return `<div class="card">${head}${bars || '<p class="muted">—</p>'}${legend}</div>`;
  }
  const size = 210;
  const chart = radar(skills.map((skill) => ({ name: skill.name, value: skill.current, group: skill.baseline })), 5, size, 40, [0.2, 0.4, 0.6, 0.8, 1]);
  const margin = preview ? 80 : 58;
  const poly = (points: Array<{ x: number; y: number }>) => points.map((point) => `${point.x},${point.y}`).join(' ');
  const series = (points: typeof chart.pupil, color: string, solid: boolean) => {
    const stroke = solid ? 'stroke-width="1.8"' : 'stroke-width="1.6" stroke-dasharray="4 2"';
    if (points.every((point) => point !== null)) {
      return `<polygon points="${poly(points as Array<{ x: number; y: number }>)}" fill="${solid ? color : 'none'}" fill-opacity=".18" stroke="${color}" ${stroke}/>`
        + (solid ? points.map((point) => `<circle cx="${point!.x}" cy="${point!.y}" r="2.2" fill="${color}"/>`).join('') : '');
    }
    return points.map((point, index) => {
      const next = points[(index + 1) % points.length];
      return (point && next ? `<line x1="${point.x}" y1="${point.y}" x2="${next.x}" y2="${next.y}" stroke="${color}" ${stroke}/>` : '')
        + (point ? `<circle cx="${point.x}" cy="${point.y}" r="2.2" fill="${color}"/>` : '');
    }).join('');
  };
  // Left to right whatever the page's direction, as on the pupil's report: "start" points away from the centre.
  const labels = chart.axes.map((axis) => {
    const anchor = Math.abs(axis.label.x - chart.centre) < 6 ? 'middle' : axis.label.x > chart.centre ? 'start' : 'end';
    const lines = wrapLabel(axis.name, 14, 2);
    const spans = lines.map((line, index) => `<tspan x="${axis.label.x}" dy="${index === 0 ? -((lines.length - 1) * 0.55) : 1.1}em">${e(line)}</tspan>`).join('');
    return `<text x="${axis.label.x}" y="${axis.label.y}" text-anchor="${anchor}" dominant-baseline="middle">${spans}</text>`;
  }).join('');
  return `<div class="card">${head}
    <svg class="radar" direction="ltr" viewBox="${-margin} 0 ${size + margin * 2} ${size}" role="img" aria-label="${e(t('competencies.classReport.profile'))}">
      ${chart.rings.map((ring) => `<polygon points="${poly(ring)}" fill="none" stroke="#d6dde6" stroke-width=".8"/>`).join('')}
      ${chart.axes.map((axis) => `<line x1="${chart.centre}" y1="${chart.centre}" x2="${axis.end.x}" y2="${axis.end.y}" stroke="#d6dde6" stroke-width=".8"/>`).join('')}
      ${report.baselineMonth ? series(chart.group, SERIES.group, false) : ''}
      ${series(chart.pupil, CURRENT, true)}
      ${labels}
    </svg>${legend}</div>`;
}

function distribution(report: ClassReport, options: ClassReportPrintOptions) {
  const { t, maxMark } = options;
  const counted = report.pupils || 1;
  const rows = APPRECIATION_BANDS.map(({ grade, from }) => {
    const count = report.distribution[grade];
    const share = Math.round((count / counted) * 100);
    const threshold = from ? `≥ ${formatNumber(maxMark * from)}` : `< ${formatNumber(maxMark / 2)}`;
    return `<li><div class="band"><b>${e(t(`competencies.report.appreciations.${grade}`))}</b><small>${num(threshold)}</small></div>
      <div class="bar"><b style="width:${share}%;background:${BAND_COLOR[grade]}"></b></div>
      <span class="count">${num(count)} <small>(${num(`${share}%`)})</small></span></li>`;
  }).join('');
  return `<div class="card">${cardTitle(3, options, 'competencies.classReport.distribution')}<ul class="bands">${rows}</ul></div>`;
}

function groups(report: ClassReport, options: ClassReportPrintOptions, most: number) {
  const { t } = options;
  const all = supportGroups(report);
  const shown = all.slice(0, most);
  const names = (pupils: ClassSkill['support']) => {
    const listed = pupils.slice(0, 3).map((pupil) => `<bdi>${e(pupil.name)}</bdi>`).join('، ');
    return pupils.length > 3 ? `${listed} <span class="muted">+${num(pupils.length - 3)}</span>` : listed;
  };
  const items = shown.map((skill) => {
    const parts = [
      skill.support.length ? `<span class="down">${e(t('competencies.classReport.support'))} :</span> ${names(skill.support)}` : '',
      skill.consolidate.length ? `<span class="muted">${e(t('competencies.classReport.consolidate'))} :</span> ${names(skill.consolidate)}` : '',
    ].filter(Boolean).join(' · ');
    return `<li><b>${e(skill.name)} :</b> ${parts}</li>`;
  }).join('');
  const more = all.length > shown.length ? `<li class="muted">${e(t('competencies.classReport.moreSkills', { count: all.length - shown.length }))}</li>` : '';
  return `<div class="card">${cardTitle(4, options, 'competencies.classReport.groups')}
    ${items ? `<ul class="groups">${items}${more}</ul>` : `<p class="muted">${e(t('competencies.classReport.noGroups'))}</p>`}
    <small class="key">${e(t('competencies.classReport.groupsKey'))}</small></div>`;
}

/**
 * How the printed sheet holds the class. Every class prints on both sides of
 * one A4 sheet so nothing is shrunk to fit: the figures and the pupils' table
 * on the front, the profile, appraisals, support groups, analysis and remarks
 * on the back, each at a size read without effort. Up to
 * {@link LARGE_PRINT_PUPILS} pupils the table's rows print large; a larger
 * class keeps them at the regular size so the table still fills the front.
 */
export const LARGE_PRINT_PUPILS = 28;
export function pageFit(pupils: number): 'large' | 'regular' {
  return pupils <= LARGE_PRINT_PUPILS ? 'large' : 'regular';
}

const sentences = (text: string) => text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

function page(report: ClassReport, options: ClassReportPrintOptions, images: { logo: string; ministry: string }, preview: boolean) {
  const { t } = options;
  const analysis = sentences(options.analysis);
  const note = sentences(options.note);
  // The screen reflows: the two sides are the printed sheet's.
  const fit = preview ? 'screen' : `duplex ${pageFit(report.pupils)}`;
  return `<section class="sheet ${fit}" lang="${e(options.language)}" dir="${options.dir}">
    ${header(options, images)}
    ${info(report, options)}
    ${tiles(report, options)}
    <div class="panel">${titled(1, t('competencies.classReport.results'), [captionOf(options, 'competencies.classReport.results'), captionOf(options, 'competencies.report.competenciesCaption') || t('competencies.report.competenciesCaption')].filter(Boolean).join(' · '))}
      ${grid(report, options, preview)}${legend(report, options)}</div>
    <div class="cards">${profile(report, options, preview)}${distribution(report, options)}${groups(report, options, preview ? 6 : 8)}</div>
    <div class="closing">
      <div class="panel">${titled(5, t('competencies.report.analysis'), captionOf(options, 'competencies.report.analysis'))}
        ${analysis.length ? `<ul class="analysis">${analysis.map((line) => `<li dir="auto">${e(line)}</li>`).join('')}</ul>` : '<i class="line"></i><i class="line"></i>'}</div>
      <div class="stack">
        <div class="panel">${titled(6, t('competencies.report.remark'), captionOf(options, 'competencies.report.remark'))}
          ${note.length ? note.map((line) => `<p class="remark" dir="auto">${e(line)}</p>`).join('') : '<i class="line"></i><i class="line"></i>'}</div>
        <div class="panel">${titled(7, t('competencies.report.inspector'), captionOf(options, 'competencies.report.inspector'))}${'<i class="line"></i>'.repeat(preview ? 2 : 5)}</div>
      </div>
    </div>
    <footer class="foot">${e(t('competencies.classReport.generated'))}</footer>
  </section>`;
}

/** The A4 sheet, its header and class details, and the level badges: shared with the support list. */
export const SHEET_STYLES = `
    *{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}html{color-scheme:light}
    body{margin:0;background:#e9edf2;color:#1f2a3a;font:8pt/1.3 MassarArabic,MassarLatin,serif}
    .sheet{display:flex;flex-direction:column;gap:1.2mm;width:210mm;min-height:297mm;margin:0 auto 6mm;padding:6mm 7mm;background:#fff;box-shadow:0 2px 9px #0001}
    .head{display:grid;grid-template-columns:30mm 1fr 30mm;align-items:center;gap:3mm;padding-bottom:1.4mm;border-bottom:1.2pt solid #be123c}
    .emblem{display:flex;justify-content:center}.emblem img{max-width:26mm;max-height:13mm;object-fit:contain}.emblem b{font-size:9pt;text-align:center}
    .title{text-align:center}.title h1{margin:0;font-size:12.5pt;font-weight:700;line-height:1.2}.title p{margin:1mm 0 0;font:8.5pt MassarLatin,MassarArabic,sans-serif;color:#64748b}
    .info{display:flex;flex-wrap:wrap;gap:2mm;margin:0}.info div{display:flex;align-items:baseline;gap:1.5mm;flex:1 1 auto;padding:1.4mm 2.5mm;border:.6pt solid #cfd8e3;border-radius:1.5mm}
    .info dt{color:#64748b;font-size:7.5pt}.info dt::after{content:" :"}.info dd{margin:0;font-weight:700;font-size:9pt;white-space:nowrap}
    .lv{display:block;min-width:4mm;padding:0;border-radius:.8mm;font:700 7pt/1.3 MassarLatin,sans-serif}
    .lv.none{background:#fff;color:#94a3b8;border:.5pt dashed #cbd5e1}
`;

const PREVIEW_STYLES = `
  html{overflow:hidden}
  body{background:#fff;font:13px/1.45 MassarLatin,MassarArabic,system-ui,sans-serif}
  .sheet{width:100%;min-height:0;margin:0;padding:clamp(12px,3vw,28px);gap:12px;box-shadow:none}
  .head{grid-template-columns:clamp(36px,10vw,96px) minmax(0,1fr) clamp(36px,10vw,96px)}
  .emblem img{max-width:100%;max-height:60px}
  .title h1{font-size:clamp(16px,2.6vw,24px);line-height:1.25}.title p{font-size:12px}
  .info{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,150px),1fr))}
  .info div{padding:8px 10px}.info dt{font-size:12px}.info dd{font-size:14px;white-space:normal}
  .tiles{grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:8px}
  .tile{min-height:58px}.tile b{font-size:18px}.tile>span{font-size:11px}
  .card,.panel{padding:12px;border-radius:10px;gap:8px}
  .section-title h3{font-size:15px}.section-title small{font-size:11px}
  .table-scroll{overflow-x:auto;outline-offset:-2px}
  .table-scroll:focus-visible{outline:2px solid #2563eb}
  .grid{min-width:52rem}.grid thead th{font-size:11.5px}.grid th.skill div{height:8rem;font-size:11px}
  .grid tbody td,.grid tfoot td,.grid tfoot th{padding:3px 5px;font-size:12.5px;line-height:1.35}.grid td.cell{padding:2px 3px}.grid td.grade,.grid td.trend{font-size:12px}.grid .lv{font-size:11.5px;line-height:1.6}
  .grid td.pupil{min-width:9rem}
  .legend-row,.legend,.bands li,.groups li{font-size:12px}
  .cards{grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr))}
  .radar{max-height:220px}.radar text{font-size:12px}
  .closing{grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr))}
  .analysis,.remark{font-size:13px;line-height:1.55}
`;

/**
 * تقرير القسم on A4: the Ministry's emblem and the school's logo around the
 * title, the class's figures, every pupil's mark and current levels with the
 * class's means under them, the class profile, the appraisals, the support
 * groups, the analysis and room for the teacher's and the inspector's
 * remarks, on both sides of the sheet.
 */
export function buildClassReportDocument(report: ClassReport, options: ClassReportPrintOptions, mode: 'print' | 'preview' = 'print'): string {
  return buildClassReportsDocument([{ report, options }], mode);
}

export type ClassReportEntry = { report: ClassReport; options: ClassReportPrintOptions };

/**
 * Several classes' reports in one print, each from a new sheet in its own
 * list's language and direction: the all-classes button. The page's fonts,
 * styles and title follow the first class.
 */
export function buildClassReportsDocument(entries: readonly ClassReportEntry[], mode: 'print' | 'preview' = 'print'): string {
  const preview = mode === 'preview';
  const first = entries[0]?.options;
  if (!first) return '';
  const origin = first.assetOrigin;
  const pages = entries.map(({ report, options }) => page(report, options, {
    logo: safeUrl(options.school.logo, origin), ministry: safeUrl('/images/massar/ministry.png', origin),
  }, preview)).join('');
  return `<!doctype html><html lang="${e(first.language)}" dir="${first.dir}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(first.t('competencies.classReport.title'))}</title><style>
    ${massarFontFaces(origin)}
    ${SHEET_STYLES}
    .tiles{display:grid;grid-template-columns:repeat(8,1fr);gap:1.5mm}
    .tile{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.3mm;min-height:10mm;padding:.8mm;border:.5pt solid #e2e8f0;border-radius:1.5mm;text-align:center}
    .tile b{font:700 12pt MassarLatin,sans-serif;color:#1f2a3a}.tile b small{font-size:7.5pt;color:#64748b;font-weight:400}.tile>span{font-size:6.6pt;line-height:1.2;color:#475569}
    .tile.accent{background:#fef2f2;border-color:#fecaca}.tile.accent b{color:#be123c}.tile.good b{color:#15803d}.tile.level b{color:#c2410c}
    .card,.panel{display:flex;flex-direction:column;gap:1.2mm;min-width:0;border:.6pt solid #cfd8e3;border-radius:2mm;padding:1.6mm 2.2mm;background:#fff;break-inside:avoid}
    .section-title{display:flex;justify-content:space-between;align-items:baseline;gap:2mm}
    .section-title h3{display:flex;align-items:center;gap:1.5mm;margin:0;font-size:10pt;white-space:nowrap}.cards .section-title{flex-wrap:wrap;row-gap:0}.cards .section-title h3{font-size:9.5pt}.section-title small{font:7pt MassarLatin,sans-serif;color:#94a3b8}
    .n{display:inline-flex;align-items:center;justify-content:center;width:4.6mm;height:4.6mm;border-radius:1mm;background:#fee2e2;color:#be123c;font:700 8pt MassarLatin,sans-serif}
    table{width:100%;border-collapse:collapse}th,td{border:.4pt solid #e2e8f0;padding:.5mm .7mm;text-align:center;vertical-align:middle}
    .grid thead th{background:#fff1f2;font-size:7.4pt;font-weight:700;color:#475569}.grid thead th small{display:block;font-weight:400;color:#94a3b8}
    .grid th.domain{font-size:7.2pt;line-height:1.1}
    /* Every competency's column the same width: a domain of one wraps its name instead of widening it. */
    .grid th.skill,.grid td.cell{width:7.4mm}
    .grid th.skill{padding:.6mm .2mm;vertical-align:bottom}
    .grid th.skill div{writing-mode:vertical-rl;transform:rotate(180deg);height:17mm;margin:auto;font-size:7pt;font-weight:600;line-height:1.1;text-align:start;overflow:hidden}
    .grid tbody td{padding:.2mm .6mm;font:7.6pt/1.15 MassarLatin,MassarArabic,sans-serif}.grid td.pupil{text-align:start;white-space:nowrap;font-family:MassarArabic,MassarLatin,serif}
    .grid td.rank,.grid td.mark,.grid td.mean{font-weight:700}.grid td.grade{font:7.4pt MassarArabic,MassarLatin,serif;color:#475569;white-space:nowrap}
    .grid td.cell{padding:.2mm .4mm}.grid td.trend{white-space:nowrap;font-size:7.4pt}
    .grid tbody tr:nth-child(even) td{background:#fbfcfe}.grid tbody tr.me td{background:#ecfdf5}
    .grid tfoot th.label{text-align:start;background:#f8fafc;font-size:7.4pt;font-weight:600}
    .grid tfoot td,.grid tfoot th{padding:.3mm .6mm}.grid tfoot td{font:7.4pt/1.15 MassarLatin,sans-serif}.grid tfoot tr:first-child>*{border-top:.9pt solid #94a3b8}.grid tfoot tr.soft td{color:#64748b}
    .up{color:#15803d}.down{color:#be123c}.muted{color:#94a3b8}
    .legend-row{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:1mm 3mm;font-size:7pt;color:#475569}
    .legend-row .scale{display:flex;flex-wrap:wrap;align-items:center;gap:1mm 2.4mm}.legend-row .scale span{display:inline-flex;align-items:center;gap:.8mm}
    .legend-row .lv{display:inline-flex;align-items:center;justify-content:center;width:3.6mm;height:3.6mm;line-height:1;text-align:center}.legend-row small{font-size:6.8pt;color:#64748b}
    .cards{display:grid;grid-template-columns:1fr 1fr 1.15fr;gap:2.2mm}
    .radar{width:100%;height:auto;max-height:42mm;overflow:visible}.radar text{font-size:10.5px;fill:#25354a}
    .legend{display:flex;justify-content:center;gap:4mm;font-size:7pt;color:#475569}.legend span{display:inline-flex;align-items:center;gap:1mm}
    .legend i{display:inline-block;width:4mm;height:.8mm}.legend .dashed i{height:0;border-top:.8mm dashed;background:none}
    .bar-row{display:grid;grid-template-columns:1fr 2fr auto;align-items:center;gap:1.5mm;font-size:7.4pt}
    .bar{position:relative;height:2.6mm;background:#eef2f6;border-radius:1mm;overflow:visible}.bar b{display:block;height:100%;border-radius:1mm}
    .bar i{position:absolute;top:-.6mm;bottom:-.6mm;border-inline-start:.6mm dashed}
    .bands{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:.9mm}
    .bands li{display:grid;grid-template-columns:17mm 1fr 13mm;align-items:center;gap:1.5mm;font-size:7.8pt}
    .bands .band{display:flex;flex-direction:column;line-height:1.1}.bands .band small{font:6.6pt MassarLatin,sans-serif;color:#94a3b8}
    .bands .count{font:700 7.8pt MassarLatin,sans-serif;text-align:end}.bands .count small{font-weight:400;color:#94a3b8}
    .groups{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:.5mm;font-size:7.4pt;line-height:1.25}
    .groups li{padding-bottom:.6mm;border-bottom:.4pt dotted #e2e8f0}.groups li:last-child{border-bottom:0}
    .key{margin-top:auto;font-size:6.6pt;color:#94a3b8}
    .closing{display:grid;grid-template-columns:1.1fr 1fr;gap:2.2mm}
    .closing .stack{display:flex;flex-direction:column;gap:1.5mm}.closing .stack .panel{flex:1}
    .analysis{margin:0;padding-inline-start:4mm;display:flex;flex-direction:column;gap:.4mm;font-size:8pt;line-height:1.3}
    .remark{margin:0;font-size:8pt;line-height:1.35}
    .line{display:block;height:4mm;border-bottom:.5pt dotted #94a3b8}
    .foot{margin-top:auto;font-size:6.8pt;color:#94a3b8;text-align:end}
    /* The front: the class's figures and the table, larger than a one-page sheet allows. */
    .duplex .title h1{font-size:14pt}.duplex .title p{font-size:9pt}
    .duplex .info dt{font-size:8.6pt}.duplex .info dd{font-size:10.4pt}
    .duplex .tiles{gap:2mm}.duplex .tile{min-height:14mm;padding:1.2mm}
    .duplex .tile b{font-size:15pt}.duplex .tile b small{font-size:8.6pt}.duplex .tile>span{font-size:7.8pt}
    .duplex .section-title h3{font-size:11.5pt}.duplex .section-title small{font-size:8pt}
    .duplex .legend-row{font-size:8.2pt}.duplex .legend-row small{font-size:7.8pt}.duplex .legend-row .lv{width:4.4mm;height:4.4mm}
    .large .grid thead th{font-size:8.8pt}.large .grid th.domain{font-size:8.6pt}
    .large .grid th.skill,.large .grid td.cell{width:8.8mm}
    .large .grid th.skill div{height:25mm;font-size:8.4pt}
    .large .grid tbody td{padding:.6mm .9mm;font-size:9.8pt;line-height:1.2}
    .large .grid td.grade,.large .grid td.trend{font-size:9.2pt}
    .large .grid td.cell{padding:.4mm .5mm}.large .grid .lv{font-size:9pt;line-height:1.45}
    .large .grid tfoot th.label{font-size:9pt}.large .grid tfoot td,.large .grid tfoot th{padding:.6mm .8mm;font-size:9pt}
    /* The back: the profile, appraisals and groups, then the analysis and both remarks, with room to read and write. */
    .duplex .card,.duplex .panel{gap:2mm;padding:3mm 3.6mm}
    .duplex .cards{grid-template-columns:1fr 1fr;gap:3mm}
    .duplex .cards .card:last-child{grid-column:1/-1}
    .duplex .cards .section-title h3{font-size:11.5pt}
    .duplex .radar{max-height:66mm}.duplex .radar text{font-size:12.5px}
    .duplex .legend{font-size:9pt}.duplex .bar-row{font-size:9.4pt}.duplex .bar{height:3.6mm}
    .duplex .bands{gap:3.6mm;justify-content:center;flex:1}
    .duplex .bands li{grid-template-columns:30mm 1fr 20mm;font-size:10.4pt}
    .duplex .bands .band{flex-direction:row;align-items:baseline;gap:1.5mm}.duplex .bands .band small{font-size:8.6pt}
    .duplex .bands .count{font-size:10.4pt}
    .duplex .groups{display:block;columns:2;column-gap:5mm;font-size:10pt;line-height:1.45}.duplex .groups li{break-inside:avoid;margin-bottom:1.2mm;padding-bottom:1.2mm}
    .duplex .key{font-size:8.4pt}
    .duplex .closing{grid-template-columns:1fr;gap:3mm}
    .duplex .closing .stack{display:grid;grid-template-columns:1fr 1fr;gap:3mm}
    .duplex .analysis{font-size:10.6pt;line-height:1.55;gap:1mm;padding-inline-start:5mm}
    .duplex .remark{font-size:10.6pt;line-height:1.55}
    .duplex .line{height:7mm}
    .duplex .foot{font-size:8pt}
    /* Page margins rather than the sheet's padding, so a second page has its own. */
    @page{size:A4 portrait;margin:6mm 7mm}
    @media print{
      body{background:#fff}.sheet{width:auto;min-height:0;margin:0;padding:0;box-shadow:none}
      .grid thead{display:table-header-group}.grid tr{break-inside:avoid}
      /* The back of the sheet: the profile, analysis and remarks. */
      .duplex .cards{break-before:page}
      /* Each class from a new sheet. */
      .sheet+.sheet{break-before:page}
    }
    ${preview ? PREVIEW_STYLES : ''}
  </style></head><body>${pages}</body></html>`;
}
