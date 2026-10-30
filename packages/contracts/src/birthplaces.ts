import data from './data/moroccoBirthplaces.json';
import type { Birthplace, BirthplaceValues } from './birthplace';
export type { Birthplace, BirthplaceValues } from './birthplace';
export { birthplaceLabel } from './birthplace';

/** HCP RGPH 2024 communes; see docs/data/morocco-birthplaces.md for provenance. */
export const MOROCCO_BIRTHPLACES: readonly Birthplace[] = data;
const byId = new Map(MOROCCO_BIRTHPLACES.map(place => [place.id, place]));
const normalize = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '')
  .toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/[^\p{L}\p{N}]/gu, '');
const names = new Map<string, Birthplace[]>();
for (const place of MOROCCO_BIRTHPLACES) {
  for (const name of new Set([normalize(place.nameLatin), normalize(place.nameArabic)])) {
    names.set(name, [...(names.get(name) ?? []), place]);
  }
}
// Explicit spelling aliases only. Never fuzzy-match identity data.
const aliases: Record<string, string> = {
  casa: 'Casablanca', fez: 'Fès', fes: 'Fès', tangier: 'Tanger',
  marrakesh: 'Marrakech', mohammedia: 'Mohammadia',
};

export function findBirthplaceById(id: string): Birthplace | undefined {
  return byId.get(id);
}

export function findBirthplaces(name: string): readonly Birthplace[] {
  const key = normalize(name);
  return names.get(normalize(Object.hasOwn(aliases, key) ? aliases[key] : name)) ?? [];
}

export function searchBirthplaces(query: string, limit = 30): readonly Birthplace[] {
  const key = normalize(query);
  if (!key) return MOROCCO_BIRTHPLACES.slice(0, limit);
  const exact = findBirthplaces(query);
  const exactIds = new Set(exact.map(place => place.id));
  return [...exact, ...MOROCCO_BIRTHPLACES.filter(place => !exactIds.has(place.id)
    && [place.nameLatin, place.nameArabic, place.provinceLatin, place.provinceArabic].some(name => normalize(name).includes(key)))].slice(0, limit);
}

/** No fields means no change. Ambiguous/local/foreign names remain manual.
 * Any explicit change writes all three fields, so an old translation or ID
 * cannot remain attached to a newly entered place.
 */
export function resolveBirthplace(input: BirthplaceValues): BirthplaceValues {
  if (input.birthplaceId === undefined && input.birthplace === undefined && input.birthplaceArabic === undefined) return {};
  const id = input.birthplaceId?.trim();
  let place = id ? byId.get(id) : undefined;
  if (id && !place) throw new Error('Unknown birthplace ID');
  const latin = input.birthplace?.trim() || null;
  const arabic = input.birthplaceArabic?.trim() || null;
  if (!id) {
    const candidates = latin ? findBirthplaces(latin) : arabic ? findBirthplaces(arabic) : [];
    const matching = candidates.filter(candidate => !latin || !arabic
      || findBirthplaces(arabic).some(other => other.id === candidate.id));
    if (matching.length === 1) place = matching[0];
  }
  if (place) return { birthplaceId: place.id, birthplace: place.nameLatin, birthplaceArabic: place.nameArabic };
  // Preserve an Arabic-only legacy value in its correct script field.
  if (latin && /\p{Script=Arabic}/u.test(latin) && !/\p{Script=Latin}/u.test(latin)) {
    return { birthplaceId: null, birthplace: null, birthplaceArabic: arabic || latin };
  }
  return { birthplaceId: null, birthplace: latin, birthplaceArabic: arabic };
}
