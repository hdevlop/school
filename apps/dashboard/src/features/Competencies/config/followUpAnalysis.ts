import { foldSubjectName } from '@sms/contracts';
import { LEVEL_RANK } from './competencyLevels';
import { agree, skillNeed, type RemarkGender, type RemarkLanguage } from './competencyRemarks';
import { formatNumber, reportLevel, type CompetencyLine, type FollowUp, type PartRow } from './followUpReport';

/**
 * قراءة تحليلية: the marks of a Massar Contrôle set against the competencies
 * they test, in sentences. Each part of the grid is linked to the
 * competencies of the same name, else to the domain of that name, else
 * through the table below; both sides become percentages and are compared.
 * Rules, not a model: the same marks and levels always give the same text,
 * and every sentence says why. Arabic first: the school's Arabic grids.
 */

/** All targets of a component when the catalog uses different names. */
const PART_LINKS = new Map(Object.entries({
  'الاستماع والتحدث': ['التواصل الشفهي'],
  'الاستماع والتحدث والقراءة': ['التواصل الشفهي', 'القراءة'],
  'التعبير الشفهي': ['التواصل الشفهي'],
  'التطبيقات الكتابية': ['الظواهر اللغوية'],
  'الدرس اللغوي': ['الظواهر اللغوية'],
  'التراكيب والصرف والتحويل': ['الظواهر اللغوية'],
  'الإنشاء': ['التعبير الكتابي'],
  'التعبير والإنشاء': ['التعبير الكتابي'],
  'الكتابة والخط': ['الكتابة'],
}).map(([name, targets]) => [foldSubjectName(name), targets]));

/** Beyond this many points (in percent) between a mark and its level, they disagree. */
export const GAP = 15;
const LARGE_GAP = 25;
/** A part this far above or below the class average (in percent of the maximum) is said so. */
export const CLASS_GAP = 5;

export type Finding = 'strong' | 'fair' | 'weak' | 'markAbove' | 'levelAbove';
type PartLink = { part: PartRow; lines: CompetencyLine[]; rank: number };

const PHRASES = {
  ar: {
    strong: 'في مكوّن «{part}»، تنسجم النقطة ({mark}) مع المستوى الجيد المسجّل في الكفايات المرتبطة به ({level}).',
    fair: 'في مكوّن «{part}»، تنسجم النقطة ({mark}) مع مستوى الكفايات المرتبطة به ({level})، ويُستحسن مواصلة التمرّن.',
    weak: 'في مكوّن «{part}»، تشير النقطة ({mark}) ومستوى الكفايات المرتبطة به ({level}) إلى حاجة للدعم.',
    markAbove: 'في مكوّن «{part}»، جاءت نقطة الفرض ({mark}) أعلى من المستوى المسجّل في تقييم الكفايات المرتبطة به ({level}).',
    levelAbove: 'في مكوّن «{part}»، جاء المستوى المسجّل في تقييم الكفايات المرتبطة به ({level}) أعلى من نقطة الفرض ({mark}).',
    aboveClass: 'فوق معدل القسم',
    belowClass: 'دون معدل القسم',
    mark: 'بلغ معدل الفرض {mark}.',
    higher: 'بلغ معدل الفرض {mark}، وهو أعلى من معدل القسم ({classMark}) بفارق {gap}.',
    lower: 'بلغ معدل الفرض {mark}، وهو أقل من معدل القسم ({classMark}) بفارق {gap}.',
    equal: 'بلغ معدل الفرض {mark}، وهو يساوي معدل القسم.',
    undated: 'تعذّرت مقارنة نتيجة الفرض بتقييمات الكفايات لعدم توفر تاريخ للفرض ضمن السنة الدراسية.',
    noLevels: 'لم يُسجّل أي تقييم للكفايات حتى شهر الفرض (0 من أصل {total}).',
    coverage: 'بلغ عدد الكفايات المقيّمة {assessed} من أصل {total}، ومتوسط مستواها «{level}».',
    overallAgree: 'تتقارب نتيجة الفرض مع متوسط مستوى الكفايات.',
    overallMarkAbove: 'نتيجة الفرض أعلى من متوسط مستوى الكفايات.',
    overallLevelAbove: 'متوسط مستوى الكفايات أعلى من نتيجة الفرض.',
    classComparison: 'لدى تلاميذ القسم الذين توفرت لهم نقطة الفرض وتقييمات جميع الكفايات، بلغ متوسط النقط {mark} ومتوسط مستوى الكفايات {level}/5.',
    consolidate: 'كفايات تحتاج إلى تثبيت: {skills}. {practice}',
    trend: 'بمقارنة آخر تقييمين متاحين لكل كفاية، بلغ عدد الكفايات التي تحسّنت {up} والتي تراجعت {down}.',
    example: 'في «{skill}»، انتقل المستوى من «{from}» إلى «{to}».',
    priority: 'أولوية للدعم – {name}: {need}',
  },
  fr: {
    strong: 'Pour « {part} », la note ({mark}) concorde avec le bon niveau relevé dans les compétences associées ({level}).',
    fair: 'Pour « {part} », la note ({mark}) concorde avec le niveau des compétences associées ({level}). Un entraînement régulier est conseillé.',
    weak: 'Pour « {part} », la note ({mark}) et le niveau des compétences associées ({level}) indiquent un besoin de soutien.',
    markAbove: 'Pour « {part} », la note ({mark}) dépasse le niveau relevé dans les compétences associées ({level}).',
    levelAbove: 'Pour « {part} », le niveau relevé dans les compétences associées ({level}) dépasse la note ({mark}).',
    aboveClass: 'au-dessus de la moyenne de la classe',
    belowClass: 'en dessous de la moyenne de la classe',
    mark: 'La moyenne au contrôle est de {mark}.',
    higher: 'La moyenne au contrôle est de {mark}, contre {classMark} pour la classe (écart de +{gap}).',
    lower: 'La moyenne au contrôle est de {mark}, contre {classMark} pour la classe (écart de −{gap}).',
    equal: 'La moyenne au contrôle est de {mark}, à égalité avec celle de la classe.',
    undated: 'La date du contrôle est inconnue pour cette année scolaire. La comparaison avec les compétences est donc indisponible.',
    noLevels: 'Aucune compétence évaluée à la date du contrôle (0 sur {total}).',
    coverage: 'Le niveau moyen « {level} » porte sur {assessed} des {total} compétences prévues.',
    overallAgree: 'Le résultat du contrôle est proche du niveau moyen des compétences.',
    overallMarkAbove: 'Le résultat du contrôle dépasse le niveau moyen des compétences.',
    overallLevelAbove: 'Le niveau moyen des compétences dépasse le résultat du contrôle.',
    classComparison: 'Pour les élèves de la classe ayant une note et un bilan complet, la moyenne au contrôle est de {mark} et le niveau moyen des compétences de {level}/5.',
    consolidate: 'À consolider en priorité : {skills}. {practice}',
    trend: 'Entre les deux dernières évaluations disponibles pour chaque compétence, le nombre de progressions est de {up} et celui de reculs de {down}.',
    example: 'Pour « {skill} », le niveau est passé de « {from} » à « {to} ».',
    priority: 'Priorité de soutien – {name} : {need}',
  },
} as const;

const fill = (template: string, values: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match));
/** Compare a component only when every skill it covers has been assessed. */
export function linkParts(report: FollowUp): PartLink[] {
  const lines = report.domains.flatMap((domain) => domain.lines);
  const resolve = (name: string) => {
    const skills = lines.filter((item) => foldSubjectName(item.name) === name);
    return skills.length ? skills : report.domains.filter((domain) => foldSubjectName(domain.name) === name).flatMap((domain) => domain.lines);
  };
  const links: PartLink[] = [];
  for (const part of report.parts) {
    const name = foldSubjectName(part.name);
    const direct = resolve(name);
    const groups = direct.length ? [direct] : (PART_LINKS.get(name) ?? []).map((target) => resolve(foldSubjectName(target)));
    if (!groups.length || groups.some((group) => !group.length)) continue;
    const matched = [...new Set(groups.flat())];
    const ranks = matched.flatMap((line) => line.current ? [LEVEL_RANK[line.current]] : []);
    if (ranks.length !== matched.length) continue;
    links.push({ part, lines: matched, rank: ranks.reduce((sum, rank) => sum + rank, 0) / ranks.length });
  }
  return links;
}

/** A mark against a level, both in percent. */
export function classify(markShare: number, levelShare: number): Finding {
  const gap = markShare - levelShare;
  if (gap > GAP) return 'markAbove';
  if (gap < -GAP) return 'levelAbove';
  const both = (markShare + levelShare) / 2;
  return both >= 70 ? 'strong' : both < 55 ? 'weak' : 'fair';
}

/**
 * The analysis, one sentence a line: the overall verdict, each linked part,
 * the month's trend, then up to two skills to support with what helps them.
 * Empty when the pupil has neither marks nor levels.
 */
export function analyze(report: FollowUp, { maxMark, language, gender, levelLabel, priorities = true, classComparison }: {
  maxMark: number;
  language: RemarkLanguage;
  gender: RemarkGender;
  /** The level's name in the report's language. */
  levelLabel: (rank: number) => string;
  /** False when the page lists the areas to improve on its own, with what helps each. */
  priorities?: boolean;
  classComparison?: ReturnType<typeof comparableClassMean>;
}): string {
  const phrases = PHRASES[language];
  const say = (template: string, values: Record<string, string | number> = {}) => agree(fill(template, values), gender);
  const lines: string[] = [];

  const all = report.domains.flatMap((domain) => domain.lines);
  const assessed = all.filter((line) => line.current).length;
  const { level, total } = report.indicators;
  const concise = language === 'ar' && report.parts.length > 1;
  if (report.average != null) {
    const { average, classAverage, diff } = report;
    const gap = formatNumber(Math.abs(diff ?? 0));
    const template = diff === 0 ? phrases.equal : diff == null || gap === '0' ? phrases.mark : diff > 0 ? phrases.higher : phrases.lower;
    lines.push(say(template, { mark: `${formatNumber(average)}/${maxMark}`, classMark: `${formatNumber(classAverage)}/${maxMark}`, gap }));
    if (!report.examMonth && total) lines.push(phrases.undated);
    else if (total && !assessed) lines.push(say(phrases.noLevels, { total }));
  }
  if (level != null && assessed) {
    if (!concise || assessed < total || report.average == null) {
      lines.push(say(phrases.coverage, { assessed, total, level: levelLabel(level) }));
    }
    if (!concise && report.average != null && assessed === total) {
      const gap = (report.average / maxMark) * 100 - level * 20;
      const classGap = classComparison ? (classComparison.mark / maxMark) * 100 - classComparison.level * 20 : 0;
      if (Math.abs(gap) <= GAP) lines.push(phrases.overallAgree);
      else if (classComparison && Math.abs(classGap) > GAP && Math.sign(gap) === Math.sign(classGap)) {
        const format = (value: number) => value.toLocaleString(language, { maximumFractionDigits: 1 });
        lines.push(say(phrases.classComparison, { mark: `${format(classComparison.mark)}/${maxMark}`, level: format(classComparison.level) }));
      } else if (Math.abs(gap) > LARGE_GAP) {
        lines.push(gap > 0 ? phrases.overallMarkAbove : phrases.overallLevelAbove);
      }
    }
  }

  let links = linkParts(report);
  if (concise) {
    // First look for a mismatch between the two assessments, then for a difference from the class.
    const marked = links.filter(link => link.part.mark != null);
    const gap = (link: PartLink) => Math.abs(link.part.mark! / maxMark * 100 - link.rank * 20);
    const classGap = (link: PartLink) => Math.abs(link.part.diff ?? 0) / maxMark * 100;
    const mismatch = marked.filter(link => gap(link) > GAP).sort((a, b) => gap(b) - gap(a));
    links = (mismatch.length ? mismatch : marked.filter(link => classGap(link) >= CLASS_GAP)
      .sort((a, b) => classGap(b) - classGap(a))).slice(0, 1);
  }
  for (const link of links) {
    const { part, rank } = link;
    if (part.mark == null) continue;
    const finding = classify((part.mark / maxMark) * 100, rank * 20);
    let sentence = say(phrases[finding], { part: part.name, mark: `${formatNumber(part.mark)}/${maxMark}`, level: levelLabel(rank) });
    const versus = part.diff == null ? 0 : (part.diff / maxMark) * 100;
    if (Math.abs(versus) >= CLASS_GAP) sentence = `${sentence.replace(/[.。]$/, '')} (${versus > 0 ? phrases.aboveClass : phrases.belowClass}).`;
    lines.push(sentence);
  }

  const up = all.filter((line) => line.trend === 'up').length;
  const down = all.filter((line) => line.trend === 'down').length;
  if (up || down) {
    let trend = say(phrases.trend, { up, down });
    const changed = all.find(line => line.trend === 'up' || line.trend === 'down');
    if (changed) {
      const observed = report.months.flatMap(month => changed.levels[month] ?? []);
      const from = observed.at(-2);
      const to = observed.at(-1);
      if (from && to) {
        const example = say(phrases.example, { skill: changed.name, from: levelLabel(LEVEL_RANK[from]), to: levelLabel(LEVEL_RANK[to]) });
        trend = concise ? example : trend + ' ' + example;
      }
    }
    lines.push(trend);
  }

  if (!priorities) return lines.join('\n');
  const weakest = all
    .filter((line) => line.current && LEVEL_RANK[line.current] <= LEVEL_RANK.beginning)
    .sort((a, b) => LEVEL_RANK[a.current!] - LEVEL_RANK[b.current!])
    .slice(0, concise ? 1 : 2);
  for (const line of weakest) lines.push(say(phrases.priority, { name: line.name, need: skillNeed(language, line.name, gender, line.current) }));
  if (!weakest.length) {
    const developing = all.filter(line => line.current === 'in_progress').slice(0, 2);
    if (developing.length) lines.push(say(phrases.consolidate, {
      skills: developing.map(line => `«${line.name}»`).join(language === 'ar' ? ' و' : ' et '),
      practice: skillNeed(language, developing[0].name, gender, developing[0].current),
    }));
    else if (concise && assessed === total && assessed > 0) {
      lines.push(say('للتوسّع في «{skill}»، يمكن اختيار مثال جديد من الدرس وشرح طريقة إنجازه.', { skill: all[0].name }));
    }
  }
  return lines.join('\n');
}

/** The level's name for an average rank, through the report's translator. */
export const rankLabel = (t: (key: string) => string) => (rank: number) => t(`competencies.levels.${reportLevel(rank)}`);

/** Compare both measures for the same pupils, with a mark and every catalog skill assessed. */
export function comparableClassMean(reports: readonly FollowUp[]) {
  let mark = 0;
  let level = 0;
  let count = 0;
  for (const report of reports) {
    if (report.average == null || report.indicators.level == null || report.skills.some(skill => skill.rank == null)) continue;
    mark += report.average;
    level += report.indicators.level;
    count++;
  }
  return count >= 2 ? { mark: mark / count, level: level / count } : null;
}
