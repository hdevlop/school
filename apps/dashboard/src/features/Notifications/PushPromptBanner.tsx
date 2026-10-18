'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Bell } from 'lucide-react';
import { NButton } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { useNotificationCommands, usePushConfig } from './useNotifications';
import { detectIOS, enablePushOnThisDevice, isPushSupported, pushPromptKind, PUSH_PROMPT_DISMISSED_KEY, readDismissedAt } from './pushSubscription';

const bannerClassName =
  'mx-2 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground';

/** Preferences has its own switch; asking twice on one screen would only confuse. */
const PREFERENCES_PATH = '/preferences';

function localStore() {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
}

/**
 * Offers push to a person who has not answered the browser yet, so they do not
 * have to find the switch in Preferences. On an iPhone or iPad outside the
 * Home Screen app, where push is unavailable, it explains how to install.
 * "Not now" is remembered on this device only.
 */
export function PushPromptBanner() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const config = usePushConfig();
  const commands = useNotificationCommands();
  const [kind, setKind] = useState<'enable' | 'install' | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const publicKey = config.data?.enabled ? config.data.publicKey : null;

  const evaluate = useCallback(() => {
    setKind(pushPromptKind({
      serverEnabled: Boolean(publicKey),
      supported: isPushSupported(),
      permission: 'Notification' in window ? Notification.permission : null,
      isIOS: detectIOS(navigator),
      standalone: isStandalone(),
      dismissedAt: readDismissedAt(localStore()),
      now: Date.now(),
    }));
  }, [publicKey]);

  useEffect(() => {
    evaluate();
    // The Preferences switch or the browser's own settings may answer the
    // permission elsewhere; follow it so the banner does not linger.
    let permission: PermissionStatus | undefined;
    let cancelled = false;
    navigator.permissions?.query({ name: 'notifications' }).then((status) => {
      if (cancelled) return;
      permission = status;
      status.addEventListener('change', evaluate);
    }).catch(() => {});
    return () => {
      cancelled = true;
      permission?.removeEventListener('change', evaluate);
    };
  }, [evaluate]);

  function dismiss() {
    try {
      localStore()?.setItem(PUSH_PROMPT_DISMISSED_KEY, String(Date.now()));
    } catch {
      // Blocked storage: the banner still closes for this visit.
    }
    setKind(null);
  }

  async function enable() {
    if (!publicKey) return;
    setBusy(true);
    setError(null);
    try {
      await enablePushOnThisDevice(publicKey, commands.subscribe.mutateAsync, t('notifications.pushError'));
      evaluate();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t('notifications.pushError'));
    } finally {
      setBusy(false);
    }
  }

  if (!kind || pathname === PREFERENCES_PATH) return null;

  return (
    <div role="status" className={bannerClassName}>
      <Bell className="h-4 w-4 shrink-0" aria-hidden />
      <span className="min-w-0 flex-1">
        {kind === 'install' ? t('notifications.pushInstallHint') : error ?? t('notifications.pushPromptBody')}
      </span>
      <div className="ms-auto flex shrink-0 items-center gap-2">
        <NButton size="sm" variant="ghost" onClick={dismiss} disabled={busy}>{t('notifications.pushPromptLater')}</NButton>
        {kind === 'enable' && (
          <NButton size="sm" onClick={() => void enable()} disabled={busy}>{t('notifications.pushPromptEnable')}</NButton>
        )}
      </div>
    </div>
  );
}
