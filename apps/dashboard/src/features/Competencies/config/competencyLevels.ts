import { COMPETENCY_LEVEL_VALUES, type CompetencyEvaluation, type CompetencyLevel } from '@sms/contracts';
import { getAcademicYearMonths } from '@/lib/utils';

/**
 * The arithmetic behind the three screens: a pupil's row (`6/10` and a
 * signal), a competency's card (`4/8` and how the class is spread) and the
 * pupil sheet (the month against September). Pure, so each figure is tested.
 */

/** The school's grid, lowest first: Non acquis 1 … Maîtrisé 5. */
export const LEVEL_RANK = Object.fromEntries(COMPETENCY_LEVEL_VALUES.map((level, index) => [level, index + 1])) as Record<CompetencyLevel, number>;

/** A signal has one bar per level. */
export const SIGNAL_BARS = COMPETENCY_LEVEL_VALUES.length;

/** Bars a level fills: Non acquis one, Début two, En cours three, Avancé four, Maîtrisé all five; Non évalué none. */
export const filledBars = (level: CompetencyLevel | null | undefined) => (level ? LEVEL_RANK[level] : 0);

/** The level an average rank rounds to; nothing evaluated has none. */
export function levelOfRank(rank: number | null): CompetencyLevel | null {
  if (rank == null) return null;
  const index = Math.min(COMPETENCY_LEVEL_VALUES.length, Math.max(1, Math.round(rank))) - 1;
  return COMPETENCY_LEVEL_VALUES[index];
}

export function averageRank(levels: ReadonlyArray<CompetencyLevel | null | undefined>): number | null {
  const ranks = levels.flatMap((level) => (level ? [LEVEL_RANK[level]] : []));
  return ranks.length ? ranks.reduce((sum, rank) => sum + rank, 0) / ranks.length : null;
}

/** The change from the baseline, to one decimal; none without both. */
export function rankChange(current: number | null, baseline: number | null): number | null {
  if (current == null || baseline == null) return null;
  return Math.round((current - baseline) * 10) / 10;
}

/** `+0.9`, `−1`, `0`: the sign is always shown so a rise reads at a glance. */
export function formatChange(change: number): string {
  if (change === 0) return '0';
  const value = Math.abs(change).toString();
  return change > 0 ? `+${value}` : `−${value}`;
}

export type EvaluationIndex = Map<string, CompetencyLevel>;

export const evaluationKey = (competencyId: string, studentId: string, month: string) => `${competencyId}\u0000${studentId}\u0000${month}`;

export function indexEvaluations(evaluations: readonly CompetencyEvaluation[]): EvaluationIndex {
  return new Map(evaluations.map((item) => [evaluationKey(item.competencyId, item.studentId, item.month), item.level]));
}

export type LevelSummary = {
  evaluated: number;
  total: number;
  rank: number | null;
  level: CompetencyLevel | null;
};

/** A pupil's month over a set of competencies: how many have a level, and their average. */
export function studentSummary(index: EvaluationIndex, competencyIds: readonly string[], studentId: string, month: string): LevelSummary {
  const levels = competencyIds.map((id) => index.get(evaluationKey(id, studentId, month)));
  const rank = averageRank(levels);
  return { evaluated: levels.filter(Boolean).length, total: competencyIds.length, rank, level: levelOfRank(rank) };
}

export type Distribution = Record<CompetencyLevel, number>;

/** A competency's month over the roster: how many pupils have a level, and at which. */
export function competencySummary(index: EvaluationIndex, competencyId: string, studentIds: readonly string[], month: string) {
  const distribution = Object.fromEntries(COMPETENCY_LEVEL_VALUES.map((level) => [level, 0])) as Distribution;
  let evaluated = 0;
  for (const studentId of studentIds) {
    const level = index.get(evaluationKey(competencyId, studentId, month));
    if (!level) continue;
    distribution[level] += 1;
    evaluated += 1;
  }
  return { evaluated, total: studentIds.length, distribution };
}

/** The year's months, September first, as `YYYY-MM`. */
export const competencyMonths = (yearLabel: string | undefined) => (yearLabel ? getAcademicYearMonths(yearLabel) : []);

/** The month a page opens on: this month inside the year, else the year's nearest end. */
export function defaultMonth(months: readonly string[], today: string): string {
  const current = today.slice(0, 7);
  if (!months.length) return current;
  if (months.includes(current)) return current;
  return current < months[0] ? months[0] : months[months.length - 1];
}

/** The day a month's roster is read on: today in the current month, else the month's last day (or first, ahead). */
export function rosterDay(month: string, today: string): string {
  const current = today.slice(0, 7);
  if (month === current) return today;
  if (month > current) return `${month}-01`;
  const [year, number] = month.split('-').map(Number);
  const last = new Date(Date.UTC(year, number, 0)).getUTCDate();
  return `${month}-${String(last).padStart(2, '0')}`;
}

// Moroccan Arabic month names (دجنبر, شتنبر…), as the school writes them.
const MONTH_LOCALE: Record<string, string> = { ar: 'ar-MA' };

/** A `YYYY-MM` month by name in the page's language: `Décembre`, or `Sept.` short. */
export function monthLabel(month: string, language: string, style: 'long' | 'short' = 'long'): string {
  const [year, number] = month.split('-').map(Number);
  if (!year || !number) return month;
  const locale = MONTH_LOCALE[language] ?? language;
  const text = new Intl.DateTimeFormat(locale, { month: style, timeZone: 'UTC' }).format(new Date(Date.UTC(year, number - 1, 1)));
  return text.charAt(0).toLocaleUpperCase(locale) + text.slice(1);
}
