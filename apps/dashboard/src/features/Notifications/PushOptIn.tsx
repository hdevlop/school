'use client';

import { useCallback, useEffect, useState } from 'react';
import { Switch } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { useNotificationCommands, usePushConfig } from './useNotifications';

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
  const config = usePushConfig();
  const commands = useNotificationCommands();
  const [enabled, setEnabled] = useState(false);
  const [status, setStatus] = useState<'loading' | 'ready' | 'unsupported' | 'denied'>('loading');
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!window.isSecureContext || !('serviceWorker' in navigator) || !('PushManager' in window)) return setStatus('unsupported');
    if (Notification.permission === 'denied') return setStatus('denied');
    const registration = await navigator.serviceWorker.ready;
    setEnabled(Boolean(await registration.pushManager.getSubscription()));
    setStatus('ready');
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);

  async function toggle(next: boolean) {
    setError(null);
    setStatus('loading');
    try {
      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      if (!next) {
        const endpoint = existing?.endpoint;
        if (existing) await existing.unsubscribe();
        if (endpoint) await commands.unsubscribe.mutateAsync(endpoint);
        setEnabled(false);
      } else {
        if (await Notification.requestPermission() !== 'granted') return setStatus('denied');
        if (!config.data?.publicKey) throw new Error(t('notifications.pushUnavailable'));
        const subscription = existing ?? await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toBytes(config.data.publicKey) });
        await commands.subscribe.mutateAsync({ endpoint: subscription.endpoint, p256dh: toBase64Url(subscription.getKey('p256dh')), auth: toBase64Url(subscription.getKey('auth')) });
        setEnabled(true);
      }
      setStatus('ready');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t('notifications.pushError'));
      setStatus('ready');
    }
  }

  let text = t('notifications.pushBody');
  if (config.data?.enabled === false) text = t('notifications.pushUnavailable');
  else if (status === 'loading') text = t('notifications.loading');
  else if (status === 'unsupported') text = t('notifications.pushUnsupported');
  else if (status === 'denied') text = t('notifications.pushDenied');
  if (error) text = error;

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{t('notifications.pushTitle')}</p>
      <div className="flex min-h-10 items-center justify-between gap-3 rounded-md border border-input bg-background px-3 py-2">
        <p aria-live="polite" className={status === 'denied' || error ? 'text-sm text-destructive' : 'text-sm'}>{text}</p>
        <Switch aria-label={t('notifications.pushTitle')} checked={enabled} disabled={status !== 'ready' || config.isPending || config.data?.enabled === false} onCheckedChange={(next) => void toggle(next)} />
      </div>
    </div>
  );
}
