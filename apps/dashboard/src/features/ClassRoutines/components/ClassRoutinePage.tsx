'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, CalendarDays, Clock3, Plus } from 'lucide-react';
import { NativeSelect, NButton, NPageHeader, NPageHeaderActions, NSkeleton, useDialog } from 'najm-kit';
import { useAuth } from 'najm-auth/client/react';
import { useClasses } from '@/hooks/useClasses';
import { useSections } from '@/features/Sections/hooks/useSections';
import { useTranslation } from 'najm-i18n/react';
import PageHeaderGlobalActions from '@/shared/PageHeaderGlobalActions';
import ClassRoutineSkeleton from './ClassRoutineSkeleton';
import RoutineEntryForm from './RoutineEntryForm';
import RoutineDutyForm from './RoutineDutyForm';
import RoutineDaysForm from './RoutineDaysForm';
import RoutineGrid from './RoutineGrid';
import RoutineScheduleForm from './RoutineScheduleForm';
import {
  useRoutine,
  useRoutineAssignments,
  useRoutineList,
  useRoutineMutations,
} from '../hooks/useClassRoutines';
import type { RoutineDay, RoutineDuty, RoutineEntry, RoutinePeriod } from '../types';
import { routinePeriodLabel } from '../utils/labels';

export default function ClassRoutinePage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const role = (user as any)?.role;
  const canEdit = role === 'admin' || role === 'principal';
  const { openDialog } = useDialog();
  const { classes, isClassesLoading } = useClasses();
  const { sections, isSectionsLoading } = useSections();
  const mutations = useRoutineMutations();

  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [scheduleId, setScheduleId] = useState('');

  const classSections = useMemo(
    () => (sections || []).filter((section) => !classId || section.classId === classId),
    [sections, classId],
  );
  const selectedClass = (classes || []).find((item) => item.id === classId);
  const { data: schedules = [], isPending: schedulesPending } = useRoutineList(
    { sectionId, academicYear: selectedClass?.academicYear },
    Boolean(sectionId),
  );
  const schedulesLoading = Boolean(sectionId) && schedulesPending;
  const { data: routine, isPending: routinePending } = useRoutine(scheduleId);
  const routineLoading = Boolean(scheduleId) && routinePending;
  const { data: assignments = [] } = useRoutineAssignments(sectionId);

  useEffect(() => {
    if (!classId && classes?.length) setClassId(classes[0].id);
  }, [classId, classes]);

  useEffect(() => {
    setSectionId((current) => classSections.some((section) => section.id === current)
      ? current
      : (classSections[0]?.id || ''));
  }, [classSections]);

  useEffect(() => {
    const preferred = schedules.find((item) => item.status === 'published')
      || schedules.find((item) => item.status === 'draft')
      || schedules[0];
    setScheduleId((current) => schedules.some((item) => item.id === current) ? current : (preferred?.id || ''));
  }, [schedules]);

  const openDaysForm = () => {
    if (!routine) return;
    openDialog({
      title: t('classRoutines.ui.dialogs.daysTitle'),
      description: t('classRoutines.ui.dialogs.daysDescription'),
      children: <RoutineDaysForm activeDays={routine.activeDays} />,
      primaryButton: {
        form: 'routine-days-form',
        text: t('classRoutines.ui.actions.saveDays'),
        onClick: ({ activeDays }) => mutations.updateSchedule.mutateAsync({ id: routine.id, activeDays }),
      },
      secondaryButton: { text: t('common.cancel') },
    });
  };

  const openPeriodsForm = () => {
    if (!routine) return;
    openDialog({
      title: t('classRoutines.ui.dialogs.periodsTitle'),
      description: t('classRoutines.ui.dialogs.periodsDescription'),
      width: '5xl',
      height: 'full',
      children: <RoutineScheduleForm periods={routine.periods} />,
      primaryButton: {
        form: 'routine-schedule-form',
        text: t('classRoutines.ui.actions.savePeriods'),
        onClick: ({ periods }) => mutations.updateLayout.mutateAsync({ id: routine.id, periods }),
      },
      secondaryButton: { text: t('common.cancel') },
    });
  };

  const createRoutine = async () => {
    if (!sectionId || !selectedClass) return;
    const selectedSection = classSections.find((item) => item.id === sectionId);
    const response: any = await mutations.createSchedule.mutateAsync({
      sectionId,
      academicYear: selectedClass.academicYear,
      name: `${selectedClass.name} · ${selectedSection?.name || t('classRoutines.ui.title')}`,
      activeDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    });
    const created = response?.data;
    if (created?.id) setScheduleId(created.id);
  };

  const openEntry = (day: RoutineDay, period: RoutinePeriod, entry?: RoutineEntry) => {
    if (!routine) return;
    openDialog({
      title: entry ? t('classRoutines.ui.dialogs.editLesson') : t('classRoutines.ui.dialogs.addLesson'),
      children: (
        <RoutineEntryForm
          assignmentOptions={assignments}
          day={day}
          period={period}
          entry={entry}
          defaultRoom={routine.roomNumber}
          onDelete={entry ? async () => {
            await mutations.deleteEntry.mutateAsync({ scheduleId: routine.id, id: entry.id });
          } : undefined}
        />
      ),
      primaryButton: {
        form: 'routine-entry-form',
        text: entry ? t('classRoutines.ui.actions.updateLesson') : t('classRoutines.ui.actions.addLesson'),
        onClick: async (data) => {
          if (!data) return;
          const next = { ...data, dayOfWeek: day, periodId: period.id, scheduleId: routine.id };
          if (entry) await mutations.updateEntry.mutateAsync({ ...next, id: entry.id });
          else await mutations.createEntry.mutateAsync(next);
        },
      },
      secondaryButton: { text: t('common.cancel') },
    });
  };

  const openDuty = (day: RoutineDay, period: RoutinePeriod, duty?: RoutineDuty) => {
    if (!routine) return;
    openDialog({
      title: duty
        ? t('classRoutines.ui.dialogs.editSupervision')
        : t('classRoutines.ui.dialogs.assignSupervisor', { period: routinePeriodLabel(period.name, t) }),
      children: (
        <RoutineDutyForm
          period={period}
          duty={duty}
          onDelete={duty ? async () => {
            await mutations.deleteDuty.mutateAsync({ scheduleId: routine.id, id: duty.id });
          } : undefined}
        />
      ),
      primaryButton: {
        form: 'routine-duty-form',
        text: duty ? t('classRoutines.ui.actions.updateSupervision') : t('classRoutines.ui.actions.assignSupervisor'),
        onClick: async (data) => {
          if (!data) return;
          if (duty) await mutations.updateDuty.mutateAsync({ scheduleId: routine.id, id: duty.id, ...data });
          else await mutations.createDuty.mutateAsync({
            scheduleId: routine.id,
            dayOfWeek: day,
            periodId: period.id,
            ...data,
          });
        },
      },
      secondaryButton: { text: t('common.cancel') },
    });
  };

  const busy = isClassesLoading || isSectionsLoading;

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-3">
      <NPageHeader
        icon={CalendarClock}
        title={t('classRoutines.ui.title')}
        subtitle={t('classRoutines.ui.subtitle')}
      >
        <NPageHeaderActions>
          <PageHeaderGlobalActions />
        </NPageHeaderActions>
      </NPageHeader>

      <div className="flex flex-wrap items-end gap-3">
        {busy ? (
          <>
            <NSkeleton className="h-10 w-44 rounded-md" />
            <NSkeleton className="h-10 w-44 rounded-md" />
          </>
        ) : (
          <>
            <NativeSelect
              aria-label={t('classRoutines.ui.fields.class')}
              placeholder={t('classRoutines.ui.fields.class')}
              value={classId}
              onChange={(event) => setClassId(event.target.value)}
              options={(classes || []).map((item) => ({ value: item.id, label: item.name }))}
              className="min-w-44 font-medium"
            />
            <NativeSelect
              aria-label={t('classRoutines.ui.fields.section')}
              placeholder={t('classRoutines.ui.fields.section')}
              value={sectionId}
              onChange={(event) => setSectionId(event.target.value)}
              options={classSections.map((item) => ({ value: item.id, label: item.name }))}
              disabled={!classId}
              className="min-w-44 font-medium"
            />
          </>
        )}
        <div className="ml-auto flex flex-wrap gap-2">
          {canEdit && routine ? (
            <>
              <NButton variant="outline" onClick={openDaysForm}>
                <CalendarDays className="h-4 w-4" /> {t('classRoutines.ui.actions.days')}
              </NButton>
              <NButton variant="outline" onClick={openPeriodsForm}>
                <Clock3 className="h-4 w-4" /> {t('classRoutines.ui.actions.periods')}
              </NButton>
            </>
          ) : null}
        </div>
      </div>

      {busy || schedulesLoading || routineLoading ? (
        <ClassRoutineSkeleton />
      ) : routine ? (
        <RoutineGrid
          days={routine.activeDays}
          periods={routine.periods}
          entries={routine.entries}
          duties={routine.duties}
          defaultRoom={routine.roomNumber}
          editable={canEdit}
          onCellClick={openEntry}
          onDutyClick={openDuty}
        />
      ) : (
        <div className="grid flex-1 place-items-center rounded-2xl border border-dashed bg-card/50 p-10 text-center">
          <div>
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
              <CalendarClock className="h-7 w-7" />
            </div>
            <h2 className="mt-4 text-lg font-semibold">{t('classRoutines.ui.empty.title')}</h2>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">{t('classRoutines.ui.empty.description')}</p>
            {canEdit && sectionId ? (
              <NButton className="mt-5" onClick={createRoutine} disabled={mutations.createSchedule.isPending}>
                <Plus className="h-4 w-4" /> {t('classRoutines.ui.actions.createRoutine')}
              </NButton>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
