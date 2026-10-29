'use client';

import { NButton, NSheet } from 'najm-kit';
import { Settings } from 'lucide-react';
import { useTranslation } from 'najm-i18n/react';
import type { ExamPlanningClass } from '@sms/contracts';
import { classDocumentColors } from '@/features/Assessments/planning/planningModel';

export function PlanningClassSettings({ classes, selection, saving, onChange, onClose, onSave }: {
  classes: ExamPlanningClass[]; selection: string[] | null; saving: boolean;
  onChange: (ids: string[]) => void; onClose: () => void; onSave: () => void;
}) {
  const { t } = useTranslation();
  return <NSheet open={selection !== null} onOpenChange={open => { if (!open && !saving) onClose(); }} icon={Settings} title={t('examPlanning.classSettings')} description={t('examPlanning.chooseClasses')} footer={<div className="flex justify-end gap-2"><NButton variant="outline" disabled={saving} onClick={onClose}>{t('common.cancel')}</NButton><NButton loading={saving} disabled={saving} onClick={onSave}>{t('common.save')}</NButton></div>}>
    <div className="mb-4 flex gap-2"><NButton size="sm" variant="outline" disabled={saving} onClick={() => onChange(classes.map(cls => cls.id))}>{t('assessmentPlanning.allClasses')}</NButton><NButton size="sm" variant="ghost" disabled={saving} onClick={() => onChange([])}>{t('examPlanning.clearSelection')}</NButton></div>
    <div className="space-y-2">{classes.map(cls => <label key={cls.id} className="flex cursor-pointer items-center gap-3 rounded-lg border p-3"><input type="checkbox" className="size-4 accent-primary" disabled={saving} checked={selection?.includes(cls.id) ?? false} onChange={event => onChange(event.target.checked ? [...(selection ?? []), cls.id] : (selection ?? []).filter(id => id !== cls.id))} /><span className="size-2 rounded-full" style={{ background: classDocumentColors(cls.name)[0] }} /><span>{cls.name}</span></label>)}</div>
  </NSheet>;
}
