'use client';

import { usePublicSettings } from '@/features/Settings/hooks/useSettings';
import { schoolApp } from '@/najm.config';
import { DEFAULT_RECEIPT_LANGUAGE } from '@sms/contracts';
import { printReceipt, type ReceiptData } from './printReceipt';
import { useState } from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'najm-i18n/react';
import { getPaymentByIdApi } from '@/services/paymentApi';

/** All receipt entry points share the school's current identity. */
export function usePrintReceipt() {
  const [isPrinting, setIsPrinting] = useState(false);
  const { t } = useTranslation();
  const { publicSettings, isSettingsLoading } = usePublicSettings();
  const settings = Array.isArray(publicSettings) ? publicSettings[0] : publicSettings;

  return {
    isReceiptLoading: isSettingsLoading || isPrinting,
    printReceipt: async (data: ReceiptData & { paymentId: string }) => {
      const receipt: ReceiptData = {
        ...data,
        language: settings?.receiptLanguage ?? DEFAULT_RECEIPT_LANGUAGE,
        schoolName: settings?.schoolName || schoolApp.appName,
        schoolLogo: '/images/branding/school-logo-monochrome.png',
        schoolAddress: settings?.schoolAddress || undefined,
        schoolPhone: settings?.schoolPhone || undefined,
      };
      setIsPrinting(true);
      try {
        await printReceipt(receipt, async () => {
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
            items: payment.receiptItems.map((item) => ({
              feeType: item.feeType,
              academicYear: item.academicYear,
              schedule: item.schedule,
              dueDates: item.dueDates,
              amount: Number(item.amount),
              remainingAmount: Number(item.remainingAmount),
            })),
          };
        });
      } catch {
        toast.error(t('payments.errors.receiptGenerationFailed'));
      } finally {
        setIsPrinting(false);
      }
    },
  };
}
