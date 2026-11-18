import { COMPETENCY_LEVEL_VALUES, type CompetencyLevel, type MassarRound } from '@sms/contracts';
import { escapeHtml as e, massarFontFaces, safeUrl } from '@/features/Massar/config/massarDocument';
import { LEVEL_RANK, monthLabel } from './competencyLevels';
import { formatNumber, isRoomy, levelShare, profileAxes, radar, reportLevel, signed, strengthsAndNeeds, type Appreciation, type CompetencyLine, type FollowUp, type Standing } from './followUpReport';

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
  /** Massar's class and level, with the Contrôle and semester in the report's language. */
  className: string;
  levelLabel: string;
  examLabel: string;
  termLabel: string;
  yearLabel: string;
  teacherName: string | null;
  maxMark: number;
  /** The analysis printed for a pupil, one sentence a line: generated, or as the teacher edited it. */
  analysisOf: (report: FollowUp) => string;
  /** Leave a mount point for the editor inside the report preview. */
  editableAnalysis?: boolean;
  /** What helps the pupil on a competency to improve, in the remark book's words; none when left out. */
  needOf?: (report: FollowUp, competencyName: string, level: CompetencyLevel | null) => string;
};

export function followUpRoundLabels(round: Pick<MassarRound, 'exam' | 'term' | 'examLabel' | 'termLabel'>, language: string, t: Translate) {
  if (language === 'ar') return { examLabel: round.examLabel, termLabel: round.termLabel };
  return {
    examLabel: round.exam === 4 ? t('massar.flow.activities') : t('massar.flow.controlNumber', { exam: round.exam }),
    termLabel: t('massar.flow.semester', { term: round.term }),
  };
}

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

/** A radar label in lines of about 16 characters, words kept whole, three lines at most. */
export function wrapLabel(name: string, width = 16, most = 3) {
  const lines: string[] = [];
  for (const word of name.trim().split(/\s+/)) {
    const last = lines.at(-1);
    if (last != null && (last + ' ' + word).length <= width) lines[lines.length - 1] = `${last} ${word}`;
    else lines.push(word);
  }
  if (lines.length <= most) return lines;
  return [...lines.slice(0, most - 1), `${lines.slice(most - 1).join(' ').slice(0, width - 1)}…`];
}

function profile(report: FollowUp, max: number, t: Translate, caption: Translate | null, preview: boolean, roomy: boolean) {
  const head = `<div class="card-title"><h4>${e(t('competencies.report.profile'))}</h4>${caption ? `<small>${e(caption('competencies.report.profile'))}</small>` : ''}</div>`;
  const legend = `<div class="legend"><span><i style="background:${SERIES.pupil}"></i>${e(t('competencies.report.profilePupil'))}</span><span class="dashed"><i style="border-color:${SERIES.group}"></i>${e(t('competencies.report.profileClass'))}</span></div>`;
  const shape = profileAxes(report, max);
  if (!shape) {
    // Fewer than three parts, and too few competencies, make no radar: a bar each, the class's average marked on it.
    const bars = report.parts.map((part) => `<div class="bar-row"><span>${e(part.name)}</span><div class="bar"><b style="width:${((part.mark ?? 0) / max) * 100}%;background:${SERIES.pupil}"></b>${part.classAverage == null ? '' : `<i style="inset-inline-start:${(part.classAverage / max) * 100}%;border-color:${SERIES.group}"></i>`}</div>${num(formatNumber(part.mark))}</div>`).join('');
    return `<div class="card">${head}${bars}${legend}</div>`;
  }
  const size = 210;
  // On levels, one ring per level (1 to 5); on marks, quarters of the maximum.
  const chart = radar(shape.axes, shape.max, size, 40, shape.kind === 'skills' ? [0.2, 0.4, 0.6, 0.8, 1] : undefined);
  // Room beside the rings for the labels: always on screen, and on a short page's wider card.
  const labelMargin = preview ? 72 : roomy ? 82 : 0;
  const viewBox = `${-labelMargin} 0 ${size + labelMargin * 2} ${size}`;
  const poly = (points: Array<{ x: number; y: number }>) => points.map((point) => `${point.x},${point.y}`).join(' ');
  const series = (points: typeof chart.pupil, color: string, pupil: boolean) => {
    const stroke = pupil ? 'stroke-width="1.8"' : 'stroke-width="1.6" stroke-dasharray="4 2"';
    const complete = points.every(point => point !== null);
    // Join only observed neighbours, including the last and first spokes. Isolated values keep their dot.
    const outline = complete
      ? `<polygon points="${poly(points)}" fill="${pupil ? color : 'none'}" fill-opacity=".22" stroke="${color}" ${stroke}/>`
      : points.map((point, index) => {
          const next = points[(index + 1) % points.length];
          return point && next ? `<line x1="${point.x}" y1="${point.y}" x2="${next.x}" y2="${next.y}" stroke="${color}" ${stroke}/>` : '';
        }).join('');
    const dots = pupil || !complete ? points.map(point => point ? `<circle cx="${point.x}" cy="${point.y}" r="2.4" fill="${color}"/>` : '').join('') : '';
    return outline + dots;
  };
  const labels = chart.axes.map((axis) => {
    const anchor = Math.abs(axis.label.x - chart.centre) < 6 ? 'middle' : axis.label.x > chart.centre ? 'start' : 'end';
    const lines = wrapLabel(axis.name);
    if (lines.length === 1) return `<text x="${axis.label.x}" y="${axis.label.y}" text-anchor="${anchor}" dominant-baseline="middle">${e(axis.name)}</text>`;
    // A competency's long name over a few short lines, centred on the spoke's end.
    const spans = lines.map((line, index) => `<tspan x="${axis.label.x}" dy="${index === 0 ? -((lines.length - 1) * 0.55) : 1.1}em">${e(line)}</tspan>`).join('');
    return `<text x="${axis.label.x}" y="${axis.label.y}" text-anchor="${anchor}" dominant-baseline="middle">${spans}</text>`;
  }).join('');
  return `<div class="card">${head}
    <svg class="radar" viewBox="${viewBox}" role="img" aria-label="${e(t('competencies.report.profile'))}">
      ${chart.rings.map((ring) => `<polygon points="${poly(ring)}" fill="none" stroke="#d6dde6" stroke-width=".8"/>`).join('')}
      ${chart.axes.map((axis) => `<line x1="${chart.centre}" y1="${chart.centre}" x2="${axis.end.x}" y2="${axis.end.y}" stroke="#d6dde6" stroke-width=".8"/>`).join('')}
      ${series(chart.group, SERIES.group, false)}
      ${series(chart.pupil, SERIES.pupil, true)}
      ${labels}
    </svg>${legend}</div>`;
}

function indicators(report: FollowUp, options: FollowUpPrintOptions) {
  const { t, caption, maxMark } = options;
  const { indicators: ind } = report;
  const level = ind.level == null ? null : reportLevel(ind.level);
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
      ${tile(ind.level == null ? '—' : outOf(Math.round(ind.level * 10) / 10, 5), `${level ? t(`competencies.levels.${level}`) : ''} · ${t('competencies.report.indLevel')}`, 'level')}
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
  // A single part is the subject's average itself: only the average's column is printed.
  const parts = report.parts.length > 1 ? report.parts : [];
  const absent = report.parts.length === 1 && report.parts[0].absent;
  const head = parts.map((part) => `<th>${e(part.name)}</th>`).join('');
  const classes = (...names: string[]) => { const list = names.filter(Boolean).join(' '); return list ? ` class="${list}"` : ''; };
  const markCell = (mark: number | null, absent: boolean, grade: Appreciation | null, total = '') => (mark == null
    ? (absent ? `<td${classes(total, 'muted')}>${e(t('competencies.report.absent'))}</td>` : `<td${classes(total)}></td>`)
    : `<td${classes(total)} style="color:${grade ? APPRECIATION_COLOR[grade] : 'inherit'}"><b>${num(formatNumber(mark))}</b></td>`);
  const diffCell = (diff: number | null, total = '') => (diff == null ? `<td${classes(total)}></td>`
    : `<td${classes(total, diff > 0 ? 'up' : diff < 0 ? 'down' : '')}>${num(signed(diff))}</td>`);
  const standingOf = (code: string): Standing => report.standing.parts[code] ?? { rank: null, ranked: 0, high: null, low: null };
  /** `3/28`: the rank among the pupils with a mark. */
  const rankCell = (place: Standing, total = '') => (place.rank == null ? `<td${classes(total)}></td>`
    : `<td${classes(total)}><b>${outOf(place.rank, place.ranked)}</b></td>`);
  const gradeOf = (grade: Appreciation | null) => (grade ? e(t(`competencies.report.appreciations.${grade}`)) : '');
  if (!parts.length) {
    // One part, or none: each measure is a column and the pupil's figures one row under them.
    const columns: Array<[string, string]> = [
      [options.examLabel, markCell(report.average, absent, report.appreciation, 'total')],
      [t('competencies.report.classAverage'), `<td>${num(formatNumber(report.classAverage))}</td>`],
      [t('competencies.report.classHigh'), `<td>${num(formatNumber(report.standing.total.high))}</td>`],
      [t('competencies.report.classLow'), `<td>${num(formatNumber(report.standing.total.low))}</td>`],
      [t('competencies.report.diff'), diffCell(report.diff)],
      [t('competencies.report.rank'), rankCell(report.standing.total)],
      [t('competencies.report.appreciation'), `<td class="grade"><b>${gradeOf(report.appreciation)}</b></td>`],
    ];
    return `<table class="marks flat"><thead><tr>${columns.map(([label], index) => `<th${index ? '' : ' class="total"'}>${e(label)}</th>`).join('')}</tr></thead>
      <tbody><tr>${columns.map(([, cell]) => cell).join('')}</tr></tbody></table>`;
  }
  return `<table class="marks"><thead><tr><th class="label">${e(t('competencies.report.part'))}</th>${head}<th class="total">${e(t('competencies.report.subjectAverage'))}</th></tr></thead><tbody>
    <tr><th class="label">${e(options.examLabel)}</th>${parts.map((part) => markCell(part.mark, part.absent, part.appreciation)).join('')}${markCell(report.average, absent, report.appreciation, 'total')}</tr>
    <tr class="soft"><th class="label">${e(t('competencies.report.classAverage'))}</th>${parts.map((part) => `<td>${num(formatNumber(part.classAverage))}</td>`).join('')}<td class="total">${num(formatNumber(report.classAverage))}</td></tr>
    ${(['high', 'low'] as const).map((end) => `<tr class="soft"><th class="label">${e(t(end === 'high' ? 'competencies.report.classHigh' : 'competencies.report.classLow'))}</th>${parts.map((part) => `<td>${num(formatNumber(standingOf(part.code)[end]))}</td>`).join('')}<td class="total">${num(formatNumber(report.standing.total[end]))}</td></tr>`).join('')}
    <tr><th class="label">${e(t('competencies.report.diff'))}</th>${parts.map((part) => diffCell(part.diff)).join('')}${diffCell(report.diff, 'total')}</tr>
    <tr><th class="label">${e(t('competencies.report.rank'))}</th>${parts.map((part) => rankCell(standingOf(part.code))).join('')}${rankCell(report.standing.total, 'total')}</tr>
    <tr class="soft"><th class="label">${e(t('competencies.report.appreciation'))}</th>${parts.map((part) => `<td class="grade">${gradeOf(part.appreciation)}</td>`).join('')}<td class="total grade"><b>${gradeOf(report.appreciation)}</b></td></tr>
  </tbody></table>`;
}

function competencies(report: FollowUp, options: FollowUpPrintOptions) {
  const { t, language } = options;
  const months = report.months;
  const head = months.map((month) => `<th class="${month === report.examMonth ? 'now' : ''}">${e(monthLabel(month, language))}</th>`).join('');
  const body = report.domains.map((domain) => domain.lines.map((line, index) => {
    const domainCell = index ? '' : `<th class="domain" rowspan="${domain.lines.length}">${e(domain.name)}</th>`;
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

/**
 * Points forts / Points à améliorer: the assessed competencies in two
 * columns, each to improve with what helps it. Empty before any level.
 */
function focus(report: FollowUp, options: FollowUpPrintOptions, number: number) {
  const { t, caption } = options;
  const { strengths, needs } = strengthsAndNeeds(report);
  if (!strengths.length && !needs.length) return '';
  const item = (line: CompetencyLine, note = '') => {
    const level = line.current!;
    return `<li>${badge(level)}<div><b>${e(line.name)}</b> <small style="color:${LEVEL_COLOR[level]}">${e(t(`competencies.levels.${level}`))}</small>${note ? `<p dir="auto">${e(note)}</p>` : ''}</div></li>`;
  };
  const column = (key: string, tone: string, items: string[]) =>
    `<div class="focus-col ${tone}"><h4>${e(t(key))}</h4>${items.length ? `<ul>${items.join('')}</ul>` : '<p class="muted">—</p>'}</div>`;
  return `<div class="panel">${titled(number, t('competencies.report.focus'), caption ? caption('competencies.report.focus') : '')}
    <div class="focus">
      ${column('competencies.report.strengths', 'good', strengths.map((line) => item(line)))}
      ${column('competencies.report.toImprove', 'need', needs.map((line) => item(line, options.needOf?.(report, line.name, line.current) ?? '')))}
    </div></div>`;
}

/** قراءة تحليلية: each sentence on its own line. */
function analysis(text: string, t: Translate, caption: Translate | null, editable: boolean) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!editable && !lines.length) return '';
  const captionText = caption ? caption('competencies.report.analysis') : '';
  if (!editable) {
    return `<div class="panel">${titled(3, t('competencies.report.analysis'), captionText)}
    <ul class="analysis">${lines.map((line) => `<li dir="auto">${e(line)}</li>`).join('')}</ul></div>`;
  }
  // The editor fills three slots: its save status beside the title, its
  // actions at the end of the title row, the text box under it.
  return `<div class="panel"><div class="section-title analysis-title">
      <h3><span class="n">3</span>${e(t('competencies.report.analysis'))}<span data-analysis-status></span></h3>
      <div class="analysis-end"><span data-analysis-actions></span>${captionText ? `<small>${e(captionText)}</small>` : ''}</div>
    </div><div data-analysis-editor></div></div>`;
}

function page(report: FollowUp, options: FollowUpPrintOptions, images: { logo: string; ministry: string }, preview: boolean) {
  const { t, caption } = options;
  const title = `${t('competencies.report.title')} : ${options.subjectName} - ${options.examLabel} - ${options.termLabel}`;
  const context = [options.subjectName, options.examLabel, options.termLabel];
  const table = (markup: string, label: string) => preview
    ? `<div class="table-scroll" tabindex="0" role="region" aria-label="${e(label)}">${markup}</div>` : markup;
  const info = (label: string, value: string, tone = '') => `<div class="${tone}"><dt>${e(label)}</dt><dd><bdi>${e(value)}</bdi></dd></div>`;
  // A short report fills its page: larger, with its strengths and areas to improve.
  const roomy = isRoomy(report);
  const text = options.analysisOf(report);
  const arabic = options.language === 'ar';
  const dense = report.parts.length > 1 && (report.indicators.total >= 12 || (arabic && (report.parts.length >= 4 || text.split('\n').length >= 5)));
  const strengths = roomy ? focus(report, options, 4) : '';
  const note = strengths ? 5 : 4;
  return `<section class="sheet${roomy ? ' roomy' : dense ? ' dense' : ''}">
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
    <div class="cards">${profile(report, options.maxMark, t, caption, preview, roomy)}${indicators(report, options)}${scale(report, t)}</div>
    <div class="panel">${titled(1, t('competencies.report.marks'), caption ? `${caption('competencies.report.marks')} · /${options.maxMark}` : '')}${table(marks(report, options), t('competencies.report.marks'))}</div>
    <div class="panel">${titled(2, t('competencies.report.competencies'), caption ? `${caption('competencies.report.competencies')} · ${caption('competencies.report.competenciesCaption')}` : t('competencies.report.competenciesCaption'))}${table(competencies(report, options), t('competencies.report.competencies'))}</div>
    ${analysis(text, t, caption, preview && options.editableAnalysis === true)}
    ${strengths}
    <div class="notes">
      <div class="panel">${titled(note, t('competencies.report.remark'), caption ? caption('competencies.report.remark') : '')}<p class="remark" dir="auto">${report.remark ? e(report.remark) : ''}</p>${report.remark ? '' : '<i class="line"></i><i class="line"></i><i class="line"></i>'}</div>
      <div class="panel">${titled(note + 1, t('competencies.report.inspector'), caption ? caption('competencies.report.inspector') : '')}${'<i class="line"></i>'.repeat(arabic ? 2 : 3)}</div>
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
  .radar{max-height:160px;overflow:visible}.radar text{font-size:11px}
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
  .analysis-editor{display:grid;gap:8px}
  .analysis-editor textarea{display:block;width:100%;min-height:12rem;padding:10px 12px;border:1px solid #94a3b8;border-radius:8px;background:#fff;color:inherit;font:inherit;line-height:1.6;resize:vertical}
  .analysis-editor textarea:focus-visible,.analysis-editor button:focus-visible{outline:2px solid #2563eb;outline-offset:2px}
  .analysis-title{display:flex;justify-content:space-between;align-items:center}
  .analysis-title h3{flex-wrap:wrap;row-gap:4px}
  .analysis-end{display:flex;flex-wrap:wrap;align-items:center;justify-content:flex-end;gap:6px 10px}
  .analysis-status{display:inline-flex;align-items:center;gap:4px;margin-inline-start:8px;padding:2px 8px;border-radius:999px;background:#f1f5f9;color:#64748b;font-size:11px;font-weight:400;line-height:1.5}
  .analysis-status.saved{background:#ecfdf5;color:#047857}
  .analysis-status.saving{background:#eff6ff;color:#1d4ed8}
  .analysis-status.failed{background:#fef2f2;color:#b91c1c}
  .analysis-actions{display:inline-flex;flex-wrap:wrap;gap:6px}
  .analysis-actions button{display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border:1px solid #cbd5e1;border-radius:6px;background:#fff;color:#334155;font:inherit;font-size:12px;cursor:pointer}
  .analysis-actions button:hover{background:#f1f5f9}
  .analysis-actions button:focus-visible{outline:2px solid #2563eb;outline-offset:2px}
  .analysis-actions button.retry{border-color:#fecaca;color:#b91c1c}
  .notes{margin-top:0;gap:10px}
  .focus{gap:10px}.focus-col{padding:8px 10px;border-radius:8px}.focus-col h4{font-size:14px}
  .focus-col li{font-size:13px}.focus-col li small{font-size:11px}.focus-col li p{font-size:12px}
  @media(max-width:700px){.cards,.roomy .cards{grid-template-columns:minmax(0,1fr)}.focus{grid-template-columns:minmax(0,1fr)}}
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
    .radar{width:100%;height:auto;max-height:34mm;overflow:visible}.radar text{font-size:8.5px;fill:#334155}
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
    .marks th.label:lang(ar){white-space:nowrap}
    .marks .total{background:#fdf2f8}.marks thead .total{background:#e11d48;color:#fff}.marks tr.soft td,.marks tr.soft th{color:#64748b}
    .marks td.grade{font:7.5pt MassarArabic,serif;color:#64748b}.marks td.total.grade b,.marks.flat td.grade b{color:#c2410c}
    .marks.flat th{font-weight:600;color:#475569;background:#f8fafc}.marks.flat thead th.total{background:#e11d48;color:#fff}
    .up{color:#15803d}.down{color:#be123c}.muted{color:#94a3b8}
    .competencies td{padding:.3mm .8mm}.competencies td.name{text-align:start;font-size:8pt}
    .competencies th.domain{width:21mm;background:#fff;font-size:9pt;vertical-align:middle}
    .competencies th.now{background:#e11d48;color:#fff}.competencies td.now{background:#fff7ed}
    .competencies td.current{font-size:7.6pt;font-weight:700;white-space:nowrap}.competencies td.share{font:700 7.8pt MassarLatin,sans-serif}
    .competencies tr.first td,.competencies tr.first th{border-top:.9pt solid #94a3b8}
    .analysis{margin:0;padding-inline-start:4mm;display:flex;flex-direction:column;gap:.2mm;font-size:8.2pt;line-height:1.35}
    .notes{display:grid;grid-template-columns:1fr 1fr;gap:2.2mm;margin-top:auto}
    .remark{margin:0;white-space:pre-line;font-size:9pt;line-height:1.45}
    .line{display:block;height:4.6mm;border-bottom:.5pt dotted #94a3b8}
    .focus{display:grid;grid-template-columns:1fr 1fr;gap:2.2mm}
    .focus-col{padding:1.6mm 2.2mm;border:.5pt solid;border-radius:1.5mm}
    .focus-col.good{background:#f0fdf4;border-color:#bbf7d0}.focus-col.need{background:#fff7ed;border-color:#fed7aa}
    .focus-col h4{margin:0 0 1.2mm;font-size:9pt}.focus-col.good h4{color:#15803d}.focus-col.need h4{color:#c2410c}
    .focus-col ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:1.4mm}
    .focus-col li{display:flex;align-items:flex-start;gap:1.6mm;font-size:8.6pt;line-height:1.3}.focus-col li small{font-size:7.5pt;font-weight:700}
    .focus-col li p{margin:.4mm 0 0;font-size:8pt;line-height:1.35;color:#475569}
    /* A short report: a wider profile with readable labels, roomier tables and text. */
    .roomy .cards{grid-template-columns:1.15fr 1.45fr .9fr}
    .roomy .radar{max-height:40mm}.roomy .radar text{font-size:12px}
    .roomy .marks th,.roomy .marks td{padding:1mm}
    .roomy .competencies td{padding:.5mm .8mm}.roomy .competencies td.name{font-size:9pt}
    .roomy .analysis{gap:.3mm;font-size:8.5pt}
    @page{size:A4 portrait;margin:0}
    @media print{
      body{background:#fff}.sheet{margin:0;box-shadow:none;break-after:page}.sheet:last-child{break-after:auto}
      .roomy.sheet{gap:1.2mm;padding:5mm 7mm}
      .roomy .info{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(0,1fr)}
      .roomy .info div{display:block;padding:1mm 2mm}.roomy .info dt::after{content:none}.roomy .info dd{white-space:normal}
      .roomy .panel{gap:1mm;padding:1.5mm 2mm}.roomy .line{height:3.5mm}
      .roomy .focus-col ul{gap:.7mm}
      .roomy .focus:has(.need li:nth-child(4)){grid-template-columns:1fr 3fr}
      .roomy .need ul:has(li:nth-child(4)){display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:2mm}
      .dense{padding:4mm 6mm;gap:1mm;line-height:1.15}.dense:lang(fr){font-family:MassarLatin,MassarArabic,sans-serif}
      .dense .card,.dense .panel{min-width:0;padding:1.2mm 1.6mm;gap:.7mm}
      .dense .marks th,.dense .marks td{padding:.45mm .6mm;overflow-wrap:anywhere;line-height:1.12}
      .dense .marks th.label{width:23mm}.dense:lang(fr) .marks td.grade{font:7.5pt/1.1 MassarLatin,MassarArabic,sans-serif}
      .dense .competencies th,.dense .competencies td{padding:.2mm .6mm;line-height:1.12}
      .dense .line{height:3.5mm}.dense .analysis{line-height:1.18}
      .dense:lang(ar) .notes{break-inside:avoid;min-height:17mm;grid-template-columns:minmax(0,3fr) minmax(0,2fr)}
      .dense:lang(ar) .notes .line{height:4.5mm}.dense:lang(ar) .remark{overflow-wrap:anywhere}
      /* Taller table rows use the spare A4 height; the observations follow the analysis at the usual gap. */
      .sheet:lang(ar):not(.roomy){
        gap:2mm;
        & > .notes{margin-top:0}
        & > .panel:has(>table:not(.flat)){display:grid;grid-template-rows:auto minmax(min-content,1fr);flex-grow:1}
        & > .panel:has(>.competencies){flex-grow:1.4}
        & .radar{max-height:42mm}
        & .radar text{font-size:10px}
        & .analysis{font-size:9.5pt;line-height:1.4;gap:.5mm}
        & .competencies td.name,& .competencies td.current{font-size:9pt}
        & thead th{font-size:8.5pt}
        & .marks td{font-size:10pt}
        & .marks td.grade{font-size:8pt}
      }
    }
    ${preview ? PREVIEW_STYLES : ''}
  </style></head><body>${reports.map((report) => page(report, options, images, preview)).join('')}</body></html>`;
}
