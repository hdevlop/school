"use client";

import type { ReactNode } from 'react';
import type { ServerSession } from 'najm-auth/client/server';
import { AuthProvider } from 'najm-auth/client/react';
import { NajmAppProvider } from 'najm-kit/app';
import type { NajmDesignConfig } from 'najm-kit';
import type { PublicBranding } from 'najm-theme';
import { NThemeBrandingProvider } from 'najm-theme/react';
import translations from '@sms/server/locales';
import { auth } from '@/lib/auth';
import { KeyboardProvider } from '@/providers/KeyboardProvider';
import { QueryProvider } from '@/providers/QueryProvider';
import type { SchoolPreferenceSnapshot } from '@/lib/serverPreferences';
import {
  SCHOOL_FORMATTING_LOCALES,
  normalizeSchoolTimeZone,
} from '@/preferences';
import { SCHOOL_UI_PREFERENCE_ENDPOINTS } from '@/preferences/cookies';
import { isDevFill } from '@/lib/devFill';

const SCHOOL_APP_NAME = 'MyScolAI';

type Props = {
  children: ReactNode;
  initialBranding: PublicBranding;
  initialDesign: NajmDesignConfig;
  initialSession: ServerSession | null;
  preferences: SchoolPreferenceSnapshot;
};

/**
 * School's provider composition.
 *
 * Auth and React Query stay app-owned and above the UI layer — they are not UI
 * concerns and Najm Kit deliberately does not own them. `KeyboardProvider` is
 * kept only for School's own shortcuts; F8 form filling belongs to the package
 * below it.
 *
 * `NajmAppProvider` is the single UI-provider boundary: language, design,
 * light/dark theme, time zone, branding, formatting, and `NTable` defaults. It
 * replaces the `next-themes` provider, the direct `NajmDesignProvider`, the
 * mount-only theme workaround, and the manual typography variable application
 * School used to compose here by hand.
 */
export function AppProviders({
  children,
  initialBranding,
  initialDesign,
  initialSession,
  preferences,
}: Props) {
  return (
    <AuthProvider client={auth.client} initialSession={initialSession}>
      <QueryProvider>
        <KeyboardProvider>
          <NajmAppProvider
            appName={SCHOOL_APP_NAME}
            currency={preferences.currency}
            endpoints={{
              theme: SCHOOL_UI_PREFERENCE_ENDPOINTS.theme,
              timeZone: SCHOOL_UI_PREFERENCE_ENDPOINTS.timeZone,
            }}
            // Seeds the marks the kit's own chrome renders. The four managed
            // slots stay with `NThemeBrandingProvider` below, which is fed the
            // same server snapshot.
            initialBranding={{
              sidebarLogoExpandedPath: initialBranding.slots.sidebarLogoExpanded,
              sidebarLogoCollapsedPath: initialBranding.slots.sidebarLogoCollapsed,
            }}
            initialDesign={initialDesign}
            initialLanguage={preferences.language}
            initialTheme={preferences.theme}
            initialTimeZone={preferences.timeZone}
            languageEndpoint={SCHOOL_UI_PREFERENCE_ENDPOINTS.language}
            locales={SCHOOL_FORMATTING_LOCALES}
            // The provider's own IANA check would accept any valid zone; School
            // persists only the zones its settings surface offers.
            normalizeTimeZone={normalizeSchoolTimeZone}
            translations={translations}
            // Opt-in only, and never on for a production user: `isDevFill`
            // reads NEXT_PUBLIC_FORM_FILL_ENABLED, which deployments leave off.
            formDevTools={isDevFill}
          >
            <NThemeBrandingProvider branding={initialBranding}>
              {children}
            </NThemeBrandingProvider>
          </NajmAppProvider>
        </KeyboardProvider>
      </QueryProvider>
    </AuthProvider>
  );
}
