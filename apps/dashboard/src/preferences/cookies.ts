/**
 * School's UI preference cookies.
 *
 * School-specific names, because the browser has one cookie jar per origin and
 * a generic `ui-theme` would collide with anything else served from it.
 *
 * `httpOnly` because these are read by the root Server Component to decide the
 * first paint, never by client script — the client already has the same values
 * from the provider it seeded.
 */
export const SCHOOL_UI_COOKIES = {
  language: 'school-ui-language',
  theme: 'school-ui-theme',
  timeZone: 'school-ui-timezone',
} as const;

export type SchoolUiCookieName =
  (typeof SCHOOL_UI_COOKIES)[keyof typeof SCHOOL_UI_COOKIES];

/** A year: a display preference is not a credential and does not expire with one. */
export const SCHOOL_UI_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const SCHOOL_UI_COOKIE_OPTIONS = {
  httpOnly: true,
  maxAge: SCHOOL_UI_COOKIE_MAX_AGE,
  path: '/',
  sameSite: 'lax',
} as const;

/**
 * The endpoints `NajmAppProvider` POSTs each preference to, and that sign-out
 * DELETEs.
 */
export const SCHOOL_UI_PREFERENCE_ENDPOINTS = {
  language: '/api/ui-language',
  theme: '/api/ui-theme',
  timeZone: '/api/ui-timezone',
} as const;
