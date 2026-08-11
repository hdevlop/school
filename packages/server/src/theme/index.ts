import { defineTheme } from 'najm-theme/theme';

export const SCHOOL_LOGO_MAX_BYTES = 2_000_000;
export const SCHOOL_HERO_MAX_BYTES = 5_000_000;

/**
 * School's canonical factory theme.
 *
 * `defineTheme` resolves `theme.json` and the four fixed branding files next
 * to this module, so dev, builds, and production do not depend on cwd.
 */
export const schoolTheme = defineTheme(import.meta.url, {
  limits: {
    logoBytes: SCHOOL_LOGO_MAX_BYTES,
    heroBytes: SCHOOL_HERO_MAX_BYTES,
  },
});
