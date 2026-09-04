import { useDialog } from 'najm-kit';
import type { DeleteDialogOptions } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';

/**
 * Wraps najm-kit's confirmDelete and injects translated defaults for the
 * dialog chrome (title, warning text, cancel button) from the shared
 * `common.*` locale keys. Callers only need to pass `itemName`, `confirmText`
 * and `onConfirm`; any field can still be overridden per call.
 */
export const useConfirmDelete = () => {
  const { confirmDelete, ...rest } = useDialog();
  const { t } = useTranslation();

  const confirmDeleteI18n = (options: DeleteDialogOptions) =>
    confirmDelete({
      title: t('common.delete'),
      warningText: t('common.deleteConfirm'),
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
      ...options,
    });

  return { ...rest, confirmDelete: confirmDeleteI18n };
};
