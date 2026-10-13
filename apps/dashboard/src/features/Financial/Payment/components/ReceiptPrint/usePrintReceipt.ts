'use client';

import { useNThemeBrandingSlot } from 'najm-theme/react';
import { usePublicSettings } from '@/features/Settings/hooks/useSettings';
import { schoolApp } from '@/najm.config';
import { printReceipt, type ReceiptData } from './printReceipt';

/** All receipt entry points share the school's current identity. */
export function usePrintReceipt() {
  const { publicSettings, isSettingsLoading } = usePublicSettings();
  const settings = Array.isArray(publicSettings) ? publicSettings[0] : publicSettings;
  const brandingLogo = useNThemeBrandingSlot('authLogo');

  return {
    isReceiptLoading: isSettingsLoading,
    printReceipt: (data: ReceiptData) => printReceipt({
      ...data,
      schoolName: settings?.schoolName || schoolApp.appName,
      schoolLogo: settings?.schoolLogo || brandingLogo || undefined,
      schoolAddress: settings?.schoolAddress || undefined,
      schoolPhone: settings?.schoolPhone || undefined,
    }),
  };
}
