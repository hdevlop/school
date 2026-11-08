import type { MassarComponent } from '@sms/contracts';
import defaultModel from '../seed-data/school/massarModel.json';

export type MassarModelSubject = { code: string; name: string; components: MassarComponent[] };

/**
 * The subjects Massar holds for each level before this year's files arrive, so
 * every class has all its grids from the start. The school's own previous year
 * wins where it has one; otherwise the default model, read from real Massar
 * exports (2025/26, and 2026/27 for Arabic). A subject taken from it stays
 * "to confirm" until a Massar file of this year brings its exact spelling.
 */
export function massarModel(previousYear: Array<MassarModelSubject & { level: string }>) {
  const model = new Map<string, Map<string, MassarModelSubject>>();
  const add = (level: string, subject: MassarModelSubject) => {
    const subjects = model.get(level) ?? new Map<string, MassarModelSubject>();
    subjects.set(subject.code, { code: subject.code, name: subject.name, components: subject.components });
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
