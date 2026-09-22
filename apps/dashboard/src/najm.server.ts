import 'server-only';

import { defineNajmPreferences, NAJM_CURRENCIES } from 'najm-kit/server';
import { createNajmNextServerApp } from 'najm-next/app/next';

import type { SchoolUiSettings } from '@sms/server';
import { schoolI18n } from '@sms/contracts/locales';
import { schoolTheme } from '@sms/server/theme';
import { auth } from '@/najm.auth';
import {
  schoolApp,
  SCHOOL_DEFAULT_CURRENCY,
} from '@/najm.config';

export const schoolPreferences = defineNajmPreferences({
  i18n: schoolI18n,
  ...schoolApp.preferences,
  currencies: NAJM_CURRENCIES,
  defaultCurrency: SCHOOL_DEFAULT_CURRENCY,
  messages: {
    language: 'Unsupported language.',
    theme: 'Unsupported color theme.',
    timeZone: 'Unsupported time zone.',
  },
});

const fallbackSchoolSettings: SchoolUiSettings = {
  schoolName: null,
  language: null,
  theme: null,
  timeZone: null,
  currency: null,
};

export interface SchoolPublicUiSettings {
  school: SchoolUiSettings;
}

export const najmServer = createNajmNextServerApp({
  app: schoolApp,
  auth,
  theme: schoolTheme,
  themeOptions: {
    getServer: async () => (await import('@sms/server')).server,
    basePath: '/api',
  },
  preferences: schoolPreferences,
  acceptLanguage: false,
  preferenceSources: ({ settings }) => ({ institution: settings.school }),
  mapPreferences: (preferences) => ({
    ...preferences,
    direction: schoolI18n.direction(preferences.language),
    locale: schoolI18n.locale(preferences.language),
  }),
  readSettings: async (): Promise<SchoolPublicUiSettings> => {
    const { loadSchoolUiSettings } = await import('@sms/server');
    return {
      school: (await loadSchoolUiSettings()) ?? fallbackSchoolSettings,
    };
  },
  fallbackSettings: {
    school: fallbackSchoolSettings,
  },
  onDiagnostic: (diagnostic) => {
    console.warn('[school] public UI settings fallback', diagnostic);
  },
});

export const { getSession, requireSession, requireRole, loadSettings, loadUiSnapshot } = najmServer;
export type SchoolUiSnapshot = Awaited<ReturnType<typeof loadUiSnapshot>>;
