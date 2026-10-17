'use client';

import { usePublicSettings } from '@/features/Settings/hooks/useSettings';
import { schoolApp } from '@/najm.config';
import { DEFAULT_RECEIPT_LANGUAGE } from '@sms/contracts';
import { printReceipt, type ReceiptData } from './printReceipt';

/** All receipt entry points share the school's current identity. */
export function usePrintReceipt() {
  const { publicSettings, isSettingsLoading } = usePublicSettings();
  const settings = Array.isArray(publicSettings) ? publicSettings[0] : publicSettings;

  return {
    isReceiptLoading: isSettingsLoading,
    printReceipt: (data: ReceiptData) => printReceipt({
      ...data,
      language: settings?.receiptLanguage ?? DEFAULT_RECEIPT_LANGUAGE,
      schoolName: settings?.schoolName || schoolApp.appName,
      schoolLogo: '/images/branding/school-logo-monochrome.png',
      schoolAddress: settings?.schoolAddress || undefined,
      schoolPhone: settings?.schoolPhone || undefined,
    }),
  };
}
