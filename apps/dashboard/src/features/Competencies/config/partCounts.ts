/** One question of the Contrôle's School test, with how many of the pupils who sat it answered it correctly. */
export type ClassPart = {
  key: string;
  testId: string;
  partId: string;
  label: string;
  correct: number | null;
  /** Of the pupils with a mark, in percent; null until the count is entered. */
  rate: number | null;
};

/** Questions under this rate, in percent, are shown as to work on again. */
export const PART_PRIORITY_RATE = 50;

export function classParts(
  parts: ReadonlyArray<{ testId: string; id: string; label: string }>,
  correctOf: (testId: string, partId: string) => number | null,
  marked: number,
): ClassPart[] {
  return parts.map((part) => {
    const correct = correctOf(part.testId, part.id);
    return {
      key: JSON.stringify([part.testId, part.id]), testId: part.testId, partId: part.id, label: part.label, correct,
      rate: correct == null || !marked ? null : Math.round((Math.min(correct, marked) / marked) * 100),
    };
  });
}
