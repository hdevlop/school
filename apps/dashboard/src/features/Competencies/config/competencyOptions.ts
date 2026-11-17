import { COMPETENCY_LEVEL_VALUES, type CompetencyLevel } from '@sms/contracts';

type T = (key: string) => string;

/** Not a stored value: picking it clears the level. */
export const NOT_EVALUATED = 'notEvaluated' as const;
export type LevelChoice = CompetencyLevel | typeof NOT_EVALUATED;

export const levelLabel = (t: T, level: CompetencyLevel | null | undefined) =>
  t(`competencies.levels.${level ?? NOT_EVALUATED}`);

/** What the level picker offers: every level, then Non évalué to clear one. */
export const levelOptions = (t: T): Array<{ value: LevelChoice; label: string }> => [
  ...COMPETENCY_LEVEL_VALUES.map((level) => ({ value: level, label: levelLabel(t, level) })),
  { value: NOT_EVALUATED, label: levelLabel(t, null) },
];

/** The colour of a level: red, then amber and gold as the mockups, blue, dark blue; grey unevaluated. */
export const LEVEL_TONE: Record<CompetencyLevel, { bar: string; text: string }> = {
  not_acquired: { bar: 'bg-red-500', text: 'text-red-600 dark:text-red-400' },
  beginning: { bar: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400' },
  in_progress: { bar: 'bg-yellow-500', text: 'text-yellow-600 dark:text-yellow-400' },
  advanced: { bar: 'bg-blue-500', text: 'text-blue-600 dark:text-blue-400' },
  mastered: { bar: 'bg-blue-700 dark:bg-blue-300', text: 'text-blue-700 dark:text-blue-300' },
};
export const EMPTY_TONE = 'bg-muted-foreground/20';
