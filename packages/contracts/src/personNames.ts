/**
 * School writes every person's Latin name one way: each word capitalized,
 * the rest lower case ("ilham ACHTOUK" → "Ilham Achtouk"). A letter after any
 * other mark starts a word too (Jean-Marc, El-Idrissi, D'Amour), accents are
 * kept (Élodie), and spacing is tidied. Arabic has no capitals, so an Arabic
 * name only has its spacing tidied.
 *
 * It is Postgres's initcap over the tidied name, so the migration that
 * rewrote the stored names (0142) and every later save agree.
 * The server applies it to every name it saves, so each screen and printout
 * shows the stored name as it is.
 */
export function capitalizePersonName(name: string): string {
  return name.trim().split(/\s+/).filter(Boolean).join(' ')
    .toLocaleLowerCase('fr')
    .replace(/(^|[^\p{L}\p{N}])(\p{L})/gu, (_, mark: string, letter: string) => mark + letter.toLocaleUpperCase('fr'));
}

/** The same for an optional name: empty stays empty, absent stays absent. */
export function capitalizeOptionalPersonName<T extends string | null | undefined>(name: T): T {
  return (typeof name === 'string' ? capitalizePersonName(name) : name) as T;
}
