import { NButton, NSkeleton } from 'najm-kit';
import React from 'react';
import { usePaymentStore } from '../../store/paymentStore';
import { useDialogStore } from 'najm-kit';

export const PaymentActions = () => {

  const paymentAmount = usePaymentStore((state) => state.paymentDetails.amount);
  const selectedCount = usePaymentStore((state) => state.getSelectedCount());
  const dialogStore = useDialogStore();

  // Get loading state from the current dialog
  const isLoading = dialogStore((state) => {
    const currentDialog = state.dialogs[state.dialogs.length - 1];
    return currentDialog?.primaryButton?.loading || false;
  });

  return (
    <div className="flex justify-end gap-3 w-full">
      <NButton
        type="submit"
        form="payment-details-form"
        disabled={selectedCount === 0 || !paymentAmount || isLoading}
        className='w-full h-10'
      >
        {isLoading ? (
          <span className="flex w-full items-center justify-center gap-2">
            <NSkeleton className="h-4 w-4 rounded-full bg-primary-foreground/40" />
            <NSkeleton className="h-4 w-36 bg-primary-foreground/40" />
          </span>
        ) : (
          'Record Payment'
        )}
      </NButton>
    </div>
  );
};
