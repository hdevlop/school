'use client';

import { useEffect } from 'react';
import { useAuth } from 'najm-auth/client/react';
import { clearRetiredOfflineData } from '@/lib/retiredOfflineData';
import { keepPushWorkerCurrent } from './keepPushWorkerCurrent';

/** Runs for signed-out pages too, so a device stops holding retired data at its next visit. */
export function PushWorker() {
  const signedIn = !!useAuth().user;
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    void clearRetiredOfflineData();
    if ('serviceWorker' in navigator) void keepPushWorkerCurrent(navigator.serviceWorker, signedIn).catch(() => undefined);
  }, [signedIn]);
  return null;
}
