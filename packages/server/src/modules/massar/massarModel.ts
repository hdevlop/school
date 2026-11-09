import type { MassarComponent } from '@sms/contracts';
import defaultModel from '../seed-data/school/massarModel.json';

export type MassarModelRound = { term: number; exam: number; termLabel: string; examLabel: string; components: MassarComponent[] };
export type MassarModelSubject = { code: string; name: string; components: MassarComponent[]; rounds?: MassarModelRound[] };

/**
 * The subjects Massar holds for each level before this year's files arrive, so
 * every class has all its grids from the start. The school's own previous year
 * wins where it has one; otherwise the default model, read from real Massar
 * exports (primary: 2025/26, and 2026/27 for Arabic; collège 1APIC, 2APIC and
 * 3APIC: 2026/27, first term, whose tests the second term repeats). A subject
 * taken from it stays "to confirm" until a
 * Massar file of this year brings its exact spelling.
 *
 * `rounds` are the tests Massar showed for the subject. A collège subject gets
 * a grid after the first test only for a test seen there, so the model brings
 * them; the previous year's own rounds replace them only when it has some.
 */
export function massarModel(previousYear: Array<MassarModelSubject & { level: string }>) {
  const model = new Map<string, Map<string, MassarModelSubject>>();
  const add = (level: string, subject: MassarModelSubject) => {
    const subjects = model.get(level) ?? new Map<string, MassarModelSubject>();
    const rounds = subject.rounds?.length ? subject.rounds : subjects.get(subject.code)?.rounds ?? [];
    subjects.set(subject.code, { code: subject.code, name: subject.name, components: subject.components, rounds });
    model.set(level, subjects);
  };
  for (const [level, subjects] of Object.entries(defaultModel.levels)) for (const subject of subjects) add(level, subject);
  for (const { level, ...subject } of previousYear) add(level, subject);
  return model;
}

/** A file re-saved in Excel loses a trailing space or line break; the part is still the same. */
const bare = (name: string) => name.trim().replace(/\s+/g, ' ').normalize('NFC');
export const sameComponents = (a: MassarComponent[], b: MassarComponent[]) =>
  a.length === b.length && a.every((component, index) => component.code === b[index].code && bare(component.name) === bare(b[index].name));
