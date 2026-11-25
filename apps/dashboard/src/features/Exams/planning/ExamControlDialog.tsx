'use client';

import { useState } from 'react';
import { Check, Trash2 } from 'lucide-react';
import { cn, DateRangeInput, NButton, NDialog } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { toast } from 'sonner';
import { compareClassNames, toOfficialClassName, type ExamControl, type ExamControlInput, type ExamPlanningClass } from '@sms/contracts';
import type { ExamControlChange } from './useExamControls';
import { planningClassGroups } from './examPlanningModel';

/**
 * Opening or changing a Contrôle, the school's: its week and the classes that
 * sit it, a cycle at a time. Its exams are then added subject by subject in
 * the calendar. A collège subject's fards are its exams in these Contrôles,
 * numbered in date order (`classControlNumber`). A Contrôle saved earlier for a
 * few subjects keeps them. The classes offered are the planner's own among
 * those Planning shows; the server checks the same (ExamPlanningValidator).
 */
export function ExamControlDialog({ open, control, classes, saving, canDelete, onChange, onSaved, onClose }: {
  open: boolean;
  /** The Contrôle changed, or null to open a new one. */
  control: ExamControl | null;
  classes: readonly ExamPlanningClass[];
  saving: boolean;
  canDelete: boolean;
  onChange: (change: ExamControlChange) => Promise<unknown>;
  /** The year's Contrôles after the save, and what was saved: the page selects it. */
  onSaved: (input: ExamControlInput | null, controls: unknown) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  return <NDialog open={open} onOpenChange={next => { if (!next && !saving) onClose(); }} size="md" showButtons={false}
    title={t(control ? 'examPlanning.controls.edit' : 'examPlanning.controls.add')}>
    {open && <ControlForm key={control?.id ?? 'new'} control={control} classes={classes} saving={saving} canDelete={canDelete} onChange={onChange} onSaved={onSaved} onClose={onClose} />}
  </NDialog>;
}

function ControlForm({ control, classes, saving, canDelete, onChange, onSaved, onClose }: Omit<Parameters<typeof ExamControlDialog>[0], 'open'>) {
  const { t, language } = useTranslation();
  const [week, setWeek] = useState({ from: control?.dateFrom ?? '', to: control?.dateTo ?? '' });
  const [classIds, setClassIds] = useState<string[]>(control?.classIds ?? []);
  const [confirming, setConfirming] = useState(false);
  const sorted = [...classes].sort((a, b) => compareClassNames(a.name, b.name));
  // Only the classes Planning shows sit Contrôles: one hidden there (the maternelle's, say) is not offered.
  const groups = planningClassGroups(sorted.filter(cls => cls.visible), language);
  const className = (id: string) => toOfficialClassName(sorted.find(cls => cls.id === id)?.name ?? '');
  const valid = !!week.from && !!week.to && week.from <= week.to && classIds.length > 0;
  const failed = (failure: unknown) => toast.error(failure instanceof Error && failure.message ? failure.message : t('examPlanning.controls.saveFailed'));

  const submit = async () => {
    const input: ExamControlInput = { dateFrom: week.from, dateTo: week.to, classIds, subjectIds: control?.subjectIds ?? [] };
    try {
      const saved = await onChange(control ? { id: control.id, update: input } : { create: input });
      toast.success(t('examPlanning.controls.saved'));
      onSaved(input, saved);
      onClose();
    } catch (failure) { failed(failure); }
  };
  const remove = async () => {
    if (!control) return;
    try {
      const saved = await onChange({ id: control.id, remove: true });
      toast.success(t('examPlanning.controls.deleted'));
      onSaved(null, saved);
      onClose();
    } catch (failure) { failed(failure); }
  };

  return <form className="flex flex-col gap-4" onSubmit={event => { event.preventDefault(); if (valid) void submit(); }}>
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{t('examPlanning.controls.week')}</span>
      <DateRangeInput ariaLabel={t('examPlanning.controls.week')} className="w-full" value={week}
        onChange={({ from, to }) => setWeek({ from: from ?? '', to: to ?? '' })} />
    </div>
    {groups.map(group => {
      const ticked = group.classIds.filter(id => classIds.includes(id)).length;
      const all = ticked === group.classIds.length;
      return (
        <div key={group.id ?? 'none'} role="group" aria-label={group.label ?? t('examPlanning.controls.noCycle')} className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium">
              {group.label ?? t('examPlanning.controls.noCycle')}
              <span className="ms-2 text-xs font-normal tabular-nums text-muted-foreground">{ticked}/{group.classIds.length}</span>
            </span>
            <NButton type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs"
              onClick={() => setClassIds(ids => all ? ids.filter(id => !group.classIds.includes(id)) : [...new Set([...ids, ...group.classIds])])}>
              {all ? t('examPlanning.controls.untickAll') : t('examPlanning.controls.tickAll')}
            </NButton>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {group.classIds.map(id => {
              const on = classIds.includes(id);
              return (
                <button key={id} type="button" aria-pressed={on}
                  onClick={() => setClassIds(ids => on ? ids.filter(other => other !== id) : [...ids, id])}
                  className={cn('inline-flex h-8 items-center gap-1 rounded-md border px-2.5 text-xs font-medium transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    on ? 'border-primary bg-primary text-primary-foreground' : 'bg-background hover:bg-muted')}>
                  {on && <Check className="size-3" aria-hidden />}
                  {className(id)}
                </button>
              );
            })}
          </div>
        </div>
      );
    })}
    {/* Removing asks once more: its exams stay, but lose their Contrôle. */}
    {confirming && <p className="rounded-md border border-destructive/40 bg-destructive/5 p-2 text-xs text-destructive" role="alert">{t('examPlanning.controls.deleteWarning')}</p>}
    <div className="flex items-center gap-2 border-t pt-3">
      {control && canDelete && <NButton type="button" variant={confirming ? 'destructive' : 'ghost'} disabled={saving}
        leftIcon={<Trash2 className={cn('size-4', !confirming && 'text-destructive')} />} onClick={() => { if (confirming) void remove(); else setConfirming(true); }}>
        {t('common.delete')}
      </NButton>}
      <span className="flex-1" />
      <NButton type="button" variant="outline" disabled={saving} onClick={onClose}>{t('common.cancel')}</NButton>
      <NButton type="submit" loading={saving} disabled={saving || !valid}>{t('common.save')}</NButton>
    </div>
  </form>;
}
