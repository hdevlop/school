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
import { STATUS_COLOR_MAP, STATUS_LABEL_KEYS } from '@/lib/statusBadge';
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

/**
 * Module scope on purpose: the provider rebuilds its resolved badge bundle
 * whenever this object's identity changes.
 */
const SCHOOL_BADGE_DEFAULTS = {
  statusMap: STATUS_COLOR_MAP,
  statusLabelKeys: STATUS_LABEL_KEYS,
};

/**
 * The words every loading, empty, error, forbidden and not-found state uses.
 *
 * Spelled out key by key rather than through `prefix`: the provider computes a
 * prefix and then discards it, so `labelKeys` is the only wiring that actually
 * resolves through `t`. Without this the kit falls back to packaged English —
 * a French user reading "Access denied".
 *
 * Module scope for the same reason as the badge bundle above.
 */
const SCHOOL_FEEDBACK_DEFAULTS = {
  labelKeys: {
    loadingLabel: 'common.feedback.loadingLabel',
    emptyTitle: 'common.feedback.emptyTitle',
    errorTitle: 'common.feedback.errorTitle',
    errorMessage: 'common.feedback.errorMessage',
    retryLabel: 'common.feedback.retryLabel',
    forbiddenTitle: 'common.feedback.forbiddenTitle',
    forbiddenDescription: 'common.feedback.forbiddenDescription',
    notFoundTitle: 'common.feedback.notFoundTitle',
    notFoundDescription: 'common.feedback.notFoundDescription',
  },
};

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
            // The one place status badges are taught to speak the interface
            // language. Without it every `<NBadge status={…} />` in the app
            // falls through to a humanized English token, whatever the
            // language — see `STATUS_LABEL_KEYS`.
            badgeDefaults={SCHOOL_BADGE_DEFAULTS}
            currency={preferences.currency}
            feedbackDefaults={SCHOOL_FEEDBACK_DEFAULTS}
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
