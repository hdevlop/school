'use client'

import { NButton } from 'najm-kit';
import { useDialog } from '@/shared/useDialog';
import { useTranslation } from 'najm-i18n/react';
import { CheckCircle2, Printer } from 'lucide-react';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';
import { usePrintReceipt } from './usePrintReceipt';

interface PaymentRecordedPromptProps {
  /** The payment row the record endpoint returned (no student or processor join). */
  payment: any;
  /** Fallback name and code if the full payment cannot be read. */
  student?: { name?: string; studentCode?: string };
}

// Shown once a payment is saved, so the cashier can hand over the receipt
// without looking the payment up again. A check is only receipted once it
// completes, as in the payments table and the Documents tab.
export const PaymentRecordedPrompt = ({ payment, student }: PaymentRecordedPromptProps) => {
  const { t } = useTranslation();
  const { pop } = useDialog();
  const { currency, majorMoney } = useSchoolFormat();
  const { printReceipt, isReceiptLoading } = usePrintReceipt();
  const receiptNumber = payment.receiptNumber ?? payment.id;
  const canPrint = payment.status === 'completed';

  const handlePrint = () => {
    printReceipt({
      paymentId: payment.id,
      receiptNumber,
      paymentDate: payment.paymentDate,
      studentName: student?.name ?? '',
      studentCode: student?.studentCode ?? '',
      amount: Number(payment.amount),
      currency,
      paymentMethod: payment.paymentMethod,
      transactionRef: payment.transactionRef ?? undefined,
      checkNumber: payment.checkNumber ?? undefined,
      notes: payment.notes ?? undefined,
    });
  };

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <CheckCircle2 className="h-12 w-12 text-green-600" />
      <div className="space-y-1">
        <p className="font-semibold text-foreground">
          {t('payments.dialogs.receiptNumber', { receiptNumber })}
        </p>
        <p className="text-sm text-muted-foreground">{majorMoney(payment.amount)}</p>
        {!canPrint && (
          <p className="text-sm text-muted-foreground">{t('payments.dialogs.receiptAfterCheck')}</p>
        )}
      </div>
      <div className="flex w-full justify-end gap-2">
        <NButton variant="outline" onClick={() => pop()}>
          {t('common.close')}
        </NButton>
        {canPrint && (
          <NButton onClick={handlePrint} loading={isReceiptLoading} disabled={isReceiptLoading} className="gap-2" leftIcon={<Printer className="h-4 w-4" />}>
            {t('payments.dialogs.printReceipt')}
          </NButton>
        )}
      </div>
    </div>
  );
};
