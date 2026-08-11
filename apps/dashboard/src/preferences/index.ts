/**
 * School's typed UI preference allowlists.
 *
 * These are the only values School will persist in a cookie, put on the root
 * `html` element, or hand to `NajmAppProvider`. Everything that reaches the
 * provider is normalized through this module first, so an unsupported locale,
 * class name, time zone, or currency code never becomes application state.
 */

export const SCHOOL_SUPPORTED_LANGUAGES = ['en', 'fr', 'ar', 'es'] as const;

export type SchoolLanguage = (typeof SCHOOL_SUPPORTED_LANGUAGES)[number];

export const SCHOOL_DEFAULT_LANGUAGE: SchoolLanguage = 'en';

/**
 * Language is a catalog choice; the formatting locale is a regional one. School
 * is a Moroccan product, so every supported language formats dates, separators,
 * and money the way they are written in Morocco rather than in France or Spain.
 */
export const SCHOOL_FORMATTING_LOCALES: Readonly<Record<SchoolLanguage, string>> = {
  ar: 'ar-MA',
  en: 'en-MA',
  es: 'es-MA',
  fr: 'fr-MA',
};

/**
 * `light | dark` only.
 *
 * Najm Kit's verified `NajmMode` has no `system` member, and a visible option
 * that silently behaves as `light` is worse than not offering it. School's
 * stored `system` rows are migrated to `light` instead.
 */
export type SchoolTheme = 'light' | 'dark';

export const SCHOOL_DEFAULT_THEME: SchoolTheme = 'light';

export const SCHOOL_DEFAULT_TIME_ZONE = 'Africa/Casablanca' as const;

export const SCHOOL_SUPPORTED_TIME_ZONES = [
  'Africa/Casablanca',
  'Africa/Tunis',
  'Africa/Algiers',
  'Africa/Cairo',
  'Europe/Paris',
  'Europe/Madrid',
  'Europe/London',
  'Europe/Berlin',
  'Europe/Istanbul',
  'America/New_York',
  'America/Los_Angeles',
  'UTC',
] as const;

export type SchoolTimeZone = (typeof SCHOOL_SUPPORTED_TIME_ZONES)[number];

/**
 * The currencies School's settings surface offers.
 *
 * School settings are the normal source; this list exists so a corrupt or
 * hand-edited settings row cannot reach `useNajmFormat().money`, where the
 * failure mode is an amount rendered in the wrong currency.
 */
export const SCHOOL_SUPPORTED_CURRENCIES = [
  'MAD',
  'USD',
  'EUR',
  'GBP',
  'CAD',
  'AUD',
  'JPY',
  'CNY',
  'INR',
  'AED',
  'SAR',
  'EGP',
] as const;

export type SchoolCurrency = (typeof SCHOOL_SUPPORTED_CURRENCIES)[number];

export const SCHOOL_DEFAULT_CURRENCY: SchoolCurrency = 'MAD';

const schoolLanguageSet: ReadonlySet<string> = new Set(SCHOOL_SUPPORTED_LANGUAGES);
const schoolTimeZoneSet: ReadonlySet<string> = new Set(SCHOOL_SUPPORTED_TIME_ZONES);
const schoolCurrencySet: ReadonlySet<string> = new Set(SCHOOL_SUPPORTED_CURRENCIES);

export function isSchoolLanguage(value: unknown): value is SchoolLanguage {
  return typeof value === 'string' && schoolLanguageSet.has(value);
}

export function normalizeSchoolLanguage(value: unknown): SchoolLanguage {
  return isSchoolLanguage(value) ? value : SCHOOL_DEFAULT_LANGUAGE;
}

export function isSchoolTheme(value: unknown): value is SchoolTheme {
  return value === 'light' || value === 'dark';
}

export function normalizeSchoolTheme(value: unknown): SchoolTheme {
  return isSchoolTheme(value) ? value : SCHOOL_DEFAULT_THEME;
}

export function isSchoolTimeZone(value: unknown): value is SchoolTimeZone {
  return typeof value === 'string' && schoolTimeZoneSet.has(value);
}

export function normalizeSchoolTimeZone(value: unknown): SchoolTimeZone {
  return isSchoolTimeZone(value) ? value : SCHOOL_DEFAULT_TIME_ZONE;
}

export function isSchoolCurrency(value: unknown): value is SchoolCurrency {
  return typeof value === 'string' && schoolCurrencySet.has(value);
}

export function normalizeSchoolCurrency(value: unknown): SchoolCurrency {
  return isSchoolCurrency(value) ? value : SCHOOL_DEFAULT_CURRENCY;
}

/** The BCP 47 tag School formats with for a given language. */
export function schoolFormattingLocale(language: SchoolLanguage): string {
  return SCHOOL_FORMATTING_LOCALES[language];
}

/** Arabic is School's only right-to-left catalog. */
export function schoolTextDirection(language: SchoolLanguage): 'ltr' | 'rtl' {
  return language === 'ar' ? 'rtl' : 'ltr';
}
