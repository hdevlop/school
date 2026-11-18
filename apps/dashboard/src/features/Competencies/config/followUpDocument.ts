import { COMPETENCY_LEVEL_VALUES, type CompetencyLevel } from '@sms/contracts';
import { escapeHtml as e, massarFontFaces, safeUrl } from '@/features/Massar/config/massarDocument';
import { LEVEL_RANK, levelOfRank, monthLabel } from './competencyLevels';
import { formatNumber, levelShare, radar, signed, type Appreciation, type FollowUp } from './followUpReport';

type Translate = (key: string, params?: Record<string, string | number>) => string;

export type FollowUpPrintOptions = {
  /** The report's language, and a second one for the small captions (French under Arabic). */
  language: string;
  dir: 'ltr' | 'rtl';
  t: Translate;
  caption: Translate | null;
  school: { name: string; logo?: string | null };
  assetOrigin: string;
  subjectName: string;
  /** Massar's names: the class (3APG-1), its level (الثالث ابتدائي عام), the Contrôle and its semester. */
  className: string;
  levelLabel: string;
  examLabel: string;
  termLabel: string;
  yearLabel: string;
  teacherName: string | null;
  maxMark: number;
  /** The analysis printed for a pupil, one sentence a line: generated, or as the teacher edited it. */
  analysisOf: (report: FollowUp) => string;
};

/** The level colours of the acquisition scale, from Non acquis (red) to Maîtrisé (navy). */
export const LEVEL_COLOR: Record<CompetencyLevel, string> = {
  not_acquired: '#dc2626', beginning: '#f97316', in_progress: '#f59e0b', advanced: '#3b82f6', mastered: '#1e3a8a',
};
const APPRECIATION_COLOR: Record<Appreciation, string> = {
  excellent: '#15803d', veryGood: '#15803d', good: '#c2410c', average: '#c2410c', weak: '#b91c1c',
};
/** The radar's two series: categorical slots 1 and 2 of the validated palette; the class's is dashed. */
const SERIES = { pupil: '#2a78d6', group: '#eb6834' } as const;

const num = (value: number | string) => `<bdi dir="ltr">${e(value)}</bdi>`;
/** `7.25/10` read left to right as one number, whatever the page's direction. */
const outOf = (value: number | string, max: number | string) => `<span dir="ltr">${e(value)}<small>/${e(max)}</small></span>`;
const badge = (level: CompetencyLevel | null) =>
  level ? `<span class="badge" style="background:${LEVEL_COLOR[level]}">${LEVEL_RANK[level]}</span>` : '<span class="badge none">–</span>';

function titled(number: number, title: string, caption: string) {
  return `<div class="section-title"><h3><span class="n">${number}</span>${e(title)}</h3>${caption ? `<small>${e(caption)}</small>` : ''}</div>`;
}

function profile(report: FollowUp, max: number, t: Translate, caption: Translate | null, preview: boolean) {
  const head = `<div class="card-title"><h4>${e(t('competencies.report.profile'))}</h4>${caption ? `<small>${e(caption('competencies.report.profile'))}</small>` : ''}</div>`;
  const legend = `<div class="legend"><span><i style="background:${SERIES.pupil}"></i>${e(t('competencies.report.profilePupil'))}</span><span class="dashed"><i style="border-color:${SERIES.group}"></i>${e(t('competencies.report.profileClass'))}</span></div>`;
  if (report.parts.length < 3) {
    // Fewer than three parts make no radar: a bar each, the class's average marked on it.
    const bars = report.parts.map((part) => `<div class="bar-row"><span>${e(part.name)}</span><div class="bar"><b style="width:${((part.mark ?? 0) / max) * 100}%;background:${SERIES.pupil}"></b>${part.classAverage == null ? '' : `<i style="inset-inline-start:${(part.classAverage / max) * 100}%;border-color:${SERIES.group}"></i>`}</div>${num(formatNumber(part.mark))}</div>`).join('');
    return `<div class="card">${head}${bars}${legend}</div>`;
  }
  const size = 210;
  const chart = radar(report.parts, max, size, 40);
  const labelMargin = preview ? 72 : 0;
  const viewBox = `${-labelMargin} 0 ${size + labelMargin * 2} ${size}`;
  const poly = (points: Array<{ x: number; y: number }>) => points.map((point) => `${point.x},${point.y}`).join(' ');
  const labels = chart.axes.map((axis) => {
    const anchor = Math.abs(axis.label.x - chart.centre) < 6 ? 'middle' : axis.label.x > chart.centre ? 'start' : 'end';
    return `<text x="${axis.label.x}" y="${axis.label.y}" text-anchor="${anchor}" dominant-baseline="middle">${e(axis.name)}</text>`;
  }).join('');
  return `<div class="card">${head}
    <svg class="radar" viewBox="${viewBox}" role="img" aria-label="${e(t('competencies.report.profile'))}">
      ${chart.rings.map((ring) => `<polygon points="${poly(ring)}" fill="none" stroke="#d6dde6" stroke-width=".8"/>`).join('')}
      ${chart.axes.map((axis) => `<line x1="${chart.centre}" y1="${chart.centre}" x2="${axis.end.x}" y2="${axis.end.y}" stroke="#d6dde6" stroke-width=".8"/>`).join('')}
      <polygon points="${poly(chart.group)}" fill="none" stroke="${SERIES.group}" stroke-width="1.6" stroke-dasharray="4 2"/>
      <polygon points="${poly(chart.pupil)}" fill="${SERIES.pupil}" fill-opacity=".22" stroke="${SERIES.pupil}" stroke-width="1.8"/>
      ${chart.pupil.map((point) => `<circle cx="${point.x}" cy="${point.y}" r="2.4" fill="${SERIES.pupil}"/>`).join('')}
      ${labels}
    </svg>${legend}</div>`;
}

function indicators(report: FollowUp, options: FollowUpPrintOptions) {
  const { t, caption, maxMark } = options;
  const { indicators: ind } = report;
  const level = levelOfRank(ind.level);
  const tile = (value: string, label: string, tone = '') => `<div class="tile ${tone}"><b>${value}</b><span>${e(label)}</span></div>`;
  const diffTone = report.diff == null ? '' : report.diff < 0 ? 'bad' : 'good';
  const counted = COMPETENCY_LEVEL_VALUES.reduce((sum, item) => sum + ind.distribution[item], 0);
  const stack = counted
    ? [...COMPETENCY_LEVEL_VALUES].reverse().map((item) => (ind.distribution[item] ? `<i style="width:${(ind.distribution[item] / counted) * 100}%;background:${LEVEL_COLOR[item]}"></i>` : '')).join('')
    : '';
  return `<div class="card"><div class="card-title"><h4>${e(t('competencies.report.indicators'))}</h4>${caption ? `<small>${e(caption('competencies.report.indicators'))}</small>` : ''}</div>
    <div class="tiles">
      ${tile(report.average == null ? '—' : outOf(formatNumber(report.average), maxMark), `${t('competencies.report.indAverage')} ${options.examLabel}`, 'accent')}
      ${tile(report.diff == null ? '—' : num(signed(report.diff)), t('competencies.report.indCompare', { average: formatNumber(report.classAverage) }), diffTone)}
      ${tile(ind.level == null ? '—' : outOf(ind.level, 5), `${level ? t(`competencies.levels.${level}`) : ''} · ${t('competencies.report.indLevel')}`, 'level')}
      ${tile(report.examMonth ? outOf(ind.acquired, ind.total) : '—', t('competencies.report.indAcquired'))}
      ${tile(report.examMonth ? num(ind.support) : '—', t('competencies.report.indSupport'), ind.support ? 'bad' : '')}
      ${tile(ind.mastery == null ? '—' : num(`${ind.mastery}%`), t('competencies.report.indMastery'))}
    </div>
    <div class="stack" dir="ltr">${stack}</div></div>`;
}

function scale(report: FollowUp, t: Translate) {
  const rows = [...COMPETENCY_LEVEL_VALUES].reverse().map((level) =>
    `<li>${badge(level)}<span>${e(t(`competencies.levels.${level}`))}</span><small>${num(`${levelShare(level)}%`)}</small><b>${report.examMonth ? num(report.indicators.distribution[level]) : '—'}</b></li>`).join('');
  return `<div class="card"><div class="card-title"><h4>${e(t('competencies.report.scale'))}</h4></div><ul class="scale">${rows}</ul></div>`;
}

function marks(report: FollowUp, options: FollowUpPrintOptions) {
  const { t } = options;
  const head = report.parts.map((part) => `<th>${e(part.name)}</th>`).join('');
  const markCell = (mark: number | null, absent: boolean, grade: Appreciation | null) => (mark == null
    ? (absent ? `<td class="muted">${e(t('competencies.report.absent'))}</td>` : '<td></td>')
    : `<td style="color:${grade ? APPRECIATION_COLOR[grade] : 'inherit'}"><b>${num(formatNumber(mark))}</b></td>`);
  const diffCell = (diff: number | null) => (diff == null ? '<td></td>'
    : `<td class="${diff > 0 ? 'up' : diff < 0 ? 'down' : ''}">${num(signed(diff))}</td>`);
  return `<table class="marks"><thead><tr><th class="label">${e(t('competencies.report.part'))}</th>${head}<th class="total">${e(t('competencies.report.subjectAverage'))}</th></tr></thead><tbody>
    <tr><th class="label">${e(options.examLabel)}</th>${report.parts.map((part) => markCell(part.mark, part.absent, part.appreciation)).join('')}${markCell(report.average, false, report.appreciation).replace('<td', '<td class="total"')}</tr>
    <tr class="soft"><th class="label">${e(t('competencies.report.classAverage'))}</th>${report.parts.map((part) => `<td>${num(formatNumber(part.classAverage))}</td>`).join('')}<td class="total">${num(formatNumber(report.classAverage))}</td></tr>
    <tr><th class="label">${e(t('competencies.report.diff'))}</th>${report.parts.map((part) => diffCell(part.diff)).join('')}${diffCell(report.diff).replace('<td', '<td class="total"')}</tr>
    <tr class="soft"><th class="label">${e(t('competencies.report.appreciation'))}</th>${report.parts.map((part) => `<td class="grade">${part.appreciation ? e(t(`competencies.report.appreciations.${part.appreciation}`)) : ''}</td>`).join('')}<td class="total grade"><b>${report.appreciation ? e(t(`competencies.report.appreciations.${report.appreciation}`)) : ''}</b></td></tr>
  </tbody></table>`;
}

function competencies(report: FollowUp, options: FollowUpPrintOptions) {
  const { t, language } = options;
  const months = report.months;
  const head = months.map((month) => `<th class="${month === report.examMonth ? 'now' : ''}">${e(monthLabel(month, language))}</th>`).join('');
  const body = report.domains.map((domain) => domain.lines.map((line, index) => {
    const domainCell = index ? '' : `<th class="domain" rowspan="${domain.lines.length}"><span>${e(domain.name)}</span>${domain.average == null ? ''
      : `<div class="domain-score">${domain.acquiredShare == null ? '' : `<small>${num(`${domain.acquiredShare}%`)}</small>`}<span class="pill">${num(`${domain.average}/5`)}</span></div>`}</th>`;
    const cells = months.map((month) => `<td class="${month === report.examMonth ? 'now' : ''}">${badge(line.levels[month])}</td>`).join('');
    const current = line.current;
    const trend = line.trend === 'up' ? '<span class="up">▲</span>' : line.trend === 'down' ? '<span class="down">▼</span>' : line.trend === 'same' ? '<span class="muted">•</span>' : '';
    return `<tr${index ? '' : ' class="first"'}>${domainCell}<td class="name">${e(line.name)}</td>${cells}
      <td class="current" style="color:${current ? LEVEL_COLOR[current] : '#94a3b8'}">${current ? e(t(`competencies.levels.${current}`)) : '—'}</td>
      <td class="share" style="color:${current ? LEVEL_COLOR[current] : '#94a3b8'}">${current ? num(`${levelShare(current)}%`) : ''}</td><td>${trend}</td></tr>`;
  }).join('')).join('');
  return `<table class="competencies"><thead><tr><th>${e(t('competencies.report.domain'))}</th><th>${e(t('competencies.report.competency'))}</th>${head}
    <th>${e(t('competencies.report.current'))}</th><th>${e(t('competencies.report.share'))}</th><th>${e(t('competencies.report.change'))}</th></tr></thead><tbody>${body}</tbody></table>`;
}

/** قراءة تحليلية: each sentence on its own line. */
function analysis(text: string, t: Translate, caption: Translate | null) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return '';
  return `<div class="panel">${titled(3, t('competencies.report.analysis'), caption ? caption('competencies.report.analysis') : '')}
    <ul class="analysis">${lines.map((line) => `<li dir="auto">${e(line)}</li>`).join('')}</ul></div>`;
}

function page(report: FollowUp, options: FollowUpPrintOptions, images: { logo: string; ministry: string }, preview: boolean) {
  const { t, caption } = options;
  const title = `${t('competencies.report.title')} : ${options.subjectName} - ${options.examLabel} - ${options.termLabel}`;
  const context = [options.subjectName, options.examLabel, options.termLabel];
  const table = (markup: string, label: string) => preview
    ? `<div class="table-scroll" tabindex="0" role="region" aria-label="${e(label)}">${markup}</div>` : markup;
  const info = (label: string, value: string, tone = '') => `<div class="${tone}"><dt>${e(label)}</dt><dd><bdi>${e(value)}</bdi></dd></div>`;
  return `<section class="sheet">
    <header class="head">
      <div class="emblem">${images.ministry ? `<img src="${e(images.ministry)}" alt="">` : ''}</div>
      <div class="title"><h1>${e(preview ? t('competencies.report.title') : title)}</h1>${preview ? `<p class="context">${context.map((value) => `<bdi>${e(value)}</bdi>`).join(' · ')}</p>` : ''}<p>${e(t('competencies.report.year'))} ${num(options.yearLabel)}</p></div>
      <div class="emblem">${images.logo ? `<img src="${e(images.logo)}" alt="">` : `<b>${e(options.school.name)}</b>`}</div>
    </header>
    <dl class="info">
      ${info(t('competencies.report.pupilName'), report.student.name, 'name')}
      ${info(t('competencies.report.code'), report.student.studentCode)}
      ${info(t('competencies.report.class'), `${options.className} - ${options.levelLabel}`)}
      ${options.teacherName ? info(t('competencies.report.teacher'), options.teacherName) : ''}
    </dl>
    <div class="cards">${profile(report, options.maxMark, t, caption, preview)}${indicators(report, options)}${scale(report, t)}</div>
    <div class="panel">${titled(1, t('competencies.report.marks'), caption ? `${caption('competencies.report.marks')} · /${options.maxMark}` : '')}${table(marks(report, options), t('competencies.report.marks'))}</div>
    <div class="panel">${titled(2, t('competencies.report.competencies'), caption ? `${caption('competencies.report.competencies')} · ${caption('competencies.report.competenciesCaption')}` : t('competencies.report.competenciesCaption'))}${table(competencies(report, options), t('competencies.report.competencies'))}</div>
    ${analysis(options.analysisOf(report), t, caption)}
    <div class="notes">
      <div class="panel">${titled(4, t('competencies.report.remark'), caption ? caption('competencies.report.remark') : '')}<p class="remark" dir="auto">${report.remark ? e(report.remark) : ''}</p>${report.remark ? '' : '<i class="line"></i><i class="line"></i><i class="line"></i>'}</div>
      <div class="panel">${titled(5, t('competencies.report.inspector'), caption ? caption('competencies.report.inspector') : '')}<i class="line"></i><i class="line"></i><i class="line"></i></div>
    </div>
  </section>`;
}

// The preview reflows in its frame and keeps the two wider tables independently scrollable.
const PREVIEW_STYLES = `
  html{overflow:hidden}
  body{background:#fff;font:14px/1.45 MassarLatin,MassarArabic,system-ui,sans-serif}
  .sheet{width:100%;min-height:0;margin:0;padding:clamp(12px,3vw,30px);gap:14px;box-shadow:none;overflow-wrap:anywhere}
  .head{grid-template-columns:clamp(36px,10vw,96px) minmax(0,1fr) clamp(36px,10vw,96px);gap:8px;padding-bottom:14px;border-bottom:1px solid #e2e8f0}
  .emblem img{max-width:100%;max-height:64px}
  .title h1{font-size:clamp(18px,3vw,28px);line-height:1.2}
  .title p{margin:4px 0 0;font-size:12px;line-height:1.4}
  .title .context{font-size:14px;color:#334155}
  .info{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,160px),1fr));gap:8px}
  .info div{display:grid;align-content:start;gap:2px;padding:8px 10px;border-radius:8px}
  .info dt{font-size:12px}.info dt::after{content:none}
  .info dd,.info .name dd{font-size:15px;white-space:normal}
  .cards{grid-template-columns:minmax(0,1fr) minmax(0,1.4fr) minmax(0,1fr);gap:10px}
  .card,.panel{min-width:0;padding:12px;border-radius:10px;gap:8px}
  .card-title,.section-title{flex-wrap:wrap;align-items:center;gap:4px 8px}
  .card-title h4,.section-title h3{font-size:16px}
  .card-title small,.section-title small{color:#64748b;font-size:11px}
  .radar{max-height:160px}.radar text{font-size:11px}
  .bar-row,.legend,.scale li{font-size:12px}.legend{flex-wrap:wrap;gap:4px 12px}
  .tile{min-height:54px;padding:5px}.tile b{font-size:18px}.tile>span{font-size:11px}
  .scale small,.scale b{font-size:11px}.scale small{color:#64748b}
  .table-scroll{overflow-x:auto;outline-offset:-2px}
  .table-scroll:focus-visible{outline:2px solid #2563eb}
  .marks th.label{width:8rem}.marks th,.marks td{min-width:4.5rem}
  .marks td{font-size:14px}.marks td.grade{font:12px/1.45 MassarLatin,MassarArabic,sans-serif}
  .competencies{min-width:40rem}
  .competencies th.domain{width:7rem}.competencies td.name{min-width:8rem}
  th,td,.competencies td{padding:5px 8px}
  thead th,.competencies td.name,.competencies td.current,.competencies td.share,.competencies th.domain{font-size:12px}
  .analysis,.remark{font-size:14px;line-height:1.5}
  .notes{margin-top:0;gap:10px}
  @media(max-width:700px){.cards{grid-template-columns:minmax(0,1fr)}}
  @media(max-width:480px){
    .sheet{gap:10px}.card,.panel{padding:10px}
    .info{grid-template-columns:repeat(2,minmax(0,1fr))}.info .name:nth-last-child(3){grid-column:1/-1}
    .notes{grid-template-columns:minmax(0,1fr)}
  }
`;

/**
 * تقرير التتبع on A4, one page per pupil, as the teacher hands it to the
 * inspector after a Massar Contrôle: the Ministry's emblem and the school's
 * logo around the title, the pupil, their profile on the Contrôle's parts
 * beside the class's, the mastery indicators, the acquisition scale, the
 * marks part by part against the class, the competencies month by month up
 * to the Contrôle, the teacher's remark and a box for the inspector's.
 */
export function buildFollowUpDocument(reports: readonly FollowUp[], options: FollowUpPrintOptions, mode: 'print' | 'preview' = 'print'): string {
  const preview = mode === 'preview';
  const origin = options.assetOrigin;
  const images = { logo: safeUrl(options.school.logo, origin), ministry: safeUrl('/images/massar/ministry.png', origin) };
  return `<!doctype html><html lang="${e(options.language)}" dir="${options.dir}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(options.t('competencies.report.title'))}</title><style>
    ${massarFontFaces(origin)}
    *{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}html{color-scheme:light}
    body{margin:0;background:#e9edf2;color:#1f2a3a;font:8.5pt/1.3 MassarArabic,MassarLatin,serif}
    .sheet{display:flex;flex-direction:column;gap:1.8mm;width:210mm;min-height:297mm;margin:0 auto 6mm;padding:6mm 8mm;background:#fff;box-shadow:0 2px 9px #0001}
    .head{display:grid;grid-template-columns:30mm 1fr 30mm;align-items:center;gap:3mm}
    .emblem{display:flex;justify-content:center}.emblem img{max-width:26mm;max-height:16mm;object-fit:contain}.emblem b{font-size:9pt;text-align:center}
    .title{text-align:center}.title h1{margin:0;font-size:14pt;font-weight:700}.title p{margin:1mm 0 0;font:9.5pt MassarLatin,MassarArabic,sans-serif;color:#64748b}
    .info{display:flex;flex-wrap:wrap;gap:2mm;margin:0}.info div{display:flex;align-items:baseline;gap:1.5mm;flex:1 1 auto;padding:1.6mm 2.5mm;border:.6pt solid #cfd8e3;border-radius:1.5mm}
    .info dt{color:#64748b;font-size:7.5pt}.info dt::after{content:" :"}.info dd{margin:0;font-weight:700;font-size:9.5pt;white-space:nowrap}
    .info .name{background:#ecfdf5;border-color:#a7f3d0}.info .name dd{color:#047857;font-size:11pt}
    .cards{display:grid;grid-template-columns:1fr 1.25fr .95fr;gap:2.2mm}
    .card,.panel{border:.6pt solid #cfd8e3;border-radius:2mm;padding:2mm 2.4mm;background:#fff}
    .card{display:flex;flex-direction:column;gap:1.5mm}
    .card-title,.section-title{display:flex;justify-content:space-between;align-items:baseline;gap:2mm}
    .card-title h4{margin:0;font-size:9.5pt}.card-title small,.section-title small{font:7pt MassarLatin,sans-serif;color:#94a3b8}
    .radar{width:100%;height:auto;max-height:34mm}.radar text{font-size:8.5px;fill:#334155}
    .legend{display:flex;justify-content:center;gap:4mm;font-size:7pt;color:#475569}.legend span{display:inline-flex;align-items:center;gap:1mm}
    .legend i{display:inline-block;width:4mm;height:.8mm}.legend .dashed i{height:0;border-top:.8mm dashed;background:none}
    .bar-row{display:grid;grid-template-columns:1fr 2fr auto;align-items:center;gap:1.5mm;font-size:7.5pt}.bar{position:relative;height:2.5mm;background:#eef2f6;border-radius:1mm}
    .bar b{display:block;height:100%;border-radius:1mm}.bar i{position:absolute;top:-.6mm;bottom:-.6mm;border-inline-start:.6mm dashed}
    .tiles{display:grid;grid-template-columns:repeat(3,1fr);gap:1.5mm}
    .tile{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.3mm;min-height:10.5mm;padding:1mm;border:.5pt solid #e2e8f0;border-radius:1.5mm;text-align:center}
    .tile b{font:700 12pt MassarLatin,sans-serif;color:#1f2a3a}.tile b small{font-size:7.5pt;color:#64748b;font-weight:400}.tile>span{font-size:6.8pt;line-height:1.2;color:#475569}
    .tile.accent{background:#fef2f2;border-color:#fecaca}.tile.accent b{color:#be123c}.tile.bad b{color:#be123c}.tile.good b{color:#15803d}.tile.level b{color:#c2410c}
    .stack{display:flex;height:2mm;border-radius:1mm;overflow:hidden;background:#eef2f6}.stack i{display:block;height:100%}
    .scale{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:1.4mm}.scale li{display:grid;grid-template-columns:auto 1fr auto auto;align-items:center;gap:1.5mm;font-size:8pt}
    .scale small{color:#94a3b8;font:7pt MassarLatin,sans-serif}.scale b{min-width:4mm;text-align:center;font:700 8.5pt MassarLatin,sans-serif;color:#475569}
    .badge{display:inline-flex;align-items:center;justify-content:center;min-width:4.4mm;height:3.6mm;padding:0 1mm;border-radius:1mm;color:#fff;font:700 7.5pt MassarLatin,sans-serif}
    .badge.none{background:#fff;color:#94a3b8;border:.5pt dashed #cbd5e1}
    .panel{display:flex;flex-direction:column;gap:1.5mm}
    .section-title h3{display:flex;align-items:center;gap:1.5mm;margin:0;font-size:10.5pt}.n{display:inline-flex;align-items:center;justify-content:center;width:4.6mm;height:4.6mm;border-radius:1mm;background:#fee2e2;color:#be123c;font:700 8pt MassarLatin,sans-serif}
    table{width:100%;border-collapse:collapse}th,td{border:.4pt solid #e2e8f0;padding:.9mm 1mm;text-align:center;vertical-align:middle}
    thead th{background:#fff1f2;font-size:7.8pt;font-weight:700;color:#475569}
    .marks th.label{text-align:start;width:22mm;background:#f8fafc}.marks td{font:9.5pt MassarLatin,MassarArabic,sans-serif}
    .marks .total{background:#fdf2f8}.marks thead .total{background:#e11d48;color:#fff}.marks tr.soft td,.marks tr.soft th{color:#64748b}
    .marks td.grade{font:7.5pt MassarArabic,serif;color:#64748b}.marks td.total.grade b{color:#c2410c}
    .up{color:#15803d}.down{color:#be123c}.muted{color:#94a3b8}
    .competencies td{padding:.3mm .8mm}.competencies td.name{text-align:start;font-size:8pt}
    .competencies th.domain{width:21mm;background:#fff;font-size:9pt;vertical-align:middle}.competencies th.domain>span{display:block;margin-bottom:1mm}
    .domain-score{display:flex;justify-content:center;align-items:center;gap:1mm}.domain-score small{font:7pt MassarLatin,sans-serif;color:#be123c}
    .pill{display:inline-block;padding:.3mm 1.4mm;border-radius:1mm;background:#2563eb;color:#fff;font:700 7.5pt MassarLatin,sans-serif}
    .competencies th.now{background:#e11d48;color:#fff}.competencies td.now{background:#fff7ed}
    .competencies td.current{font-size:7.6pt;font-weight:700;white-space:nowrap}.competencies td.share{font:700 7.8pt MassarLatin,sans-serif}
    .competencies tr.first td,.competencies tr.first th{border-top:.9pt solid #94a3b8}
    .analysis{margin:0;padding-inline-start:4mm;display:flex;flex-direction:column;gap:.2mm;font-size:8.2pt;line-height:1.35}
    .notes{display:grid;grid-template-columns:1fr 1fr;gap:2.2mm;margin-top:auto}
    .remark{margin:0;white-space:pre-line;font-size:9pt;line-height:1.45}
    .line{display:block;height:4.6mm;border-bottom:.5pt dotted #94a3b8}
    @page{size:A4 portrait;margin:0}
    @media print{body{background:#fff}.sheet{margin:0;box-shadow:none;break-after:page}.sheet:last-child{break-after:auto}}
    ${preview ? PREVIEW_STYLES : ''}
  </style></head><body>${reports.map((report) => page(report, options, images, preview)).join('')}</body></html>`;
}
