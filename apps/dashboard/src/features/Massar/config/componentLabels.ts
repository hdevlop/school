/**
 * Short names for Massar's long French components, shown on the marks grid and the printed sheet
 * to give the marks room. Display only: the xlsx export to Massar always writes the exact full
 * name, and the grid shows the full name on hover. Arabic names and any name not listed here stay
 * in full. Keyed by the full name as Massar writes it, matched trimmed, in any case, with either
 * apostrophe.
 */
const SHORT_NAMES: Record<string, string> = {
  'communication et actes de langage': 'Communication',
  'activités de prod. écrite': 'Prod. écrite',
  "production de l'écrit": "Prod. de l'écrit",
  'poésie/lecture/diction': 'Poésie/Lect.',
  'activités de lecture': 'Act. lecture',
  'orthographe/dictée': 'Ortho./Dictée',
  'activités orales': 'Act. orales',
  'exercices écrits': 'Ex. écrits',
  'projet de classe': 'Projet',
};

const key = (name: string) => name.trim().replace(/\s+/g, ' ').replace(/’/g, "'").toLocaleLowerCase('fr');

export function componentLabel(name: string): string {
  // A sheet missing a name still prints, as it did before short names.
  return (typeof name === 'string' && SHORT_NAMES[key(name)]) || name;
}
