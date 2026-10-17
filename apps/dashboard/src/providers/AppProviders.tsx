'use client';

import { NajmAppProvider } from 'najm-next/app/client';
import { useEffect, type ReactNode } from 'react';

import { schoolI18n } from '@sms/contracts/locales';
import { auth } from '@/najm.auth';
import { languageHeader } from '@/lib/requestHeaders';
import type { SchoolUiSnapshot } from '@/najm.server';

// Below lg every table is one card list that reveals rows as the page scrolls.
// Module scope keeps the object stable, so no table re-renders for it.
const TABLE_DEFAULTS = { mobileList: true };

export function AppProviders({  children,snapshot}: Readonly<{ children: ReactNode; snapshot: SchoolUiSnapshot }>) {
  // Auth operations bypass services/http, so they name the page language here;
  // a reset requested from a sign-in page is then emailed in that language.
  useEffect(() => auth.client.setRequestHeaders(() => languageHeader()), []);

  return (
    <NajmAppProvider
      authClient={auth.client}
      snapshot={snapshot}
      i18n={schoolI18n}
      formDevTools={false}
      tableDefaults={TABLE_DEFAULTS}
    >
      {children}
    </NajmAppProvider>
  );
}
