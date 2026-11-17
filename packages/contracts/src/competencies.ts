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
  /** Levels set in it, in every month: what deleting it loses. */
  evaluationCount?: number;
}

export interface CompetencyDomain {
  id: string;
  teacherAssignmentId: string;
  name: string;
  altName: string | null;
  position: number;
  competencies: CompetencyItem[];
}

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
