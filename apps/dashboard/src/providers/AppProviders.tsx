'use client';

import { NajmAppProvider } from 'najm-next/app/client';
import type { ReactNode } from 'react';

import { schoolI18n } from '@sms/contracts/locales';
import { isDevFill } from '@/lib/devFill';
import { auth } from '@/najm.auth';
import type { SchoolUiSnapshot } from '@/najm.server';

export function AppProviders({  children,snapshot}: Readonly<{ children: ReactNode; snapshot: SchoolUiSnapshot }>) {
  return (
    <NajmAppProvider
      authClient={auth.client}
      snapshot={snapshot}
      i18n={schoolI18n}
      formDevTools={isDevFill}
    >
      {children}
    </NajmAppProvider>
  );
}
