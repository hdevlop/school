'use client';

import { NajmAppProvider } from 'najm-next/app/client';
import type { ReactNode } from 'react';

import { schoolI18n } from '@sms/contracts/locales';
import { auth } from '@/najm.auth';
import type { SchoolUiSnapshot } from '@/najm.server';

// Below lg every table is one card list that reveals rows as the page scrolls.
// Module scope keeps the object stable, so no table re-renders for it.
const TABLE_DEFAULTS = { mobileList: true };

export function AppProviders({  children,snapshot}: Readonly<{ children: ReactNode; snapshot: SchoolUiSnapshot }>) {
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
