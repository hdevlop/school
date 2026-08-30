import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

import {
  isSchoolCurrency,
  isSchoolTheme,
  isSchoolTimeZone,
  normalizeSchoolCurrency,
  normalizeSchoolLanguage,
  normalizeSchoolTimeZone,
  SCHOOL_FORMATTING_LOCALES,
} from '@/preferences';
import { SCHOOL_UI_COOKIES, SCHOOL_UI_COOKIE_OPTIONS } from '@/preferences/cookies';

function readSource(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), 'utf8');
}

describe('najm-theme adoption — School boundary', () => {
  test('normalizes only supported render preferences', () => {
    expect(normalizeSchoolLanguage('ar')).toBe('ar');
    expect(normalizeSchoolLanguage('unknown')).toBe('en');
    expect(isSchoolTheme('light')).toBe(true);
    expect(isSchoolTheme('system')).toBe(false);
    expect(isSchoolTimeZone('Africa/Casablanca')).toBe(true);
    expect(isSchoolTimeZone('not/a-zone')).toBe(false);
    expect(normalizeSchoolTimeZone('not/a-zone')).toBe('Africa/Casablanca');
    expect(isSchoolCurrency('MAD')).toBe(true);
    expect(isSchoolCurrency('XXX')).toBe(false);
    expect(normalizeSchoolCurrency('XXX')).toBe('MAD');
    // Morocco, not France or Spain: language and region are separate choices.
    expect(SCHOOL_FORMATTING_LOCALES).toEqual({
      ar: 'ar-MA',
      en: 'en-MA',
      es: 'es-MA',
      fr: 'fr-MA',
    });
  });

  test('creates one package-owned server bootstrap at module scope', () => {
    const source = readSource('./serverTheme.ts');

    expect(source).toStartWith("import 'server-only';");
    expect(source).toContain("from '@sms/server/theme'");
    expect(source).toContain("(await import('@sms/server')).server");
    expect(source).toContain("basePath: '/api'");
    expect(source.match(/schoolTheme\.react\(/g)).toHaveLength(1);
    expect(source).not.toContain('new Request');
    expect(source).not.toContain('createReactThemeBootstrap');
  });

  test('uses one Najm UI and branding provider without duplicate theme state', () => {
    const source = readSource('../app/providers.tsx');

    expect(source).toContain("from 'najm-kit/app'");
    expect(source).toContain('<NajmAppProvider');
    expect(source).toContain('<NThemeBrandingProvider branding={initialBranding}>');
    expect(source).toContain('<QueryProvider>');
    expect(source).toContain('translations={translations}');
    expect(source).toContain('languageEndpoint=');
    expect(source).toContain('currency={preferences.currency}');
    expect(source).not.toContain('QueryClient');
    // What is mounted, not what is written about: the file's own comment names
    // the providers this one replaced, and deleting that sentence would not
    // make the guard stronger.
    expect(source).not.toMatch(/from ['"]next-themes['"]/);
    expect(source).not.toMatch(/<NajmDesignProvider\b/);
    expect(source).not.toMatch(/<ThemeProvider\b/);
    expect(source).not.toContain('applySmsTypographyVars');
  });

  test('keeps next-themes out of the workspace entirely', () => {
    const manifest = readSource('../../package.json');
    expect(manifest).not.toContain('next-themes');
  });

  test('loads the snapshot at the root and renders every factory branding slot', () => {
    const root = readSource('../app/layout.tsx');
    // The auth frame, not the auth layout: the layout resolves the session and
    // hands off, and the two branding slots live in the frame it renders.
    const auth = readSource('../app/(auth)/AuthFrame.tsx');
    const shell = readSource('../shared/DashboardShell/index.tsx');

    expect(root).toContain("from '@/lib/serverTheme'");
    expect(root).toContain('loadServerAppearance()');
    expect(root).toContain('loadServerBranding()');
    expect(auth).toContain('slot="authLogo"');
    expect(auth).toContain('slot="authHeroImage"');
    expect(shell).toContain("'sidebarLogoExpanded'");
    expect(shell).toContain("'sidebarLogoCollapsed'");
    expect(auth).not.toContain('loginBackground.png');
    expect(shell).not.toContain('logo.png');
  });

  test('keeps preference cookies validated and server-only', () => {
    expect(SCHOOL_UI_COOKIES).toEqual({
      language: 'school-ui-language',
      theme: 'school-ui-theme',
      timeZone: 'school-ui-timezone',
    });
    expect(SCHOOL_UI_COOKIE_OPTIONS.httpOnly).toBe(true);
    expect(SCHOOL_UI_COOKIE_OPTIONS.sameSite).toBe('lax');
    expect(SCHOOL_UI_COOKIE_OPTIONS.path).toBe('/');
    expect(SCHOOL_UI_COOKIE_OPTIONS.maxAge).toBeGreaterThan(0);

    for (const relativePath of [
      '../app/api/ui-language/route.ts',
      '../app/api/ui-theme/route.ts',
      '../app/api/ui-timezone/route.ts',
    ]) {
      const source = readSource(relativePath);
      // One definition of the cookie policy, applied by every handler.
      expect(source).toContain('SCHOOL_UI_COOKIE_OPTIONS');
      expect(source).toContain('status: 400');
      // Cleared on sign-out so a shared machine does not carry one person's
      // preferences into the next person's session.
      expect(source).toContain('export async function DELETE');
    }
  });

  test('resolves render preferences in the documented order', () => {
    const source = readSource('./serverPreferences.ts');

    expect(source).toStartWith("import 'server-only';");
    // cookie, then the signed-in user, then School settings, then the fallback.
    const order = source.slice(source.indexOf('const language = resolve'));
    const cookieAt = order.indexOf('cookieStore.get(SCHOOL_UI_COOKIES.language)');
    const userAt = order.indexOf('user?.language');
    const settingsAt = order.indexOf('settings?.language');
    expect(cookieAt).toBeGreaterThan(-1);
    expect(userAt).toBeGreaterThan(cookieAt);
    expect(settingsAt).toBeGreaterThan(userAt);
  });

  test('reads School settings once per render and never fails the page for them', () => {
    const source = readSource('./serverSettings.ts');

    expect(source).toStartWith("import 'server-only';");
    expect(source).toContain('cache(');
    // Sanitized: the error's shape, never the row, the payload, or the thrown
    // value itself.
    expect(source).toContain("error instanceof Error ? error.name : 'unknown'");
  });
});
