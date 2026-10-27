'use client';

import { useAuth } from 'najm-auth/client/react';
import { useTranslation } from 'najm-i18n/react';
import { useQueryClient } from '@tanstack/react-query';
import { useOfflinePreparation } from 'najm-offline/react';
import { OFFLINE_NAMESPACE } from '@sms/contracts/offline';
import { auth } from '@/najm.auth';
import type { SchoolUiSnapshot } from '@/najm.server';
import { BOOTSTRAP_KEY, SHELL_BRANDING, isShellPath } from './bootstrap';
import { shellUpdates } from './updates';
import { isKnownOffline } from './runtime';

export function OfflinePreparation({ snapshot }: { snapshot: SchoolUiSnapshot }) {
  const { user } = useAuth();
  const { language } = useTranslation();
  const queryClient = useQueryClient();
  useOfflinePreparation({
    namespace: OFFLINE_NAMESPACE, enabled: process.env.NODE_ENV === 'production', version: process.env.NEXT_PUBLIC_SCHOOL_SHELL_VERSION,
    signedIn: !!user, language, branding: snapshot.branding, brandingCache: SHELL_BRANDING, authClient: auth.client,
    bootstrapKey: BOOTSTRAP_KEY, isShellPath, isKnownOffline, busy: () => queryClient.isMutating() > 0, updates: shellUpdates,
  });
  return null;
}
