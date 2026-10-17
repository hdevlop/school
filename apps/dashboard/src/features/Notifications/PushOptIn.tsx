'use client';

import { useCallback, useEffect, useId, useState } from 'react';
import { BaseInput, Label, NButton, Switch } from 'najm-kit';
import { Bell } from 'lucide-react';
import { useTranslation } from 'najm-i18n/react';
import { useNotificationCommands, usePushConfig } from './useNotifications';
import { isNotFoundError } from '@/services/apiError';

const toBytes = (value: string) => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(normalized.padEnd(normalized.length + ((4 - normalized.length % 4) % 4), '='));
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
};
const toBase64Url = (buffer: ArrayBuffer | null) => {
  if (!buffer) return '';
  let value = '';
  for (const byte of new Uint8Array(buffer)) value += String.fromCharCode(byte);
  return btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

export function PushOptIn() {
  const { t } = useTranslation();
  const explanationId = useId();
  const config = usePushConfig();
  const commands = useNotificationCommands();
  const [enabled, setEnabled] = useState(false);
  const [status, setStatus] = useState<'loading' | 'ready' | 'unsupported' | 'denied' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    setStatus('loading');
    if (!window.isSecureContext || !('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return setStatus('unsupported');
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

  async function toggle(next: boolean) {
    if (status !== 'ready' || !config.isSuccess || !config.data.enabled || !config.data.publicKey) return;
    setError(null);
    setStatus('loading');
    let createdSubscription: PushSubscription | null = null;
    try {
      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      if (!next) {
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
        if (await Notification.requestPermission() !== 'granted') return setStatus('denied');
        const subscription = existing ?? await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toBytes(config.data.publicKey) });
        if (!existing) createdSubscription = subscription;
        await commands.subscribe.mutateAsync({ endpoint: subscription.endpoint, p256dh: toBase64Url(subscription.getKey('p256dh')), auth: toBase64Url(subscription.getKey('auth')) });
        setEnabled(true);
      }
      setStatus('ready');
    } catch (reason) {
      if (createdSubscription) {
        // Do not leave a new browser subscription behind when its server
        // registration fails. Existing subscriptions belong to earlier opt-ins.
        try {
          if (!await createdSubscription.unsubscribe() && await (await navigator.serviceWorker.ready).pushManager.getSubscription()) {
            throw new Error(t('notifications.pushError'));
          }
        } catch {
          setError(t('notifications.pushError'));
          setStatus('ready');
          return;
        }
      }
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
  const showHelp = Boolean(error) || status !== 'ready' || !config.isSuccess || !config.data.enabled || !config.data.publicKey;
  const explanation = showHelp ? text : undefined;

  return (
    <BaseInput variant="ghost" className="gap-2 justify-between items-center" title={explanation}>
      <div className="flex min-w-0 flex-col gap-1">
        <Label htmlFor="push-notifications" className="flex items-center gap-2">
          <span className="h-4 w-4 shrink-0"><Bell className="h-4 w-4" /></span>
          <span className="truncate">{t('notifications.pushTitle')}</span>
        </Label>
        <span id={explanationId} role="status" className="sr-only">{explanation}</span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {(status === 'error' || config.isError) && (
          <NButton size="sm" variant="ghost" onClick={() => {
            void config.refetch();
            void refresh();
          }}>{t('common.feedback.retryLabel')}</NButton>
        )}
        <Switch id="push-notifications" aria-label={t('notifications.pushTitle')} aria-describedby={explanation ? explanationId : undefined} checked={enabled} disabled={status !== 'ready' || !config.isSuccess || !config.data.enabled || !config.data.publicKey} onCheckedChange={(next) => void toggle(next)} />
      </div>
    </BaseInput>
  );
}
