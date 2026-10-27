'use client';

import { useState } from 'react';
import { NDeleteDialog, type NDeleteDialogProps } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import type { DeleteSelectionProgress } from '@/shared/deleteSelection';

type BulkDeleteDialogProps = Omit<NDeleteDialogProps, 'onConfirm'> & {
  total: number;
  onConfirm: (onProgress: (progress: DeleteSelectionProgress) => void) => Promise<void>;
};

/** Reuse Najm's confirmation surface while the deletion loop reports progress. */
export function BulkDeleteDialog({ total, onConfirm, loading, warningText, confirmText, onOpenChange, ...props }: BulkDeleteDialogProps) {
  const { t } = useTranslation();
  const [progress, setProgress] = useState<DeleteSelectionProgress | null>(null);
  const busy = loading || progress !== null;
  const percent = progress?.total ? Math.floor(progress.processed / progress.total * 100) : 0;

  return (
    <NDeleteDialog
      {...props}
      loading={busy}
      warningText={progress ? t('common.deleteProgress', { ...progress, percent }) : warningText}
      confirmText={progress ? t('common.deletingPercent', { percent }) : confirmText}
      onOpenChange={open => { if (!busy) onOpenChange?.(open); }}
      onConfirm={async () => {
        if (busy) return;
        setProgress({ total, processed: 0, deleted: 0, failed: 0 });
        try {
          await onConfirm(setProgress);
        } finally {
          setProgress(null);
        }
      }}
    />
  );
}
