'use client'

import React, { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from 'najm-i18n/react';
import { useDialog } from '@/shared/useDialog';
import { recordFamilyPaymentApi } from '@/services/paymentApi';
import FamilyPayment from '../components/FamilyPayment';
import { PaymentRecordedPrompt } from '../components/ReceiptPrint/PaymentRecordedPrompt';
import { usePaymentStore } from '../store/paymentStore';
import { openPaymentDialog } from '../utils/openPaymentDialog';
import type { FamilyChild } from '../utils/familyPayment';

// Everything a payment changes: the lists, each child's balances and
// installments, credit, and the parent's own finance card.
const CHANGED = ['payments', 'fees', 'installments', 'student-credits', 'parents'];

/** Opens the family payment for a parent and the children they pay for. */
export function useFamilyPayment() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { openDialog } = useDialog();
  const resetPayment = usePaymentStore((state) => state.reset);

  const recordFamilyPayment = useCallback(async (data: any) => {
    try {
      const response = await recordFamilyPaymentApi(data);
      await Promise.all(CHANGED.map((key) => queryClient.invalidateQueries({ queryKey: [key] })));
      toast.success(response?.message || t('fees.success.paymentRecorded'));
      return response;
    } catch (error: any) {
      // The dialog stays open with the same retry key; the cashier sees why.
      toast.error(error?.message || t('payments.errors.recordFailed'));
      throw error;
    }
  }, [queryClient, t]);

  const openFamilyPayment = useCallback(async (parent: { id: string; name: string }, familyChildren: FamilyChild[]) => {
    resetPayment();
    try {
      const receipt = await openPaymentDialog(openDialog, {
        // Names the dialog for screen readers; the header shows the same words.
        title: t('payments.family.title'),
        children: <FamilyPayment parent={parent} familyChildren={familyChildren} />,
        showButtons: false,
        width: 'full',
        height: 'full',
        className: 'p-0 bg-transparent border-none shadow-none [&>[data-slot=dialog-header]]:sr-only',
      }, recordFamilyPayment);

      if (receipt?.id) {
        openDialog({
          title: t('payments.dialogs.recordedTitle'),
          children: <PaymentRecordedPrompt familyReceipt={receipt} />,
          showButtons: false,
        });
      }
    } finally {
      resetPayment();
    }
  }, [openDialog, recordFamilyPayment, resetPayment, t]);

  return { openFamilyPayment };
}
