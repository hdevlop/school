/** Revision content belongs to the assessment that owns its date and audience. */
export const REVISION_LANGUAGES = ['fr', 'ar', 'en', 'es'] as const;
export type RevisionLanguage = (typeof REVISION_LANGUAGES)[number];

export const ASSESSMENT_PLANNING_LIMITS = {
  round: 120,
  groups: 20,
  label: 120,
  lessons: 40,
  lesson: 500,
} as const;

export type RevisionGroup = {
  label: string;
  language: RevisionLanguage;
  lessons: string[];
};

export type AssessmentPlanning = {
  round: string;
  semester: 1 | 2;
  groups: RevisionGroup[];
};
