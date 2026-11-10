'use client';

import { NConfirmDialog } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';

/** Acknowledge the missing safety copy before replacing or deleting data. */
export function BackupWarningDialog({ open, onOpenChange, onConfirm }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  const { t } = useTranslation();

  return (
    <NConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('settings.backup.withoutBackup.title')}
      description={t('settings.backup.withoutBackup.description')}
      confirmLabel={t('settings.backup.withoutBackup.continue')}
      cancelLabel={t('common.cancel')}
      variant="destructive"
      onConfirm={onConfirm}
    />
  );
}
