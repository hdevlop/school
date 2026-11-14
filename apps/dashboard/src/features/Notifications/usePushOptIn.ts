'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'najm-i18n/react';
import { useNotificationCommands, usePushConfig } from './useNotifications';
import { isNotFoundError } from '@/services/apiError';
import { enablePushOnThisDevice, isPushSupported } from './pushSubscription';

/**
 * Push on this device: whether it is on, whether it can change, and why not.
 * The preferences page and the profile sheet both draw their switch from it,
 * so the two cannot disagree about one subscription.
 */
export function usePushOptIn() {
  const { t } = useTranslation();
  const config = usePushConfig();
  const commands = useNotificationCommands();
  const [enabled, setEnabled] = useState(false);
  const [status, setStatus] = useState<'loading' | 'ready' | 'unsupported' | 'denied' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    setStatus('loading');
    if (!isPushSupported()) return setStatus('unsupported');
    if (Notification.permission === 'denied') return setStatus('denied');
    try {
      const registration = await navigator.serviceWorker.ready;
      setEnabled(Boolean(await registration.pushManager.getSubscription()));
      setStatus('ready');
    } catch {
      setError(t('notifications.pushError'));
      setStatus('error');
    }
  }, [t]);
  useEffect(() => { void refresh(); }, [refresh]);

  const available = config.isSuccess && config.data.enabled && Boolean(config.data.publicKey);

  async function toggle(next: boolean) {
    if (status !== 'ready' || !config.isSuccess || !config.data.enabled || !config.data.publicKey) return;
    setError(null);
    setStatus('loading');
    try {
      if (!next) {
        const registration = await navigator.serviceWorker.ready;
        const existing = await registration.pushManager.getSubscription();
        const endpoint = existing?.endpoint;
        if (endpoint) {
          try {
            await commands.unsubscribe.mutateAsync(endpoint);
          } catch (reason) {
            // An earlier attempt may have removed the server row before the
            // browser rejected its cleanup. Retry the remaining browser step.
            if (!isNotFoundError(reason)) throw reason;
          }
        }
        if (existing && !await existing.unsubscribe() && await registration.pushManager.getSubscription()) {
          throw new Error(t('notifications.pushError'));
        }
        setEnabled(false);
      } else {
        if (await enablePushOnThisDevice(config.data.publicKey, commands.subscribe.mutateAsync, t('notifications.pushError')) === 'denied') return setStatus('denied');
        setEnabled(true);
      }
      setStatus('ready');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t('notifications.pushError'));
      setStatus('ready');
    }
  }

  let text = t('notifications.pushBody');
  if (config.isSuccess && (!config.data.enabled || !config.data.publicKey)) text = t('notifications.pushUnavailable');
  else if (config.isError) text = t('notifications.loadError');
  else if (error) text = error;
  else if (config.isPending || status === 'loading') text = t('notifications.loading');
  else if (status === 'unsupported') text = t('notifications.pushUnsupported');
  else if (status === 'denied') text = t('notifications.pushDenied');
  const showHelp = Boolean(error) || status !== 'ready' || !available;

  return {
    enabled,
    /** Whether the switch may be flipped now. */
    canToggle: status === 'ready' && available,
    toggle,
    /** Why the switch is off or cannot move; undefined when nothing needs saying. */
    explanation: showHelp ? text : undefined,
    /** A failed read, which a retry can recover from. */
    failed: status === 'error' || config.isError,
    retry: () => {
      void config.refetch();
      void refresh();
    },
  };
}
