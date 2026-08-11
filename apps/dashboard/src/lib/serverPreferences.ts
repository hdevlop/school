import 'server-only';

import { cookies } from 'next/headers';
import type { ServerSession } from 'najm-auth/client/server';

import { loadSchoolSettings } from '@/lib/serverSettings';
import {
  SCHOOL_DEFAULT_CURRENCY,
  SCHOOL_DEFAULT_LANGUAGE,
  SCHOOL_DEFAULT_THEME,
  SCHOOL_DEFAULT_TIME_ZONE,
  isSchoolCurrency,
  isSchoolLanguage,
  isSchoolTheme,
  isSchoolTimeZone,
  schoolFormattingLocale,
  schoolTextDirection,
  type SchoolCurrency,
  type SchoolLanguage,
  type SchoolTheme,
  type SchoolTimeZone,
} from '@/preferences';
import { SCHOOL_UI_COOKIES } from '@/preferences/cookies';

export interface SchoolPreferenceSnapshot {
  language: SchoolLanguage;
  direction: 'ltr' | 'rtl';
  locale: string;
  theme: SchoolTheme;
  timeZone: SchoolTimeZone;
  currency: SchoolCurrency;
}

/**
 * Picks the first candidate the allowlist accepts.
 *
 * The order is the whole point and is the same for every preference:
 *
 *   1. a valid School UI cookie — the most recent explicit choice, and the only
 *      source available before a session exists;
 *   2. the authenticated user's stored preference, where the field exists;
 *   3. public School settings — the institution's default;
 *   4. the typed application fallback.
 *
 * Every candidate goes through the same guard, so an unsupported value does not
 * win the round: it is skipped and the next source is tried.
 */
function resolve<T>(candidates: unknown[], guard: (value: unknown) => value is T, fallback: T): T {
  for (const candidate of candidates) {
    if (guard(candidate)) return candidate;
  }
  return fallback;
}

/**
 * The serializable UI state the root Server Component hands to the client
 * provider, and that the root `html` element is rendered from.
 *
 * Currency is deliberately *not* defaulted per-language: rendering an amount in
 * the wrong currency is worse than showing the institution's configured one to
 * a user reading in another language.
 */
export async function resolveSchoolPreferences(
  session: ServerSession | null,
): Promise<SchoolPreferenceSnapshot> {
  const [cookieStore, settings] = await Promise.all([cookies(), loadSchoolSettings()]);

  const user = session?.user as
    | { language?: unknown; timeZone?: unknown; theme?: unknown }
    | undefined;

  const language = resolve<SchoolLanguage>(
    [
      cookieStore.get(SCHOOL_UI_COOKIES.language)?.value,
      user?.language,
      settings?.language,
    ],
    isSchoolLanguage,
    SCHOOL_DEFAULT_LANGUAGE,
  );

  const theme = resolve<SchoolTheme>(
    [cookieStore.get(SCHOOL_UI_COOKIES.theme)?.value, user?.theme, settings?.theme],
    isSchoolTheme,
    SCHOOL_DEFAULT_THEME,
  );

  const timeZone = resolve<SchoolTimeZone>(
    [
      cookieStore.get(SCHOOL_UI_COOKIES.timeZone)?.value,
      user?.timeZone,
      settings?.timeZone,
    ],
    isSchoolTimeZone,
    SCHOOL_DEFAULT_TIME_ZONE,
  );

  const currency = resolve<SchoolCurrency>(
    [settings?.currency],
    isSchoolCurrency,
    SCHOOL_DEFAULT_CURRENCY,
  );

  return {
    language,
    direction: schoolTextDirection(language),
    locale: schoolFormattingLocale(language),
    theme,
    timeZone,
    currency,
  };
}
