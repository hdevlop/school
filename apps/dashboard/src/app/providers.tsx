'use client';

import type { QueryClient } from '@tanstack/react-query';
import {
  getNajmLocationLabels,
  type NCoordinates,
  type NLocationCandidate,
  type NLocationGeocoderAdapter,
} from 'najm-kit/location';
import {
  NLocationRuntimeProvider,
  type NLocationRuntimeConfig,
} from 'najm-kit/location/runtime';
import { NajmAppProvider } from 'najm-next/app/client';
import {
  bindNajmNextProvider,
  type NajmNextProviderContext,
} from 'najm-next/app/react';
import { defineNajmTanStackQuery } from 'najm-next/query/tanstack';
import { useTranslation } from 'najm-i18n/react';
import { useMemo, type ReactNode } from 'react';

import { schoolI18n } from '@sms/server/locales';
import { SCHOOL_APP_NAME } from '@/lib/appName';
import { isDevFill } from '@/lib/devFill';
import { STATUS_COLOR_MAP, STATUS_LABEL_KEYS } from '@/lib/statusBadge';
import { auth } from '@/najm.auth';
import type { SchoolUiSnapshot } from '@/najm.server';
import {
  normalizeSchoolTimeZone,
} from '@/preferences';
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

function createLazyGoogleGeocoder(
  options: Extract<NLocationRuntimeConfig, { provider: 'google' }>['google'],
): NLocationGeocoderAdapter {
  let adapterPromise: Promise<NLocationGeocoderAdapter> | null = null;
  const load = () => {
    adapterPromise ??= import('najm-kit/location/google').then(
      ({ createGooglePlacesGeocoder }) => createGooglePlacesGeocoder(options),
    );
    return adapterPromise;
  };

  return {
    id: 'school-google-places',
    async search(query, context) {
      return (await load()).search(query, context);
    },
    async resolve(candidate: NLocationCandidate, signal: AbortSignal) {
      const adapter = await load();
      return adapter.resolve ? adapter.resolve(candidate, signal) : candidate;
    },
    async reverse(coordinates: NCoordinates, signal: AbortSignal) {
      const adapter = await load();
      return adapter.reverse ? adapter.reverse(coordinates, signal) : null;
    },
    resetSession() {
      void adapterPromise?.then((adapter) => adapter.resetSession?.());
    },
  };
}

function SchoolLocationProvider({
  children,
  config,
}: Readonly<{ children: ReactNode; config: NLocationRuntimeConfig }>) {
  const { language, t } = useTranslation();
  const localizedConfig = useMemo<NLocationRuntimeConfig>(() => {
    if (config.provider !== 'google') return config;
    return {
      ...config,
      google: { ...config.google, language },
    };
  }, [config, language]);
  const geocoder = useMemo(
    () =>
      localizedConfig.provider === 'google'
        ? createLazyGoogleGeocoder(localizedConfig.google)
        : null,
    [localizedConfig],
  );

  return (
    <NLocationRuntimeProvider
      config={localizedConfig}
      geocoder={geocoder}
      labels={getNajmLocationLabels(language)}
      searchMode="autocomplete"
      unavailableReason={t('transport.location.unavailableDescription')}
    >
      {children}
    </NLocationRuntimeProvider>
  );
}

const keyboardProvider = bindNajmNextProvider(
  KeyboardProvider,
  (_context: ProviderContext) => ({}),
);

const location = {
  Provider: SchoolLocationProvider,
  selectProps: (snapshot: SchoolUiSnapshot) => ({
    config: snapshot.settings.locationConfig,
  }),
} as const;

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
      location={location}
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
