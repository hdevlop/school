import type { CompetencyLevel } from '@sms/contracts';
import { LEVEL_RANK } from './competencyLevels';
import { ACQUIRED_RANK, appreciation, formatNumber, SUPPORT_RANK, type Appreciation, type FollowUp } from './followUpReport';

/**
 * تقرير القسم: one class and subject after one Massar Contrôle. Every pupil's
 * mark beside their current level on each competency, the class's figures,
 * its profile against the year's first assessment, the appraisals'
 * distribution, the support groups and a reading of it all. Built from the
 * pupils' follow-up reports, so a pupil's mark, rank, appraisal and levels
 * read the same on both.
 */

/** The appraisals from best to weakest, with the share of the maximum each starts at. */
export const APPRECIATION_BANDS: ReadonlyArray<{ grade: Appreciation; from: number }> = [
  { grade: 'excellent', from: 0.9 }, { grade: 'veryGood', from: 0.8 }, { grade: 'good', from: 0.7 },
  { grade: 'average', from: 0.5 }, { grade: 'weak', from: 0 },
];

export type ClassSkill = {
  id: string;
  name: string;
  domainId: string;
  /** The class's mean level at the first assessment, and now (1–5). */
  baseline: number | null;
  current: number | null;
  /** Of the pupils with a level: the share at Avancé or more, in percent. */
  mastery: number | null;
  /** The pupils at Début or less (support), and at En cours (consolidation). */
  support: FollowUp['student'][];
  consolidate: FollowUp['student'][];
};
export type ClassDomain = { id: string; name: string; skills: ClassSkill[] };

export type ClassRow = {
  report: FollowUp;
  rank: number | null;
  /** The pupil's current level on each competency, by its id. */
  levels: Record<string, CompetencyLevel | null>;
  level: number | null;
  /** Competencies above, and below, their level at the first assessment. */
  up: number;
  down: number;
};

export type ClassReport = {
  pupils: number;
  /** The pupils with a mark on this Contrôle. */
  marked: number;
  mean: number | null;
  high: number | null;
  low: number | null;
  median: number | null;
  deviation: number | null;
  /** At or above half the maximum, in percent of the pupils with a mark. */
  passRate: number | null;
  passed: number;
  /** The class's mean appraisal, and how many pupils have each one. */
  appreciation: Appreciation | null;
  distribution: Record<Appreciation, number>;
  /** The mean of the pupils' overall levels. */
  level: number | null;
  /** Of every current level in the class, the share at Avancé or more. */
  acquiredShare: number | null;
  /** The first month with a level in the class, when it is before the Contrôle's. */
  baselineMonth: string | null;
  /** The Contrôle's month in this year; without it no level can be set beside its marks. */
  examMonth: string | null;
  domains: ClassDomain[];
  rows: ClassRow[];
  /** The pupils at Début or less on at least one competency. */
  needSupport: number;
  up: number;
  down: number;
};

const round2 = (value: number) => Math.round(value * 100) / 100;
const mean = (values: readonly number[]) => (values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null);

export function median(values: readonly number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

/** The population standard deviation: the class is the whole group, not a sample of it. */
export function deviation(values: readonly number[]): number | null {
  const average = mean(values);
  if (average == null) return null;
  return Math.sqrt(values.reduce((sum, value) => sum + (value - average) ** 2, 0) / values.length);
}

export function classReport(reports: readonly FollowUp[], maxMark: number): ClassReport {
  const marks = reports.flatMap((report) => (report.average == null ? [] : [report.average]));
  const average = mean(marks);
  const months = reports[0]?.months ?? [];
  const examMonth = reports[0]?.examMonth ?? null;
  // The first assessment the class had: the profile's and the progress's starting point.
  const hasLevel = (month: string) => reports.some((report) => report.domains.some((domain) => domain.lines.some((line) => line.levels[month])));
  const first = months.find(hasLevel) ?? null;
  const baselineMonth = first && first !== examMonth ? first : null;

  const lines = (report: FollowUp) => report.domains.flatMap((domain) => domain.lines);
  const domains: ClassDomain[] = (reports[0]?.domains ?? []).map((domain) => ({
    id: domain.id,
    name: domain.name,
    skills: domain.lines.map((line) => {
      const current = reports.flatMap((report) => {
        const level = lines(report).find((item) => item.id === line.id)?.current;
        return level ? [{ student: report.student, rank: LEVEL_RANK[level] }] : [];
      });
      const baseline = baselineMonth ? reports.flatMap((report) => {
        const level = lines(report).find((item) => item.id === line.id)?.levels[baselineMonth];
        return level ? [LEVEL_RANK[level]] : [];
      }) : [];
      const currentMean = mean(current.map((item) => item.rank));
      const baselineMean = mean(baseline);
      return {
        id: line.id,
        name: line.name,
        domainId: domain.id,
        baseline: baselineMean == null ? null : round2(baselineMean),
        current: currentMean == null ? null : round2(currentMean),
        mastery: current.length ? Math.round((current.filter((item) => item.rank >= ACQUIRED_RANK).length / current.length) * 100) : null,
        support: current.filter((item) => item.rank <= SUPPORT_RANK).map((item) => item.student),
        consolidate: current.filter((item) => item.rank === LEVEL_RANK.in_progress).map((item) => item.student),
      };
    }),
  }));

  // Best mark first; pupils without one at the end, all in Massar's order between equals.
  const ordered = reports.map((report, index) => ({ report, index })).sort((a, b) =>
    (b.report.average ?? -Infinity) - (a.report.average ?? -Infinity) || a.index - b.index);
  const rows: ClassRow[] = ordered.map(({ report }) => {
    let up = 0;
    let down = 0;
    const levels: Record<string, CompetencyLevel | null> = {};
    for (const line of lines(report)) {
      levels[line.id] = line.current;
      const start = baselineMonth ? line.levels[baselineMonth] : null;
      if (start && line.current) {
        if (LEVEL_RANK[line.current] > LEVEL_RANK[start]) up++;
        else if (LEVEL_RANK[line.current] < LEVEL_RANK[start]) down++;
      }
    }
    return { report, rank: report.standing.total.rank, levels, level: report.indicators.level, up, down };
  });

  const ranks = reports.flatMap((report) => lines(report).flatMap((line) => (line.current ? [LEVEL_RANK[line.current]] : [])));
  const pupilLevels = reports.flatMap((report) => (report.indicators.level == null ? [] : [report.indicators.level]));
  const level = mean(pupilLevels);
  const passed = marks.filter((mark) => mark >= maxMark / 2).length;
  const spread = deviation(marks);
  const middle = median(marks);
  return {
    pupils: reports.length,
    marked: marks.length,
    mean: average == null ? null : round2(average),
    high: marks.length ? Math.max(...marks) : null,
    low: marks.length ? Math.min(...marks) : null,
    median: middle == null ? null : round2(middle),
    deviation: spread == null ? null : round2(spread),
    passRate: marks.length ? Math.round((passed / marks.length) * 100) : null,
    passed,
    appreciation: appreciation(average, maxMark),
    distribution: Object.fromEntries(APPRECIATION_BANDS.map(({ grade }) =>
      [grade, reports.filter((report) => report.appreciation === grade).length])) as Record<Appreciation, number>,
    level: level == null ? null : round2(level),
    acquiredShare: ranks.length ? Math.round((ranks.filter((rank) => rank >= ACQUIRED_RANK).length / ranks.length) * 100) : null,
    baselineMonth,
    examMonth,
    domains,
    rows,
    needSupport: reports.filter((report) => lines(report).some((line) => line.current && LEVEL_RANK[line.current] <= SUPPORT_RANK)).length,
    up: rows.reduce((sum, row) => sum + row.up, 0),
    down: rows.reduce((sum, row) => sum + row.down, 0),
  };
}

/** The competencies with pupils to support or consolidate, those with the most to support first. */
export function supportGroups(report: Pick<ClassReport, 'domains'>) {
  return report.domains.flatMap((domain) => domain.skills)
    .filter((skill) => skill.support.length || skill.consolidate.length)
    .sort((a, b) => b.support.length - a.support.length || b.consolidate.length - a.consolidate.length || (a.current ?? 5) - (b.current ?? 5));
}

// ---------------------------------------------------------------------------
// قراءة تحليلية: rules, not a model; the same figures always give the same text.
// ---------------------------------------------------------------------------

const PHRASES = {
  ar: {
    spread: 'بلغ معدل القسم {mean} (أعلى نقطة {high}، أدنى نقطة {low}، انحراف معياري {deviation})، مما يدل على {spreadVerdict}.',
    tight: 'تجانس كبير في النتائج',
    fair: 'تجانس نسبي في النتائج',
    wide: 'تفاوت واضح بين التلاميذ',
    pass: 'حصل {passed} من أصل {marked} على المعدل، منهم {excellent} بتقدير «{excellentLabel}»',
    passLevel: '؛ ومتوسط مستوى الكفايات {level}/5 («{levelLabel}»)',
    strongWeak: 'أقوى الكفايات: {strong}؛ وأضعفها: {weak}',
    priority: '، وهي أولوية في الدعم',
    progress: 'مقارنة بتقييم {month}: {up} حالة تحسّن مقابل {down} حالة تراجع',
    biggest: '؛ وأكبر تقدّم في «{skill}» (من {from} إلى {to})',
    support: '{count} تلميذ(ة) في حاجة إلى دعم في كفاية واحدة على الأقل.',
    noSupport: 'لا يوجد أي تلميذ(ة) في حاجة إلى دعم (مستوى ≤ 2).',
    noLevels: 'لم يُسجَّل أي تقييم للكفايات حتى شهر الفرض.',
    undated: 'تعذّرت مقارنة النتائج بتقييمات الكفايات لعدم توفر تاريخ للفرض ضمن السنة الدراسية.',
    and: ' و',
    note: 'نتائج القسم {verdict} في مجملها (المعدل {mean}).',
    noteSupport: 'تنظيم حصص دعم في {skills} لفائدة التلاميذ المعنيين.',
    noteExtend: 'مواصلة العمل بالإيقاع نفسه، مع أنشطة للتعمّق لفائدة المتفوقين.',
    verdicts: { excellent: 'ممتازة', veryGood: 'جيدة جدا', good: 'جيدة', average: 'متوسطة', weak: 'ضعيفة' },
  },
  fr: {
    spread: 'La moyenne de la classe est de {mean} (note la plus haute {high}, la plus basse {low}, écart type {deviation}) : {spreadVerdict}.',
    tight: 'des résultats très homogènes',
    fair: 'des résultats assez homogènes',
    wide: 'des écarts marqués entre les élèves',
    pass: '{passed} élèves sur {marked} ont la moyenne, dont {excellent} avec l’appréciation « {excellentLabel} »',
    passLevel: ' ; le niveau moyen des compétences est de {level}/5 (« {levelLabel} »)',
    strongWeak: 'Compétences les mieux maîtrisées : {strong} ; les moins maîtrisées : {weak}',
    priority: ', à travailler en priorité',
    progress: 'Par rapport à l’évaluation de {month} : {up} progressions pour {down} reculs',
    biggest: ' ; la plus forte progression concerne « {skill} » (de {from} à {to})',
    support: '{count} élève(s) ont besoin d’un soutien dans au moins une compétence.',
    noSupport: 'Aucun élève n’a besoin de soutien (niveau ≤ 2).',
    noLevels: 'Aucune compétence n’a été évaluée jusqu’au mois du contrôle.',
    undated: 'La date du contrôle est inconnue pour cette année scolaire : la comparaison avec les compétences est indisponible.',
    and: ' et ',
    note: 'Les résultats de la classe sont {verdict} dans l’ensemble (moyenne {mean}).',
    noteSupport: 'Organiser des séances de soutien en {skills} pour les élèves concernés.',
    noteExtend: 'Poursuivre au même rythme, avec des activités d’approfondissement pour les plus avancés.',
    verdicts: { excellent: 'excellents', veryGood: 'très bons', good: 'bons', average: 'moyens', weak: 'insuffisants' },
  },
} as const;

export type ClassReportLanguage = keyof typeof PHRASES;
type Labels = {
  language: ClassReportLanguage;
  maxMark: number;
  /** A level's name for a mean rank, and an appraisal's, in the report's language. */
  levelLabel: (rank: number) => string;
  appreciationLabel: (grade: Appreciation) => string;
  monthLabel: (month: string) => string;
};

const fill = (template: string, values: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match));
const quoted = (language: ClassReportLanguage, skills: readonly ClassSkill[]) =>
  skills.map((skill) => `«${skill.name}» (${formatNumber(skill.current)})`).join(PHRASES[language].and);

/** The competencies with a class level, strongest first. */
function ranked(report: Pick<ClassReport, 'domains'>) {
  return report.domains.flatMap((domain) => domain.skills).filter((skill) => skill.current != null)
    .sort((a, b) => b.current! - a.current!);
}

/** The analysis, one sentence a line; empty when the class has neither marks nor levels. */
export function analyzeClass(report: ClassReport, labels: Labels): string {
  const phrases = PHRASES[labels.language];
  const out: string[] = [];
  const max = labels.maxMark;
  if (report.mean != null) {
    const share = (report.deviation ?? 0) / max;
    out.push(fill(phrases.spread, {
      mean: `${formatNumber(report.mean)}/${max}`, high: formatNumber(report.high), low: formatNumber(report.low),
      deviation: formatNumber(report.deviation), spreadVerdict: share <= 0.1 ? phrases.tight : share <= 0.2 ? phrases.fair : phrases.wide,
    }));
    let pass = fill(phrases.pass, {
      passed: report.passed, marked: report.marked, excellent: report.distribution.excellent, excellentLabel: labels.appreciationLabel('excellent'),
    });
    if (report.level != null) pass += fill(phrases.passLevel, { level: formatNumber(report.level), levelLabel: labels.levelLabel(report.level) });
    out.push(`${pass}.`);
  }
  const skills = ranked(report);
  if (skills.length >= 2) {
    const take = skills.length >= 4 ? 2 : 1;
    const weak = skills.slice(-take).reverse();
    let sentence = fill(phrases.strongWeak, { strong: quoted(labels.language, skills.slice(0, take)), weak: quoted(labels.language, weak) });
    if (weak.some((skill) => skill.current! < ACQUIRED_RANK)) sentence += phrases.priority;
    out.push(`${sentence}.`);
  }
  if (report.baselineMonth && (report.up || report.down)) {
    let sentence = fill(phrases.progress, { month: labels.monthLabel(report.baselineMonth), up: report.up, down: report.down });
    const gains = report.domains.flatMap((domain) => domain.skills)
      .filter((skill) => skill.baseline != null && skill.current != null && skill.current > skill.baseline)
      .sort((a, b) => (b.current! - b.baseline!) - (a.current! - a.baseline!));
    if (gains[0]) sentence += fill(phrases.biggest, { skill: gains[0].name, from: formatNumber(gains[0].baseline), to: formatNumber(gains[0].current) });
    out.push(`${sentence}.`);
  }
  if (skills.length) out.push(report.needSupport ? fill(phrases.support, { count: report.needSupport }) : phrases.noSupport);
  else if (report.domains.some((domain) => domain.skills.length)) out.push(report.examMonth ? phrases.noLevels : phrases.undated);
  return out.join('\n');
}

/** A suggested remark for the teacher: the overall verdict, then what to plan. */
export function classNote(report: ClassReport, labels: Labels): string {
  const phrases = PHRASES[labels.language];
  if (report.mean == null || !report.appreciation) return '';
  const out = [fill(phrases.note, { verdict: phrases.verdicts[report.appreciation], mean: `${formatNumber(report.mean)}/${labels.maxMark}` })];
  // The weakest competencies with pupils to support, or still below Avancé for the class.
  const weak = ranked(report).reverse().filter((skill) => skill.support.length || skill.current! < ACQUIRED_RANK).slice(0, 2);
  out.push(weak.length ? fill(phrases.noteSupport, { skills: weak.map((skill) => `«${skill.name}»`).join(phrases.and) }) : phrases.noteExtend);
  return out.join('\n');
}
