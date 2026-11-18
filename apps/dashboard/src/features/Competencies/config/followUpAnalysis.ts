import { foldSubjectName } from '@sms/contracts';
import { LEVEL_RANK, levelOfRank } from './competencyLevels';
import { agree, skillNeed, type RemarkGender, type RemarkLanguage } from './competencyRemarks';
import type { CompetencyLine, FollowUp, PartRow } from './followUpReport';

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
    trend: 'بمقارنة آخر تقييمين متاحين لكل كفاية، بلغ عدد الكفايات التي تحسّنت {up} والتي تراجعت {down}.',
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
    trend: 'Entre les deux dernières évaluations disponibles pour chaque compétence, le nombre de progressions est de {up} et celui de reculs de {down}.',
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
export function analyze(report: FollowUp, { maxMark, language, gender, levelLabel }: {
  maxMark: number;
  language: RemarkLanguage;
  gender: RemarkGender;
  /** The level's name in the report's language. */
  levelLabel: (rank: number) => string;
}): string {
  const phrases = PHRASES[language];
  const say = (template: string, values: Record<string, string | number> = {}) => agree(fill(template, values), gender);
  const lines: string[] = [];

  const all = report.domains.flatMap((domain) => domain.lines);
  const assessed = all.filter((line) => line.current).length;
  const { level, total } = report.indicators;
  if (report.average != null) {
    const { average, classAverage, diff } = report;
    const template = diff == null ? phrases.mark : diff > 0 ? phrases.higher : diff < 0 ? phrases.lower : phrases.equal;
    lines.push(say(template, { mark: `${average}/${maxMark}`, classMark: `${classAverage}/${maxMark}`, gap: Math.abs(diff ?? 0) }));
    if (!report.examMonth && total) lines.push(phrases.undated);
    else if (total && !assessed) lines.push(say(phrases.noLevels, { total }));
  }
  if (level != null && assessed) {
    lines.push(say(phrases.coverage, { assessed, total, level: levelLabel(level) }));
    if (report.average != null && assessed === total) {
      const verdict = classify((report.average / maxMark) * 100, level * 20);
      lines.push(verdict === 'markAbove' ? phrases.overallMarkAbove : verdict === 'levelAbove' ? phrases.overallLevelAbove : phrases.overallAgree);
    }
  }

  for (const link of linkParts(report)) {
    const { part, rank } = link;
    if (part.mark == null) continue;
    const finding = classify((part.mark / maxMark) * 100, rank * 20);
    let sentence = say(phrases[finding], { part: part.name, mark: `${part.mark}/${maxMark}`, level: levelLabel(rank) });
    const versus = part.diff == null ? 0 : (part.diff / maxMark) * 100;
    if (Math.abs(versus) >= CLASS_GAP) sentence = `${sentence.replace(/[.。]$/, '')} (${versus > 0 ? phrases.aboveClass : phrases.belowClass}).`;
    lines.push(sentence);
  }

  const up = all.filter((line) => line.trend === 'up').length;
  const down = all.filter((line) => line.trend === 'down').length;
  if (up || down) lines.push(say(phrases.trend, { up, down }));

  const weakest = all
    .filter((line) => line.current && LEVEL_RANK[line.current] <= LEVEL_RANK.beginning)
    .sort((a, b) => LEVEL_RANK[a.current!] - LEVEL_RANK[b.current!])
    .slice(0, 2);
  for (const line of weakest) lines.push(say(phrases.priority, { name: line.name, need: skillNeed(language, line.name, gender) }));
  return lines.join('\n');
}

/** The level's name for an average rank, through the report's translator. */
export const rankLabel = (t: (key: string) => string) => (rank: number) => t(`competencies.levels.${levelOfRank(rank)}`);
