'use client';

/**
 * najm-kit's dialog store fills any button a caller leaves out with English
 * ("Confirm", "Cancel", "Processing..."), and najm-kit offers no setting to
 * change those defaults. Most of School's dialogs pass only a primary button,
 * so every one of them showed an English "Cancel" in French, Arabic and
 * Spanish. This hook is najm-kit's `useDialog` with the omitted labels taken
 * from the shared catalog; whatever a caller passes still wins. It also marks a
 * refused `pop` as handled, see below.
 */

import { useMemo } from 'react';
// eslint-disable-next-line no-restricted-imports -- the one place that wraps it
import { useDialog as useKitDialog, type DialogApi, type PushDialogOptions, type DeleteDialogOptions } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';

export function useDialog(): DialogApi {
  const dialog = useKitDialog();
  const { t } = useTranslation();

  return useMemo(() => {
    const withLabels = (options: PushDialogOptions): PushDialogOptions => ({
      ...options,
      primaryButton: { text: t('common.confirm'), loadingText: t('common.processing'), ...options.primaryButton },
      secondaryButton: { text: t('common.cancel'), loadingText: t('common.processing'), ...options.secondaryButton },
    });
    const open = (options: PushDialogOptions) => dialog.openDialog(withLabels(options));

    return {
      ...dialog,
      custom: open,
      openDialog: open,
      // A form's submit pops its result into the dialog's primary handler. A
      // refused save rejects that pop and keeps the dialog open; most forms do
      // not await it, so the rejection surfaced as an uncaught page error. Mark
      // it handled here: a caller that awaits pop still receives it.
      pop: (result?: unknown) => {
        const popped = dialog.pop(result);
        popped.catch(() => undefined);
        return popped;
      },
      push: (options: PushDialogOptions) => dialog.push(withLabels(options)),
      confirmDelete: (options: DeleteDialogOptions) => dialog.confirmDelete({
        title: t('common.delete'),
        confirmText: t('common.delete'),
        cancelText: t('common.cancel'),
        ...options,
      }),
    };
  }, [dialog, t]);
}
