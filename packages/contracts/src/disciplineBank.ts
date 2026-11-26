import data from './data/disciplineBank.json';
import { DISCIPLINE_LOCATION_VALUES, DISCIPLINE_SEVERITY_VALUES, type DisciplineCategory, type DisciplineLocation, type DisciplineSeverity } from './enums';

/** The languages the built-in bank is written in, as the interface names them. */
export const DISCIPLINE_BANK_LANGUAGES = ['fr', 'ar', 'en', 'es'] as const;
export type DisciplineBankLanguage = (typeof DISCIPLINE_BANK_LANGUAGES)[number];

/**
 * One built-in incident: what happened, with the severity it usually has and
 * the places its wording names (none: it fits any place), in every language.
 */
export type DisciplineBankEntry = {
  id: string;
  category: DisciplineCategory;
  severity: DisciplineSeverity;
  places: DisciplineLocation[];
  description: Record<DisciplineBankLanguage, string>;
};

/**
 * School's built-in incident descriptions: for every category, eight factual
 * ways to describe what happened, in French, Arabic, English and Spanish,
 * written to suit any student. The incident form's "generate" fills the
 * description from them; the category and severity stay the teacher's.
 */
export const DISCIPLINE_BANK: readonly DisciplineBankEntry[] = data.entries as DisciplineBankEntry[];

const languageOf = (language: string | null | undefined): DisciplineBankLanguage =>
  (DISCIPLINE_BANK_LANGUAGES as readonly string[]).includes(language ?? '') ? language as DisciplineBankLanguage : 'fr';
const rank = (severity: string | null | undefined) => DISCIPLINE_SEVERITY_VALUES.indexOf(severity as DisciplineSeverity);

/**
 * A category's descriptions in the interface language (French when it has
 * none) that fit the incident's place: a listed place keeps the wordings that
 * name it or no place at all, so an incident in class is never described "in
 * the playground"; no place, or one typed outside the list, keeps them all.
 * Those of the chosen severity come first, then the nearest ones, so a minor
 * incident is not offered a grave wording first, and among them those that
 * name the place. None until a category is chosen.
 */
export function disciplineBankFor(category: string | null | undefined, severity: string | null | undefined,
  location: string | null | undefined, language: string | null | undefined) {
  if (!category) return [];
  const lang = languageOf(language);
  const chosen = rank(severity);
  const place = (DISCIPLINE_LOCATION_VALUES as readonly string[]).includes(location ?? '') ? location as DisciplineLocation : null;
  const distance = (entry: DisciplineBankEntry) => (chosen < 0 ? 0 : Math.abs(rank(entry.severity) - chosen));
  const general = (entry: DisciplineBankEntry) => (place && entry.places.includes(place) ? 0 : 1);
  return DISCIPLINE_BANK
    .filter(entry => entry.category === category && (!place || !entry.places.length || entry.places.includes(place)))
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => distance(a.entry) - distance(b.entry) || general(a.entry) - general(b.entry) || a.index - b.index)
    .map(({ entry }) => ({ id: `bank:${entry.id}`, severity: entry.severity, description: entry.description[lang] }));
}

/**
 * The description a click on "generate" fills next: the one after the last
 * filled, else after the one already in the field, else the first. It wraps,
 * so clicking again keeps cycling.
 */
export function nextDisciplineDescription<Item extends { id: string; description: string }>(items: readonly Item[], lastId: string | null, current?: string | null) {
  if (!items.length) return undefined;
  let index = lastId ? items.findIndex(item => item.id === lastId) : -1;
  if (index < 0 && current?.trim()) index = items.findIndex(item => item.description.trim() === current.trim());
  return items[(index + 1) % items.length];
}
