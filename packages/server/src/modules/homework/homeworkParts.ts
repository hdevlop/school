import { foldSubjectName } from '@sms/contracts';

/**
 * The parts a homework may name for its subject in its class: what Massar
 * grades the class's level on that year when the year has Massar for it
 * (CP Français: Graphisme, Comptine/Chant…), otherwise the subject's own
 * sub-subjects. Massar's names come as typed in its files, so they are
 * trimmed and a name spelled twice is offered once.
 */
export function homeworkParts(massarComponents: Array<{ name: string }[]>, subSubjectNames: string[]): string[] {
  const massar = distinct(massarComponents.flat().map((component) => component.name));
  return massar.length ? massar : distinct(subSubjectNames);
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
