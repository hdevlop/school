import { describe, expect, mock, test } from 'bun:test';
import { readFileSync } from 'node:fs';

import { schoolI18n } from '@sms/server/locales';
import {
  isSchoolCurrency,
  isSchoolTheme,
  isSchoolTimeZone,
  normalizeSchoolCurrency,
  normalizeSchoolLanguage,
  normalizeSchoolTimeZone,
  SCHOOL_FORMATTING_LOCALES,
} from '@/preferences';

mock.module('server-only', () => ({}));

const {
  DELETE: deleteLanguage,
  POST: postLanguage,
} = await import('../app/api/ui-language/route');
const { schoolPreferences } = await import('@/najm.server');

function readSource(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), 'utf8');
}

describe('Najm app integration — School boundary', () => {
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
    expect(SCHOOL_FORMATTING_LOCALES).toEqual({
      ar: 'ar-MA',
      en: 'en-MA',
      es: 'es-MA',
      fr: 'fr-MA',
    });
  });

  test('creates one package-owned server composition at module scope', () => {
    const source = readSource('../najm.server.ts');

    expect(source).toStartWith("import 'server-only';");
    expect(source).toContain("from '@sms/server/theme'");
    expect(source).toContain("(await import('@sms/server')).server");
    expect(source).toContain("basePath: '/api'");
    expect(source.match(/createNajmNextServerApp\(/g)).toHaveLength(1);
    expect(source).not.toContain('schoolTheme.react(');
    expect(source).toContain('mapPreferences: (preferences) => ({');
    expect(source).toContain('direction: schoolI18n.direction(preferences.language)');
    expect(source).toContain('locale: schoolI18n.locale(preferences.language)');
    expect(source).toContain('loadSchoolUiSettings');
    expect(source).toContain('onDiagnostic');
  });

  test('uses one composed UI tree with the keyboard extension in the fixed slot', () => {
    const source = readSource('../app/providers.tsx');

    expect(source).toContain("import { NajmAppProvider } from 'najm-next/app/client'");
    expect(source).toContain('<NajmAppProvider');
    expect(source).not.toContain('NajmNextAppProvider');
    expect(source).not.toContain('NThemeBrandingProvider');
    expect(source).not.toContain('QueryClientProvider');
    expect(source).toContain('defineNajmTanStackQuery');
    expect(source).toContain('const extensions = { beforeUi: keyboardProvider }');
    expect(source).toContain('i18n={schoolI18n}');
    expect(source).toContain('currency={snapshot.preferences.currency}');
    expect(source).toContain('retry: 0');
    expect(source).not.toMatch(/from ['"]next-themes['"]/);
    expect(source).not.toMatch(/<NajmDesignProvider\b/);
    expect(source).not.toMatch(/<ThemeProvider\b/);
  });

  test('keeps locale validation, formatting, direction, and translation together', () => {
    expect(schoolI18n.normalizeLanguage('unknown')).toBe('en');
    expect(schoolI18n.locale('fr')).toBe('fr-MA');
    expect(schoolI18n.direction('ar')).toBe('rtl');
    expect(schoolI18n.translate('fr', 'common.feedback.retryLabel')).not.toBe(
      'common.feedback.retryLabel',
    );
  });

  test('loads the complete snapshot at the root and renders factory slots', () => {
    const root = readSource('../app/layout.tsx');
    const auth = readSource('../app/(auth)/AuthFrame.tsx');
    const shell = readSource('../shared/DashboardShell/index.tsx');

    expect(root).toContain("from '@/najm.server'");
    expect(root).toContain('await loadUiSnapshot()');
    expect(root).toContain('<AppProviders snapshot={snapshot}>');
    expect(auth).toContain('slot="authLogo"');
    expect(auth).toContain('slot="authHeroImage"');
    expect(shell).toContain("'sidebarLogoExpanded'");
    expect(shell).toContain("'sidebarLogoCollapsed'");
  });

  test('keeps exact preference cookies and shared POST/DELETE handlers', () => {
    expect(schoolPreferences.cookieNames).toEqual({
      language: 'school-ui-language',
      theme: 'school-ui-theme',
      timeZone: 'school-ui-timezone',
    });
    expect(schoolPreferences.cookieOptions.httpOnly).toBe(true);
    expect(schoolPreferences.cookieOptions.sameSite).toBe('lax');
    expect(schoolPreferences.cookieOptions.path).toBe('/');
    expect(schoolPreferences.cookieOptions.maxAge).toBeGreaterThan(0);

    for (const [relativePath, preference] of [
      ['../app/api/ui-language/route.ts', 'language'],
      ['../app/api/ui-theme/route.ts', 'theme'],
      ['../app/api/ui-timezone/route.ts', 'timeZone'],
    ] as const) {
      const source = readSource(relativePath);
      expect(source).toContain(`schoolPreferences.routes.${preference}`);
      expect(source).toContain('POST, DELETE');
    }
  });

  test('resolves cookie, user, institution and typed fallback in the shared owner', () => {
    const cookies = new Map<string, string>();
    cookies.set(schoolPreferences.cookieNames.language, 'invalid');
    cookies.set(schoolPreferences.cookieNames.theme, 'dark');

    const result = schoolPreferences.resolveOrdered(
      { get: (name) => (cookies.has(name) ? { value: cookies.get(name)! } : undefined) },
      {
        user: { language: 'fr', theme: 'light', timeZone: 'invalid' },
        institution: {
          language: 'ar',
          theme: 'light',
          timeZone: 'Europe/Paris',
          currency: 'EUR',
        },
      },
    );

    expect(result).toEqual({
      language: 'fr',
      theme: 'dark',
      timeZone: 'Europe/Paris',
      currency: 'EUR',
    });
  });

  test('keeps currency institution-owned', () => {
    const result = schoolPreferences.resolveOrdered(
      { get: () => undefined },
      {
        user: { language: 'es' },
        institution: { currency: 'GBP' },
      },
    );
    expect(result.currency).toBe('GBP');
  });

  test('preserves preference response and cookie compatibility', async () => {
    const accepted = await postLanguage(
      new Request('https://school.test/api/ui-language', {
        method: 'POST',
        body: JSON.stringify({ language: 'fr' }),
      }),
    );
    expect(accepted.status).toBe(200);
    expect(await accepted.json()).toEqual({ language: 'fr' });
    expect(accepted.headers.get('set-cookie')).toContain(
      'school-ui-language=fr',
    );

    const rejected = await postLanguage(
      new Request('https://school.test/api/ui-language', {
        method: 'POST',
        body: JSON.stringify({ language: 'unsupported' }),
      }),
    );
    expect(rejected.status).toBe(400);
    expect(rejected.headers.has('set-cookie')).toBe(false);

    const cleared = await deleteLanguage(
      new Request('https://school.test/api/ui-language', { method: 'DELETE' }),
    );
    expect(cleared.status).toBe(200);
    expect(cleared.headers.get('set-cookie')).toContain(
      'school-ui-language=',
    );
  });
});
