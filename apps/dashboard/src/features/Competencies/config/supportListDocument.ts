import { COMPETENCY_LEVEL_VALUES, type CompetencyLevel } from '@sms/contracts';
import { escapeHtml as e, massarFontFaces, safeUrl } from '@/features/Massar/config/massarDocument';
import { LEVEL_RANK } from './competencyLevels';
import { supportList, type ClassReport, type SupportPupil } from './classReport';
import { captionOf, CLASS_LEVEL_COLOR, header, info, level, SHEET_STYLES, type ClassReportPrintOptions } from './classReportDocument';
import { num, titled } from './followUpDocument';
import { formatNumber, SUPPORT_RANK } from './followUpReport';

/** How many of the pupils who need it most the list keeps until the teacher changes it: one support group. */
export const SUPPORT_LIST_SIZE = 6;

/** Past this many competency columns the list turns to landscape, so the actions column keeps room to write. */
const PORTRAIT_SKILLS = 13;

/**
 * لائحة الدعم: the pupils at Début or less on at least one competency after
 * a Massar Contrôle, in three parts: their marks on the Contrôle; their level
 * on each competency some pupil needs support in (the weak ones coloured),
 * with room for the teacher's support actions; and the same pupils grouped by
 * competency so a session can be planned for each. Both tables list the
 * pupils in the same order. A group larger than the pupils needing support is
 * made up with the next weakest, at En cours, their level-3 cells in grey. Read from the class report, so its figures agree
 * with the class table's.
 */
export function buildSupportListDocument(report: ClassReport, options: ClassReportPrintOptions, most?: number | null): string {
  const { t, maxMark } = options;
  const origin = options.assetOrigin;
  const images = { logo: safeUrl(options.school.logo, origin), ministry: safeUrl('/images/massar/ministry.png', origin) };
  const everyone = supportList(report);
  // The teacher's group size: the pupils most in need, or made up with the next weakest at En cours.
  const pupils = supportList(report, most);
  const added = pupils.filter((pupil) => pupil.added).length;
  const weakOn = (pupil: SupportPupil, id: string) => { const value = pupil.levels[id]; return !!value && LEVEL_RANK[value] <= SUPPORT_RANK; };
  const inGroup = (pupil: SupportPupil, id: string) => weakOn(pupil, id) || (pupil.added && pupil.levels[id] === 'in_progress');
  // Each competency's group: the pupils kept at Début or less on it, and those added at En cours.
  const domains = report.domains.map((domain) => ({
    ...domain,
    skills: domain.skills.map((skill) => ({
      ...skill,
      members: pupils.filter((pupil) => inGroup(pupil, skill.id)),
      weak: pupils.filter((pupil) => weakOn(pupil, skill.id)).length,
    })).filter((skill) => skill.members.length),
  })).filter((domain) => domain.skills.length);
  const skills = domains.flatMap((domain) => domain.skills);
  // A Contrôle of several parts shows each part's mark before the total.
  const first = pupils[0]?.report;
  const parts = first && first.parts.length > 1 ? first.parts : [];
  // A Contrôle of one part (Maths, HG, EDI…) needs no table of its own: its mark opens the competencies table.
  const merged = !parts.length;
  const landscape = skills.length > PORTRAIT_SKILLS;

  const half = maxMark / 2;
  const mark = (value: number | null, absent: boolean, strong = false) => {
    if (value == null) return absent ? `<span class="muted">${e(t('competencies.report.absent'))}</span>` : '<span class="muted">–</span>';
    const text = num(formatNumber(value));
    return `<span class="${value < half ? 'down' : ''}">${strong ? `<b>${text}</b>` : text}</span>`;
  };
  const cell = (value: CompetencyLevel | null | undefined, extra: boolean) => {
    if (!value) return '<td class="cell"><span class="muted">–</span></td>';
    if (LEVEL_RANK[value] <= SUPPORT_RANK) return `<td class="cell weak">${level(value)}</td>`;
    // A pupil added to make up the group: their En cours levels are what the sessions work on.
    if (extra && value === 'in_progress') return `<td class="cell soft">${level(value)}</td>`;
    return `<td class="cell"><span class="ok">${num(LEVEL_RANK[value])}</span></td>`;
  };
  const pupilCells = (name: string, index: number) => `<td class="no">${num(index + 1)}</td><td class="pupil"><bdi>${e(name)}</bdi></td>`;
  const pupilHead = (rows: number) => `<th rowspan="${rows}" class="no">${e(t('competencies.supportList.no'))}</th>
        <th rowspan="${rows}" class="pupil">${e(t('competencies.classReport.pupil'))}</th>`;

  const classMean = (value: number | null) => (value == null ? '' : num(formatNumber(value)));
  const markHead = (rows: number) => `<th rowspan="${rows}" class="total">${e(t('competencies.classReport.mark'))}<small> /${e(maxMark)}</small></th>
        <th rowspan="${rows}" class="grade">${e(t('competencies.report.appreciation'))}</th>`;
  const markCells = (pupil: SupportPupil['report']) => {
    const absent = pupil.average == null && pupil.parts.some((part) => part.absent);
    return `<td class="mark total">${mark(pupil.average, absent, true)}</td>
          <td class="grade">${pupil.appreciation ? e(t(`competencies.report.appreciations.${pupil.appreciation}`)) : ''}</td>`;
  };

  // 1. The Contrôle's marks, each part's then the total, over the class's means.
  const marks = pupils.length && !merged ? `<table class="list marks">
      <thead><tr>
        ${pupilHead(1)}
        ${parts.map((part) => `<th class="part">${e(part.name)}</th>`).join('')}
        ${markHead(1)}
      </tr></thead>
      <tbody>${pupils.map(({ report: pupil }, index) => `<tr>
          ${pupilCells(pupil.student.name, index)}
          ${parts.map((part) => {
    const own = pupil.parts.find((item) => item.code === part.code);
    return `<td class="mark">${mark(own?.mark ?? null, own?.absent ?? false)}</td>`;
  }).join('')}
          ${markCells(pupil)}
        </tr>`).join('')}</tbody>
      <tfoot><tr>
        <th colspan="2" class="label">${e(t('competencies.report.classAverage'))}</th>
        ${parts.map((part) => `<td>${classMean(part.classAverage)}</td>`).join('')}
        <td class="total"><b>${classMean(first?.classAverage ?? null)}</b></td><td></td>
      </tr></tfoot>
    </table>` : '';

  // 2. The competencies to support, with room for what the teacher plans; after a one-part Contrôle, its mark first.
  const vertical = (text: string) => `<th class="v" title="${e(text)}"><div>${e(text)}</div></th>`;
  const table = pupils.length ? `<table class="list levels">
      <thead><tr>
        ${pupilHead(2)}
        ${merged ? markHead(2) : ''}
        ${domains.map((domain) => `<th colspan="${domain.skills.length}" class="group-head">${e(domain.name)}</th>`).join('')}
        <th rowspan="2" class="count">${e(t('competencies.supportList.count'))}</th>
        <th rowspan="2" class="actions">${e(t('competencies.supportList.actions'))}</th>
      </tr><tr>${skills.map((skill) => vertical(skill.name)).join('')}</tr></thead>
      <tbody>${pupils.map(({ report: pupil, levels, skills: weak, added: extra }, index) => `<tr${extra ? ' class="added"' : ''}>
          ${pupilCells(pupil.student.name, index)}
          ${merged ? markCells(pupil) : ''}
          ${skills.map((skill) => cell(levels[skill.id], extra)).join('')}
          <td class="count"><span dir="ltr"><b>${e(weak.length)}</b><small>/${e(skills.length)}</small></span></td>
          <td class="actions"></td>
        </tr>`).join('')}</tbody>
      <tfoot>${merged ? `<tr>
        <th colspan="2" class="label">${e(t('competencies.report.classAverage'))}</th>
        <td class="total"><b>${classMean(first?.classAverage ?? null)}</b></td><td></td>
        <td colspan="${skills.length + 2}"></td>
      </tr>` : ''}<tr>
        <th colspan="${merged ? 4 : 2}" class="label">${e(t('competencies.classReport.supportRow'))}</th>
        ${skills.map((skill) => `<td><b class="down">${num(skill.weak)}</b></td>`).join('')}
        <td></td><td></td>
      </tr></tfoot>
    </table>` : `<p class="none">${e(t('competencies.supportList.none'))}</p>`;

  const groups = skills.length ? `<div class="groups">${[...skills].sort((a, b) => b.members.length - a.members.length || (a.current ?? 5) - (b.current ?? 5))
    .map((skill) => `<div class="group">
      <h4><span>${e(skill.name)}</span><b>${num(skill.members.length)}</b></h4>
      <p>${skill.members
      // Weakest first: Non acquis, then Début, then those added at En cours, each in the list's order.
      .map((pupil) => ({ pupil, value: pupil.levels[skill.id] }))
      .sort((a, b) => (a.value ? LEVEL_RANK[a.value] : 0) - (b.value ? LEVEL_RANK[b.value] : 0))
      .map(({ pupil, value }) => `<span class="who"${value ? ` style="border-inline-start-color:${CLASS_LEVEL_COLOR[value].bg}"` : ''}><bdi>${e(pupil.report.student.name)}</bdi></span>`)
      .join('')}</p>
    </div>`).join('')}</div>` : '';

  const scale = [...COMPETENCY_LEVEL_VALUES].reverse().filter((value) => LEVEL_RANK[value] <= SUPPORT_RANK || (added > 0 && value === 'in_progress'))
    .map((value) => `<span>${level(value)}${e(t(`competencies.levels.${value}`))}</span>`).join('');

  return `<!doctype html><html lang="${e(options.language)}" dir="${options.dir}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(t('competencies.supportList.title'))}</title><style>
    ${massarFontFaces(origin)}
    ${SHEET_STYLES}
    .sheet{gap:2.4mm}
    .landscape .sheet{width:297mm;min-height:210mm}
    .section-title{display:flex;justify-content:space-between;align-items:baseline;gap:2mm}
    .section-title h3{display:flex;align-items:center;gap:1.5mm;margin:0;font-size:10pt}.section-title small{font:7pt MassarLatin,MassarArabic,sans-serif;color:#94a3b8}
    .n{display:inline-flex;align-items:center;justify-content:center;width:4.6mm;height:4.6mm;border-radius:1mm;background:#fee2e2;color:#be123c;font:700 8pt MassarLatin,sans-serif}
    .summary{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:1mm 3mm;margin:0;padding:1.4mm 2.5mm;border-radius:1.5mm;background:#fff1f2;font-size:8.5pt}
    .summary .scale{display:flex;flex-wrap:wrap;gap:1mm 3mm;font-size:7.4pt;color:#475569}.summary .scale span{display:inline-flex;align-items:center;gap:1mm}
    .lv{display:inline-flex;align-items:center;justify-content:center;flex:none;width:4mm;height:4mm;line-height:1}
    .down{color:#be123c}.muted{color:#94a3b8}.ok{color:#64748b;font-size:7pt}
    table{width:100%;border-collapse:collapse}th,td{border:.5pt solid #cfd8e3;padding:.6mm .8mm;text-align:center;vertical-align:middle}
    .list thead th{background:#fff1f2;font-size:7.4pt;font-weight:700;color:#475569}
    .list th.group-head{font-size:7.2pt;line-height:1.15;padding:.8mm}
    .list th.v{width:7.4mm;padding:.8mm .2mm;vertical-align:bottom}
    .list th.v div{writing-mode:vertical-rl;text-orientation:sideways;transform:rotate(180deg);max-height:27mm;margin:auto;font:600 7pt/1.1 MassarLatin,MassarArabic,sans-serif;text-align:start;overflow:hidden}
    .list thead th small{font-weight:400;color:#94a3b8}
    .list td{height:6.8mm;font:8pt/1.2 MassarLatin,MassarArabic,sans-serif}
    .list .no{width:6mm;color:#64748b}
    .list .pupil{width:40mm}.list td.pupil{text-align:start;white-space:nowrap;font:700 8.4pt MassarArabic,MassarLatin,serif}
    .marks td{height:5.6mm}.list .total{background:#fef2f2}.list .grade{width:24mm}.list td.grade{font:7.6pt MassarArabic,MassarLatin,serif;color:#475569}.levels .total{width:12mm}
    .list td.mark{white-space:nowrap}
    .list td.cell{padding:.3mm}.list td.weak{background:#fff7ed}.list td.soft{background:#f5f5f4}
    .list .count{width:9mm;white-space:nowrap}.list .count small{color:#94a3b8;font-size:6.6pt}
    .list .actions{width:${landscape ? 60 : 42}mm}
    .list tbody tr{break-inside:avoid}.list tbody tr:nth-child(even) td:not(.weak):not(.soft):not(.actions):not(.total){background:#fbfcfe}
    .list tfoot th.label{text-align:start;background:#f8fafc;font-size:7.4pt;font-weight:600}.list tfoot td{height:auto;font-size:7.6pt}
    .list tfoot tr:first-child>*{border-top:.9pt solid #94a3b8}
    .groups{display:grid;grid-template-columns:repeat(${landscape ? 4 : 3},1fr);gap:1.8mm}
    .group{border:.6pt solid #cfd8e3;border-radius:2mm;padding:1.2mm 1.8mm;break-inside:avoid}
    .group h4{display:flex;justify-content:space-between;align-items:baseline;gap:2mm;margin:0 0 1mm;padding-bottom:.8mm;border-bottom:.4pt dotted #cbd5e1;font:700 8pt MassarLatin,MassarArabic,sans-serif}.group h4 b{color:#be123c}
    .group p{display:flex;flex-wrap:wrap;gap:.8mm 1.2mm;margin:0;font:7.6pt/1.3 MassarArabic,MassarLatin,serif}
    .group .who{display:inline-flex;align-items:center;padding:.3mm 1.4mm;border:.4pt solid #e2e8f0;border-inline-start:1.2mm solid #cbd5e1;border-radius:1.2mm;background:#f8fafc;white-space:nowrap}
    .none{margin:0;padding:3mm;border:.6pt dashed #cbd5e1;border-radius:2mm;text-align:center;color:#64748b}
    .foot{margin-top:auto;font-size:6.8pt;color:#94a3b8;text-align:end}
    /* The sheet keeps its own margins, on every page, whatever the dialog's Margins. */
    @page{size:A4 ${landscape ? 'landscape' : 'portrait'};margin:0}
    @media print{
      body{background:#fff}
      .sheet,.landscape .sheet{width:auto;min-height:0;margin:0;box-shadow:none;-webkit-box-decoration-break:clone;box-decoration-break:clone}
      .list thead{display:table-header-group}.list tfoot{display:table-row-group}
    }
  </style></head><body class="${landscape ? 'landscape' : 'portrait'}"><section class="sheet">
    ${header(options, images, 'competencies.supportList.title')}
    ${info(report, options)}
    <p class="summary"><span><b>${e(t('competencies.supportList.summary', { count: everyone.length, total: report.pupils }))}</b>${pupils.length < everyone.length
    ? ` · <span class="down">${e(t('competencies.supportList.limited', { count: pupils.length }))}</span>` : ''}${added
    ? ` · <span class="muted">${e(t('competencies.supportList.completed', { count: added }))}</span>` : ''}</span><span class="scale">${scale}</span></p>
    ${marks ? `${titled(1, t('competencies.supportList.marks'), captionOf(options, 'competencies.supportList.marks'))}${marks}` : ''}
    ${titled(marks ? 2 : 1, t('competencies.supportList.byPupil'), captionOf(options, 'competencies.supportList.byPupil'))}
    ${table}
    ${groups ? `${titled(marks ? 3 : 2, t('competencies.supportList.bySkill'), captionOf(options, 'competencies.supportList.bySkill'))}${groups}` : ''}
    <footer class="foot">${e(t('competencies.classReport.generated'))}</footer>
  </section></body></html>`;
}
