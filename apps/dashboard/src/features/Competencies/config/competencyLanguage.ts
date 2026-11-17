import type { CompetencyDomain } from '@sms/contracts';

const ARABIC_LETTER = /[؀-ۿݐ-ݿࢠ-ࣿ]/;
const LATIN_LETTER = /[A-Za-zÀ-ÖØ-öø-ÿ]/;

/** Written in Arabic: Arabic letters and no Latin ones (digits and punctuation are neutral). */
export const isArabicText = (value: string) => ARABIC_LETTER.test(value) && !LATIN_LETTER.test(value);

/**
 * The language a list is written in, when it is Arabic throughout: every
 * domain and competency is named in Arabic only. Such a list (the Arabic grids
 * the school fills in on paper) reads in Arabic and right to left, whatever
 * the interface language; any other list follows the interface.
 */
export function catalogLanguage(domains: readonly CompetencyDomain[]): 'ar' | null {
  const names = domains.flatMap((domain) => [domain, ...domain.competencies])
    .flatMap((entry) => [entry.name, entry.altName ?? '']).filter(Boolean);
  return names.length && names.every(isArabicText) ? 'ar' : null;
}
