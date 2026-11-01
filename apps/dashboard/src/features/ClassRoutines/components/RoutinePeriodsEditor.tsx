'use client';

import { useEffect, useMemo, useState } from 'react';
import { Clock3 } from 'lucide-react';
import { NButton, NSheet, SelectInput } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { useRoutine, useRoutineList } from '../hooks/useClassRoutines';
import { selectClassRoutineSchedules } from '../utils/selectRoutineSchedules';
import type { TimelineItem } from '../types';
import ClassRoutineSkeleton from './ClassRoutineSkeleton';
import RoutineScheduleForm from './RoutineScheduleForm';

export default function RoutinePeriodsEditor({ classes, initialClassIds, initialSourceId, academicYear, saving, onSave, onClose }: {
  classes: readonly { id: string; name: string }[];
  initialClassIds: string[];
  initialSourceId?: string;
  academicYear?: string;
  saving: boolean;
  onSave: (data: { scheduleIds: string[]; periods: TimelineItem[] }) => Promise<void>;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [classIds, setClassIds] = useState(initialClassIds);
  const [sourceId, setSourceId] = useState(initialSourceId ?? '');
  const { data: schedules = [], isPending, isFetching, isError, refetch } = useRoutineList({ academicYear });
  const currentSchedules = useMemo(() => selectClassRoutineSchedules(classes.map((item) => item.id), schedules), [classes, schedules]);
  const targets = selectClassRoutineSchedules(classIds, currentSchedules);
  const availableClassIds = new Set(currentSchedules.map((schedule) => schedule.classId));
  useEffect(() => {
    setSourceId((current) => currentSchedules.some((schedule) => schedule.id === current) ? current
      : (currentSchedules.find((schedule) => classIds.includes(schedule.classId)) ?? currentSchedules[0])?.id ?? '');
  }, [currentSchedules, classIds]);
  const { data: source, isPending: sourcePending, isFetching: sourceFetching, isError: sourceError, refetch: refetchSource } = useRoutine(sourceId, academicYear);
  const loading = isPending || (Boolean(sourceId) && sourcePending);
  const canSave = targets.length > 0 && Boolean(source) && !isFetching && !sourceFetching && !isError && !sourceError;

  return (
    <NSheet
      open
      onOpenChange={(open) => { if (!open && !saving) onClose(); }}
      icon={Clock3}
      title={t('classRoutines.ui.dialogs.periodsTitle')}
      description={t('classRoutines.ui.bulkPeriods.description')}
      width={1040}
      classNames={{ content: 'max-w-full bg-background', body: 'p-4' }}
      footer={
        <div className="flex w-full flex-wrap items-center justify-end gap-2">
          <NButton variant="outline" disabled={saving} onClick={onClose}>{t('common.cancel')}</NButton>
          <NButton type="submit" form="routine-schedule-form" loading={saving} disabled={saving || !canSave}>{t('classRoutines.ui.actions.savePeriods')}</NButton>
        </div>
      }
    >
      <div className="space-y-5">
        <fieldset disabled={saving || isPending || isError} className="min-w-0 space-y-3 rounded-xl border p-3">
          <legend className="px-1 text-sm font-semibold">{t('classRoutines.ui.bulkPeriods.targetClasses')}</legend>
          <p className="text-sm text-muted-foreground">{t('classRoutines.ui.bulkPeriods.allSections')}</p>
          <div className="flex flex-wrap gap-2">
            <NButton type="button" size="sm" variant="outline" onClick={() => setClassIds(classes.filter((item) => availableClassIds.has(item.id)).map((item) => item.id))}>{t('classRoutines.ui.allClasses')}</NButton>
            <NButton type="button" size="sm" variant="ghost" onClick={() => setClassIds([])}>{t('classRoutines.ui.classSelection.clear')}</NButton>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {classes.map((item) => {
              const count = currentSchedules.filter((schedule) => schedule.classId === item.id).length;
              return (
                <label key={item.id} className={`flex min-w-0 items-center gap-2 rounded-lg border p-2.5 ${count ? 'cursor-pointer hover:bg-muted/50' : 'opacity-50'}`}>
                  <input type="checkbox" aria-label={item.name} className="size-4 shrink-0 accent-primary" disabled={!count} checked={Boolean(count && classIds.includes(item.id))} onChange={(event) => setClassIds((current) => event.target.checked ? [...current, item.id] : current.filter((id) => id !== item.id))} />
                  <span className="min-w-0 text-sm"><span className="block font-medium">{item.name}</span><span className="block text-xs text-muted-foreground">{t('classRoutines.ui.bulkPeriods.sectionCount', { count })}</span></span>
                </label>
              );
            })}
          </div>
          <p role="status" className="text-sm font-medium">{t('classRoutines.ui.bulkPeriods.targetCount', { count: targets.length })}</p>
        </fieldset>

        {isError || sourceError ? (
          <div role="alert" className="rounded-xl border p-4">
            <p>{t('classRoutines.ui.messages.loadError')}</p>
            <NButton variant="outline" size="sm" className="mt-2" onClick={() => isError ? refetch() : refetchSource()}>{t('classRoutines.ui.actions.retry')}</NButton>
          </div>
        ) : loading ? <ClassRoutineSkeleton /> : currentSchedules.length ? (
          <>
            <div className="space-y-2">
              <p className="text-sm font-medium">{t('classRoutines.ui.bulkPeriods.source')}</p>
              <SelectInput
                ariaLabel={t('classRoutines.ui.bulkPeriods.source')}
                value={sourceId}
                onChange={setSourceId}
                items={currentSchedules.map((schedule) => ({ value: schedule.id, label: `${schedule.className} · ${schedule.sectionName}` }))}
                disabled={saving}
                showIcon={false}
              />
            </div>
            {source ? <RoutineScheduleForm
              key={source.id}
              periods={source.periods}
              disabled={saving}
              onSubmit={async ({ periods }) => {
                if (!canSave || saving) return;
                try { await onSave({ scheduleIds: targets.map((schedule) => schedule.id), periods }); }
                catch { return; }
              }}
            /> : null}
          </>
        ) : <p className="text-sm text-muted-foreground">{t('classRoutines.ui.bulkPeriods.noRoutines')}</p>}
      </div>
    </NSheet>
  );
}
