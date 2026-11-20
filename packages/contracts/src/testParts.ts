/**
 * The questions of a test (السؤال 1، السؤال 2 …): listed with the exam or
 * assessment, then counted in the class report after a Massar Contrôle — how
 * many of the pupils who sat it answered each question correctly.
 */
export const TEST_PART_LIMITS = {
  parts: 30,
  id: 24,
  label: 60,
} as const;

export type TestPart = {
  /** Stable across edits, so a count already entered stays on its question. */
  id: string;
  label: string;
};

/** One question of a School test that a Massar grid stands for. */
export type MassarSheetPart = TestPart & {
  source: 'exam' | 'assessment';
  testId: string;
  testTitle: string;
  /** The grid's column the test is linked to. */
  componentCode: string;
};

/** How many pupils answered one question correctly. */
export type MassarPartResult = { testId: string; partId: string; correct: number };

export type MassarSheetParts = { parts: MassarSheetPart[]; results: MassarPartResult[] };
