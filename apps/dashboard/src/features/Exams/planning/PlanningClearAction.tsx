'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { NButton, NConfirmDialog } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { toast } from 'sonner';

export function PlanningClearAction({ schoolYear, disabled, saving, onClear }: {
  schoolYear: string; disabled: boolean; saving: boolean; onClear: () => Promise<unknown>;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const clear = async () => {
    if (disabled || saving) return;
    setFailed(false);
    try {
      await onClear();
      setOpen(false);
      toast.success(t('examPlanning.clear.cleared'));
    } catch { setFailed(true); }
  };

  return <>
    <NButton variant="outline" className="text-destructive" disabled={disabled || saving || !schoolYear} onClick={() => { setFailed(false); setOpen(true); }}><Trash2 aria-hidden="true" />{t('examPlanning.clear.label')}</NButton>
    <NConfirmDialog open={open} onOpenChange={setOpen} title={t('examPlanning.clear.title')} description={t('examPlanning.clear.description', { year: schoolYear })} confirmLabel={t('examPlanning.clear.label')} cancelLabel={t('common.cancel')} variant="destructive" loading={saving} onConfirm={clear}>
      {failed && <p role="alert" className="text-sm text-destructive">{t('examPlanning.clear.failed')}</p>}
    </NConfirmDialog>
  </>;
}
