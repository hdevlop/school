import type { HomeworkRow } from '@sms/contracts';

/** The colours a homework card's icon may take, in the order they are handed out. */
export const HOMEWORK_TONES = ['blue', 'red', 'green', 'purple', 'amber', 'teal', 'rose', 'indigo', 'orange', 'cyan', 'slate'] as const;
export type HomeworkTone = (typeof HOMEWORK_TONES)[number] | 'default';

/** The subjects a family recognises by colour keep theirs whatever the list holds. */
const SUBJECT_TONES: Record<string, HomeworkTone> = {
  AR: 'red', FR: 'purple', MATH: 'blue', EI: 'amber', ENG: 'rose',
  GEO: 'slate', HG: 'slate', SCI: 'green', SVT: 'green', PHY: 'green',
  INFO: 'indigo', ART: 'orange', PE: 'teal', COM: 'cyan',
};

/**
 * The colour of each homework, by whichever varies more over the reader's
 * homework, so the cards never all share one: by subject for a family (one
 * class, many subjects), by class for a teacher of one subject or two across
 * many classes. Pass the unfiltered list: a card keeps its colour while the
 * list is searched or filtered.
 */
export function homeworkTones(all: readonly HomeworkRow[]): (row: HomeworkRow) => HomeworkTone {
  const subjects = new Map<string, string>();
  for (const row of all) if (row.subject) subjects.set(row.subject.id, row.subject.code?.toUpperCase() ?? '');
  const classCount = new Set(all.flatMap((row) => (row.class ? [row.class.id] : []))).size;

  if (classCount > subjects.size) {
    const classes = [...new Map(all.flatMap((row) => (row.class ? [[row.class.id, row.class.name] as const] : []))).entries()]
      .sort(([, left], [, right]) => left.localeCompare(right, undefined, { numeric: true }));
    const tones = new Map(classes.map(([id], index) => [id, HOMEWORK_TONES[index % HOMEWORK_TONES.length]]));
    return (row) => (row.class && tones.get(row.class.id)) || 'default';
  }

  // A subject without a colour of its own takes the first one no other subject in the list has.
  const tones = new Map<string, HomeworkTone>();
  for (const [id, code] of subjects) if (SUBJECT_TONES[code]) tones.set(id, SUBJECT_TONES[code]);
  const free = HOMEWORK_TONES.filter((tone) => ![...tones.values()].includes(tone));
  let next = 0;
  for (const id of [...subjects.keys()].sort()) {
    if (!tones.has(id)) tones.set(id, free.length ? free[next++ % free.length] : HOMEWORK_TONES[next++ % HOMEWORK_TONES.length]);
  }
  return (row) => (row.subject && tones.get(row.subject.id)) || 'default';
}
