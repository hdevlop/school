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
  const { t, language } = useTranslation();
  const queryClient = useQueryClient();
  const { updateReady, blocked, updating, activate } = useOfflinePreparation({
    namespace: OFFLINE_NAMESPACE, enabled: process.env.NODE_ENV === 'production', version: process.env.NEXT_PUBLIC_SCHOOL_SHELL_VERSION,
    signedIn: !!user, language, branding: snapshot.branding, brandingCache: SHELL_BRANDING, authClient: auth.client,
    bootstrapKey: BOOTSTRAP_KEY, isShellPath, isKnownOffline, busy: () => queryClient.isMutating() > 0, updates: shellUpdates,
  });
  return updateReady || blocked ? <aside data-school-offline-status className="fixed bottom-2 end-2 z-40 max-w-sm rounded-md border bg-background px-3 py-2 text-xs" aria-live="polite">
    {updateReady && <button data-school-offline-action="update" type="button" disabled={updating} className="ms-3 underline" onClick={() => { void activate?.(); }}>{t('offlineShell.update')}</button>}
    {blocked && <p>{t('offlineShell.updateBlocked')}</p>}
  </aside> : null;
}
