'use client';

import { usePublicSettings } from '@/features/Settings/hooks/useSettings';
import { schoolApp } from '@/najm.config';
import { DEFAULT_RECEIPT_LANGUAGE } from '@sms/contracts';
import { printReceipt, type ReceiptData } from './printReceipt';
import { familyReceiptData, toReceiptItems } from './receiptData';
import { useState } from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'najm-i18n/react';
import { useNThemeBrandingSlot } from 'najm-theme/react';
import { getFamilyReceiptApi, getPaymentByIdApi } from '@/services/paymentApi';

/** All receipt entry points share the school's current identity. */
export function usePrintReceipt() {
  const [isPrinting, setIsPrinting] = useState(false);
  const { t } = useTranslation();
  const { publicSettings, isSettingsLoading } = usePublicSettings();
  const schoolLogo = useNThemeBrandingSlot('authLogo');
  const settings = Array.isArray(publicSettings) ? publicSettings[0] : publicSettings;
  const school = () => ({
    language: settings?.receiptLanguage ?? DEFAULT_RECEIPT_LANGUAGE,
    schoolName: settings?.schoolName || schoolApp.appName,
    schoolLogo: settings?.schoolLogo || schoolLogo || undefined,
    schoolAddress: settings?.schoolAddress || undefined,
    schoolPhone: settings?.schoolPhone || undefined,
  });

  const run = async (receipt: ReceiptData, load: () => Promise<ReceiptData>) => {
    setIsPrinting(true);
    try {
      await printReceipt(receipt, load);
    } catch {
      toast.error(t('payments.errors.receiptGenerationFailed'));
    } finally {
      setIsPrinting(false);
    }
  };

  return {
    isReceiptLoading: isSettingsLoading || isPrinting,
    printReceipt: async (data: ReceiptData & { paymentId: string }) => {
      const receipt: ReceiptData = { ...data, ...school() };
      await run(receipt, async () => {
        const { data: payment } = await getPaymentByIdApi(data.paymentId);
        if (payment.status !== 'completed' || !Array.isArray(payment.receiptItems)) {
          throw new Error('Receipt details unavailable');
        }
        return {
          ...receipt,
          receiptNumber: payment.receiptNumber ?? payment.id,
          paymentDate: payment.paymentDate,
          studentName: payment.student?.name ?? data.studentName,
          studentCode: payment.student?.studentCode ?? data.studentCode,
          amount: Number(payment.amount),
          paymentMethod: payment.paymentMethod,
          transactionRef: payment.transactionRef ?? undefined,
          checkNumber: payment.checkNumber ?? undefined,
          notes: payment.notes ?? undefined,
          items: toReceiptItems(payment.receiptItems),
        };
      });
    },
    /** The one receipt a parent was handed for several children. */
    printFamilyReceipt: async ({ familyReceiptId, currency }: { familyReceiptId: string; currency: string }) => {
      const base = { ...school(), currency };
      const placeholder: ReceiptData = {
        ...base, receiptNumber: '', paymentDate: '', studentName: '', studentCode: '', amount: 0, paymentMethod: '',
      };
      await run(placeholder, async () => {
        const { data: receipt } = await getFamilyReceiptApi(familyReceiptId);
        return familyReceiptData(receipt, base);
      });
    },
  };
}
