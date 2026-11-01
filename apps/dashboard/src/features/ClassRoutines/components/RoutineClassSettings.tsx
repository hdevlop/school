'use client';

import { Settings } from 'lucide-react';
import { NButton, NSheet } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';

export default function RoutineClassSettings({ classes, selection, onChange, onApply, onClose }: {
  classes: readonly { id: string; name: string }[];
  selection: string[] | null;
  onChange: (ids: string[]) => void;
  onApply: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  return (
    <NSheet
      open={selection !== null}
      onOpenChange={(open) => { if (!open) onClose(); }}
      icon={Settings}
      title={t('classRoutines.ui.classSelection.title')}
      description={t('classRoutines.ui.classSelection.description')}
      width={420}
      footer={
        <div className="flex justify-end gap-2">
          <NButton type="button" variant="outline" onClick={onClose}>{t('common.cancel')}</NButton>
          <NButton type="button" onClick={onApply}>{t('classRoutines.ui.classSelection.apply')}</NButton>
        </div>
      }
    >
      <div className="mb-4 flex flex-wrap gap-2">
        <NButton size="sm" variant="outline" onClick={() => onChange(classes.map((item) => item.id))}>{t('classRoutines.ui.allClasses')}</NButton>
        <NButton size="sm" variant="ghost" onClick={() => onChange([])}>{t('classRoutines.ui.classSelection.clear')}</NButton>
      </div>
      <div className="space-y-2">
        {classes.map((item) => (
          <label key={item.id} className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 hover:bg-muted/50">
            <input
              type="checkbox"
              className="size-4 accent-primary"
              checked={selection?.includes(item.id) ?? false}
              onChange={(event) => onChange(event.target.checked
                ? [...(selection ?? []), item.id]
                : (selection ?? []).filter((id) => id !== item.id))}
            />
            <span className="font-medium">{item.name}</span>
          </label>
        ))}
      </div>
    </NSheet>
  );
}
