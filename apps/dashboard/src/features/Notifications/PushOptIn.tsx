'use client';

import { useCallback, useEffect, useId, useState } from 'react';
import { BaseInput, Label, Switch } from 'najm-kit';
import { Bell } from 'lucide-react';
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
  const explanationId = useId();
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
  const showHelp = Boolean(error) || status !== 'ready' || config.data?.enabled === false;
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
        <Switch id="push-notifications" aria-label={t('notifications.pushTitle')} aria-describedby={explanation ? explanationId : undefined} checked={enabled} disabled={status !== 'ready' || config.isPending || config.data?.enabled === false} onCheckedChange={(next) => void toggle(next)} />
      </div>
    </BaseInput>
  );
}
