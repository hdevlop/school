'use client';

import type { QueryClient } from '@tanstack/react-query';
import { NajmAppProvider } from 'najm-next/app/client';
import {
  bindNajmNextProvider,
  type NajmNextProviderContext,
} from 'najm-next/app/react';
import { defineNajmTanStackQuery } from 'najm-next/query/tanstack';
import type { ReactNode } from 'react';

import { schoolI18n } from '@sms/server/locales';
import { SCHOOL_APP_NAME } from '@/lib/appName';
import { isDevFill } from '@/lib/devFill';
import { STATUS_COLOR_MAP, STATUS_LABEL_KEYS } from '@/lib/statusBadge';
import { auth } from '@/najm.auth';
import type { SchoolUiSnapshot } from '@/najm.server';
import { normalizeSchoolTimeZone } from '@/preferences';
import { KeyboardProvider } from '@/providers/KeyboardProvider';

const SCHOOL_BADGE_DEFAULTS = {
  statusMap: STATUS_COLOR_MAP,
  statusLabelKeys: STATUS_LABEL_KEYS,
};

type ProviderContext = NajmNextProviderContext<SchoolUiSnapshot, QueryClient>;

const query = defineNajmTanStackQuery({
  queries: {
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: 0,
  },
  mutations: { retry: 0 },
});

const keyboardProvider = bindNajmNextProvider(
  KeyboardProvider,
  (_context: ProviderContext) => ({}),
);

const extensions = { beforeUi: keyboardProvider } as const;

export function AppProviders({
  children,
  snapshot,
}: Readonly<{ children: ReactNode; snapshot: SchoolUiSnapshot }>) {
  return (
    <NajmAppProvider
      authClient={auth.client}
      snapshot={snapshot}
      query={query}
      extensions={extensions}
      appName={SCHOOL_APP_NAME}
      badgeDefaults={SCHOOL_BADGE_DEFAULTS}
      currency={snapshot.preferences.currency}
      i18n={schoolI18n}
      normalizeTimeZone={normalizeSchoolTimeZone}
      formDevTools={isDevFill}
    >
      {children}
    </NajmAppProvider>
  );
}
