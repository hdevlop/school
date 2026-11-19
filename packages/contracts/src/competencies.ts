/**
 * Competencies (compétences · الكفايات): what a teacher follows month by month
 * for each pupil of a class and subject. Non évalué is not a level: it is the
 * absence of a record, so the tuple holds only what can be stored.
 */
export const COMPETENCY_LEVEL_VALUES = ['not_acquired', 'beginning', 'in_progress', 'advanced', 'mastered'] as const;
export type CompetencyLevel = typeof COMPETENCY_LEVEL_VALUES[number];

export const COMPETENCY_LIMITS = {
  name: 120,
  /** Domains in one class and subject. */
  domains: 20,
  /** Competencies in one domain. */
  competencies: 30,
  /** A remark for the parents, in characters. */
  remark: 1000,
} as const;

/** A month of the academic year, `YYYY-MM`. */
export const COMPETENCY_MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

/** A class, section and subject whose competencies can be opened. */
export interface CompetencyAssignment {
  teacherAssignmentId: string;
  classId: string;
  className: string;
  sectionId: string;
  sectionName: string;
  subjectId: string;
  subjectName: string;
  /** The teacher of the class and subject, when one is assigned. */
  teacherName?: string | null;
  /** A starting list exists for this class and subject (the school's grid, or a draft to edit). */
  hasDefaultList?: boolean;
}

export interface CompetencyItem {
  id: string;
  domainId: string;
  name: string;
  /** The same competency in a second language (e.g. Arabic beside French). */
  altName: string | null;
  position: number;
  /** The first and last months it is followed in, `YYYY-MM`; null is the year's first, or its last. */
  fromMonth?: string | null;
  untilMonth?: string | null;
  /** Levels set in it, in every month: what deleting it loses. */
  evaluationCount?: number;
  /** Those levels by month, so a change from one month on can say what it keeps and what it loses. */
  evaluationsByMonth?: Record<string, number>;
}

export interface CompetencyDomain {
  id: string;
  teacherAssignmentId: string;
  name: string;
  altName: string | null;
  position: number;
  fromMonth?: string | null;
  untilMonth?: string | null;
  competencies: CompetencyItem[];
}

/**
 * A rename of a competency already rated in an earlier month: `all` corrects
 * its name in every month (a spelling fix), `fromMonth` ends it the month
 * before and starts a new competency under the new name.
 */
export const COMPETENCY_RENAME_SCOPE_VALUES = ['all', 'fromMonth'] as const;
export type CompetencyRenameScope = typeof COMPETENCY_RENAME_SCOPE_VALUES[number];

type MonthSpan = { fromMonth?: string | null; untilMonth?: string | null };

/** The span is followed in this `YYYY-MM` month. */
export const inMonth = (span: MonthSpan, month: string) =>
  (!span.fromMonth || span.fromMonth <= month) && (!span.untilMonth || span.untilMonth >= month);

/** The span is followed in at least one of these months. */
export const inAnyMonth = (span: MonthSpan, months: readonly string[]) => months.some((month) => inMonth(span, month));

/** The `YYYY-MM` month before this one. */
export function previousMonth(month: string) {
  const [year, number] = month.split('-').map(Number);
  return number === 1 ? `${year - 1}-12` : `${year}-${String(number - 1).padStart(2, '0')}`;
}

/**
 * The list as the teacher followed it in these months: the sub-domains used
 * in one of them, each with its competencies used in one of them. One month
 * is the month's own list; a run of months is a report's.
 */
export function catalogInMonths<D extends CompetencyDomain>(domains: readonly D[], months: readonly string[]): D[] {
  return domains.flatMap((domain) => (inAnyMonth(domain, months)
    ? [{ ...domain, competencies: domain.competencies.filter((item) => inAnyMonth(item, months)) }]
    : []));
}

/** The levels set in a competency in this month or after it: what removing it from that month on loses. */
export const evaluationsFrom = (item: Pick<CompetencyItem, 'evaluationsByMonth'>, month: string) =>
  Object.entries(item.evaluationsByMonth ?? {}).reduce((sum, [key, count]) => sum + (key >= month ? count : 0), 0);

/** The competency has levels in a month before this one, which a change from this month on keeps. */
export const ratedBefore = (item: Pick<CompetencyItem, 'evaluationsByMonth'>, month: string) =>
  Object.entries(item.evaluationsByMonth ?? {}).some(([key, count]) => key < month && count > 0);

export interface CompetencyEvaluation {
  competencyId: string;
  studentId: string;
  month: string;
  level: CompetencyLevel;
}

/** The teacher's remark for a pupil's parents in one subject and month, at the foot of the sheet. */
export interface CompetencyRemark {
  studentId: string;
  month: string;
  body: string;
  updatedAt: string;
}

/** One class and subject's levels for a month and for the year's first month, and the month's remarks. */
export interface CompetencyEvaluations {
  month: string;
  baselineMonth: string;
  evaluations: CompetencyEvaluation[];
  remarks: CompetencyRemark[];
}

/** One pupil's sheet in one subject: the catalog, then their levels. */
export interface StudentCompetencySheet extends CompetencyEvaluations {
  student: { id: string; name: string; altName: string | null; image: string | null };
  subject: { id: string; name: string } | null;
  teacherAssignmentId: string | null;
  domains: CompetencyDomain[];
}

/** One class and subject's levels and remarks in every month of the year: what the pupils' progress sheets show. */
export interface CompetencyYearLevels {
  teacherAssignmentId: string;
  /** The year's months, from the first. */
  months: string[];
  evaluations: CompetencyEvaluation[];
  remarks: CompetencyRemark[];
}
