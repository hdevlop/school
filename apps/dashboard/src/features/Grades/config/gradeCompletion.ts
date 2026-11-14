import type { MassarSheetDetail } from '@sms/contracts';

/** How many of the students who can take a mark have one. */
export interface GradeCompletion { done: number; total: number }

type RosterRow = { marksObtained?: unknown; status?: string | null };

/**
 * A student is done once the teacher has decided: a mark, or absent. An empty
 * cell, or a mark only half typed away (""), is still waiting.
 */
export function isGradeDone(row: { marksObtained?: unknown; status?: string | null }) {
  if (row.status === 'missed') return true;
  return row.marksObtained != null && row.marksObtained !== '';
}

/**
 * The roster's progress, counting only the students who can take a mark here
 * (the Massar sheet's own list, or the exam's dated roster): a student who left
 * or still waits to be matched in Massar would otherwise keep the section from
 * ever being complete.
 */
export function rosterCompletion<R extends RosterRow>(rows: R[], canTakeMark: (row: R) => boolean): GradeCompletion {
  const countable = rows.filter(canTakeMark);
  return { done: countable.filter(isGradeDone).length, total: countable.length };
}

/** Each component of a Massar sheet, counted over the sheet's own students. */
export function sheetComponentCompletion(sheet: Pick<MassarSheetDetail, 'components' | 'students' | 'marks'>) {
  const students = new Set(sheet.students.map((student) => student.id));
  const result = new Map<string, GradeCompletion>();
  for (const component of sheet.components) result.set(component.code, { done: 0, total: students.size });
  for (const mark of sheet.marks) {
    const entry = result.get(mark.componentCode);
    if (!entry || !students.has(mark.studentId)) continue;
    if (mark.mark !== null || mark.absence === 'justified') entry.done++;
  }
  return result;
}

export const isComplete = (completion: GradeCompletion) => completion.total > 0 && completion.done >= completion.total;

/** What a picker shows at its right edge: a check once complete, otherwise how far it got. */
export const completionText = (completion: GradeCompletion | undefined) => !completion || completion.total === 0
  ? ''
  : isComplete(completion) ? '✓' : `${completion.done}/${completion.total}`;

/** A quoted CSS string that cannot close the <style> element it is written into. */
export const cssString = (value: string) => JSON.stringify(value).replace(/</g, '\\3C ');

/**
 * The picker's options are plain labels, so each count is drawn after its
 * option by a rule on the option's label (cmdk's data-value), limited to the
 * one list whose search field reads `searchPlaceholder`.
 */
export function completionListCss(searchPlaceholder: string, entries: Array<{ label: string; completion: GradeCompletion | undefined }>) {
  const scope = `[cmdk-root]:has(input[placeholder=${cssString(searchPlaceholder)}])`;
  return entries.flatMap(({ label, completion }) => {
    const text = completionText(completion);
    if (!text) return [];
    const color = isComplete(completion!) ? 'var(--color-emerald-600, #059669)' : 'var(--muted-foreground)';
    return [`${scope} [cmdk-item][data-value=${cssString(label.trim())}]::after{content:${cssString(text)};margin-inline-start:auto;padding-inline-start:0.75rem;color:${color};font-size:0.75rem;font-weight:600;font-variant-numeric:tabular-nums}`];
  }).join('\n');
}
