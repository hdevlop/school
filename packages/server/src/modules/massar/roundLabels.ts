import type { MassarComponent } from '@sms/contracts';

// Arabic header text from the supplied 2025/26 exports. Later standard
// ordinals are a fallback, never evidence for a collège/integrated round.
export const MASSAR_TERM_LABELS = ['الدورة الأولى', 'الدورة الثانية'] as const;
export const MASSAR_EXAM_LABELS = ['الفرض الأول', 'الفرض الثاني', 'الفرض الثالث', 'الأنشطة المندمجة'] as const;
type Observed = { term: number; exam: number; termLabel: string; examLabel: string; components: MassarComponent[] };
export function resolveRoundLabels(subjects: Array<{ observedRounds: Observed[] }>, term: number, exam: number) {
  const observed = subjects.flatMap(subject => subject.observedRounds).filter(round => round.term === term && round.exam === exam);
  const first = observed[0];
  return {
    termLabel: first?.termLabel ?? MASSAR_TERM_LABELS[term - 1],
    examLabel: first?.examLabel ?? MASSAR_EXAM_LABELS[exam - 1],
    labelsUnseen: !first,
  };
}
