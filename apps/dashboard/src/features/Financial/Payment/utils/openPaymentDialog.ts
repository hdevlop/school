import type { DialogApi, PushDialogOptions } from 'najm-kit';

/** Keep the payment form mounted until its mutation succeeds or the user cancels. */
export async function openPaymentDialog(
  openDialog: DialogApi['openDialog'],
  options: PushDialogOptions,
  recordPayment: (data: any) => Promise<{ data?: any }>,
) {
  let recordedPayment: any = null;
  await openDialog({
    ...options,
    primaryButton: {
      ...options.primaryButton,
      onClick: async (data) => {
        recordedPayment = (await recordPayment(data))?.data ?? null;
      },
    },
  });
  return recordedPayment;
}
