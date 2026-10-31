// The printed timetable's palette: a pale fill with the subject named in the
// same hue, at the sheet's own values.
const SUBJECT_COLORS = [
  'bg-[#dcf2e1] text-[#2b7a3d] dark:bg-green-950/60 dark:text-green-300',
  'bg-[#dce9fb] text-[#2a5ea8] dark:bg-blue-950/60 dark:text-blue-300',
  'bg-[#fde9cf] text-[#b0661a] dark:bg-orange-950/60 dark:text-orange-300',
  'bg-[#ece2fb] text-[#6a3fb0] dark:bg-violet-950/60 dark:text-violet-300',
  'bg-[#fff2bf] text-[#8a6d00] dark:bg-yellow-950/60 dark:text-yellow-300',
  'bg-[#fde0e4] text-[#b0304a] dark:bg-rose-950/60 dark:text-rose-300',
  'bg-[#d6f1ee] text-[#1f7a70] dark:bg-teal-950/60 dark:text-teal-300',
  'bg-[#e6e9ef] text-[#4a5568] dark:bg-slate-800/60 dark:text-slate-300',
];

// The sheet's color for each subject it prints, by subject code.
const PRINTED_COLORS = new Map([
  ['MATH', 0], ['FR', 1], ['AR', 2], ['ENG', 3], ['COM', 4], ['PE', 5], ['SVT', 6], ['INFO', 7],
]);

export interface ColoredSubject {
  id: string;
  code?: string | null;
}

const printedColor = (code?: string | null) => code ? PRINTED_COLORS.get(code.trim().toUpperCase()) : undefined;

const hashedColor = (subjectId: string) =>
  [...subjectId].reduce((total, char) => total + char.charCodeAt(0), 0) % SUBJECT_COLORS.length;

const preferredColor = ({ id, code }: ColoredSubject) => printedColor(code) ?? hashedColor(id);

export const colorFor = (subject: ColoredSubject) => SUBJECT_COLORS[preferredColor(subject)];

/**
 * One color per subject on a sheet. A subject the printed sheet colors keeps
 * that color; any other keeps its own across sections unless another subject
 * on the same sheet has it, and then takes the next free one. Past eight
 * subjects, colors repeat.
 */
export function subjectColors(subjects: Iterable<ColoredSubject>) {
  const unique = new Map<string, ColoredSubject>();
  for (const subject of subjects) unique.set(subject.id, subject);
  // Printed colors are claimed first, so no other subject takes one of them.
  const printed = (subject: ColoredSubject) => printedColor(subject.code) !== undefined;
  const ordered = [...unique.values()].sort((a, b) =>
    Number(printed(b)) - Number(printed(a)) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const colors = new Map<string, string>();
  const taken = new Set<number>();
  for (const subject of ordered) {
    let index = preferredColor(subject);
    for (let step = 0; step < SUBJECT_COLORS.length && taken.has(index); step += 1) {
      index = (index + 1) % SUBJECT_COLORS.length;
    }
    taken.add(index);
    colors.set(subject.id, SUBJECT_COLORS[index]);
  }
  return (subjectId: string) => colors.get(subjectId) ?? colorFor({ id: subjectId });
}
