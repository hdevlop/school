import { foldSubjectName } from '@sms/contracts';

/**
 * The parts a homework may name for its subject in its class: what Massar
 * grades the class's level on that year when the year has Massar for it
 * (CP Français: Graphisme, Comptine/Chant…), otherwise the subject's own
 * sub-subjects. Massar's names come as typed in its files, so they are
 * trimmed and a name spelled twice is offered once.
 *
 * A part named like the subject itself is the whole subject, not a part:
 * Massar lists a subject it grades as one block (Informatique, Mathématiques)
 * with one component named after it (المعلوميات), and a school's sub-subjects
 * may hold the subject's name in its other language (التربية الإسلامية).
 * `subjectNames` are those names; with nothing else left the form offers no
 * sub-subject.
 */
export function homeworkParts(massarComponents: Array<{ name: string }[]>, subSubjectNames: string[], subjectNames: string[] = []): string[] {
  const whole = new Set(subjectNames.map((name) => foldSubjectName(name.replace(/\s+/g, ' ').trim())));
  const parts = (names: string[]) => distinct(names).filter((name) => !whole.has(foldSubjectName(name)));
  const massar = parts(massarComponents.flat().map((component) => component.name));
  return massar.length ? massar : parts(subSubjectNames);
}

/** The offered part a requested name stands for, spelled as offered. */
export function matchPart(parts: string[], name: string): string | null {
  const wanted = foldSubjectName(name);
  return parts.find((part) => foldSubjectName(part) === wanted) ?? null;
}

function distinct(names: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of names) {
    const name = raw.replace(/\s+/g, ' ').trim();
    const key = foldSubjectName(name);
    if (!name || seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out;
}
